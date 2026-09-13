// Consistency check for the committed dataset — the guard against a hand-committed
// payload that ships inconsistent derived files.
//
// scripts/validate.mjs recomputes every published score and checks CSV parity;
// scripts/stats.mjs regenerates the derived stats (CI then requires a clean
// `git diff`). Neither of those notices a dataset whose *derived* files were left
// behind, which is how the mirror drifted on 2026-09-08: data/panels.json was
// replaced with a 129-panel payload while meta.json, data/stats.json and
// data/panels.csv stayed at 106 rows. This file closes that gap:
//
//   1. meta.json is exactly {updated: data/panels.json generated_at, panels: <count>};
//   2. data/panels.csv carries the generator-of-record header (refresh.yml), the
//      same number of rows as panels.length, and the same slugs in the same order;
//   3. every published panel-count claim in README.md / docs/index.html / meta.json
//      matches the dataset, and the JSON-LD blocks in docs/index.html parse.
//
// Dependency-free by design: node only, no package.json, no npm install.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const errors = [];
const notes = [];
const report = process.argv.includes('--report');

const read = (p) => readFileSync(join(root, p), 'utf8');
const num = (s) => Number(String(s).replace(/,/g, ''));

// ---------- 1. the dataset itself ----------
let data;
try {
	data = JSON.parse(read('data/panels.json'));
} catch (e) {
	console.error(`FAILED: data/panels.json is not valid JSON: ${e.message}`);
	process.exit(1);
}
const panels = data.panels ?? [];
const count = panels.length;

// ---------- 2. meta.json ----------
let meta = null;
try {
	meta = JSON.parse(read('meta.json'));
} catch (e) {
	errors.push(`meta.json is not valid JSON: ${e.message}`);
}
if (meta !== null) {
	const keys = Object.keys(meta).sort().join(',');
	if (keys !== 'panels,updated') {
		errors.push(`meta.json keys are ${keys}; expected exactly panels,updated`);
	}
	if (meta.updated !== data.generated_at) {
		errors.push(`meta.json updated ${JSON.stringify(meta.updated)} != data/panels.json generated_at ${JSON.stringify(data.generated_at)}`);
	}
	if (meta.panels !== count) {
		errors.push(`meta.json panels ${meta.panels} != data/panels.json panels.length ${count}`);
	}
}

// ---------- 3. CSV parity (shape, row count, row identity) ----------
// Header mirrors .github/workflows/refresh.yml (the generator of record).
const CSV_HEADER = ['slug', 'name', 'domain', 'url', 'platforms', 'services', 'response_ms', 'verified', 'boost', 'flags', 'score'];

/** RFC4180-ish parser: quoted fields, "" escapes, \r\n tolerated. */
function parseCsv(text) {
	const rows = [];
	let row = [];
	let field = '';
	let quoted = false;
	for (let i = 0; i < text.length; i++) {
		const c = text[i];
		if (quoted) {
			if (c === '"') {
				if (text[i + 1] === '"') { field += '"'; i++; } else { quoted = false; }
			} else field += c;
		} else if (c === '"') quoted = true;
		else if (c === ',') { row.push(field); field = ''; }
		else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
		else if (c !== '\r') field += c;
	}
	if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
	return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

const csvRows = parseCsv(read('data/panels.csv'));
const header = csvRows[0] ?? [];
if (header.join(',') !== CSV_HEADER.join(',')) {
	errors.push(`data/panels.csv header [${header.join(',')}] != generator-of-record header [${CSV_HEADER.join(',')}] — change refresh.yml + SCHEMA.md + this check together`);
}
if (csvRows.length - 1 !== count) {
	errors.push(`data/panels.csv rows ${csvRows.length - 1} != data/panels.json panels ${count}`);
}
const csvSlugs = csvRows.slice(1).map((r) => r[0]);
const jsonSlugs = panels.map((p) => p.slug);
if (csvRows.length - 1 === count) {
	const mismatched = jsonSlugs.filter((s, i) => s !== csvSlugs[i]);
	if (mismatched.length > 0) {
		errors.push(`data/panels.csv rows are out of order or from another pull (${mismatched.length} of ${count} slugs differ, first: ${mismatched[0]})`);
	}
	const csvSlugSet = new Set(csvSlugs);
	if (new Set(jsonSlugs).size !== csvSlugSet.size) {
		errors.push('data/panels.csv carries a different slug set than data/panels.json');
	}
}

// ---------- 4. published count claims + JSON-LD ----------
const html = read('docs/index.html');
const ldBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
if (ldBlocks.length === 0) errors.push('docs/index.html carries no application/ld+json block');
ldBlocks.forEach((b, i) => {
	try {
		const o = JSON.parse(b);
		if (!o['@type']) errors.push(`docs/index.html JSON-LD block ${i + 1} has no @type`);
	} catch (e) {
		errors.push(`docs/index.html JSON-LD block ${i + 1} does not parse: ${e.message}`);
	}
});

// A panel-count claim, i.e. the number a reader takes as the dataset size. Subset
// phrases ("the 10 panels with the most services") are not claims about the size.
const SUBSET_BEFORE = /(?:top|first|next|last|largest|biggest|fastest|slowest)\s+$/i;
const SUBSET_AFTER = /^\s+with the (?:most|fewest|highest|lowest|largest|smallest)\b/i;

const claimPatterns = [
	{ name: 'count-phrase', re: /(\d[\d,]{0,6})\s*(?:SMM\s+)?panels\b/gi },
	{ name: 'badge', re: /panels-(\d[\d,]{0,6})-/gi },
	{ name: 'json-field', re: /"panels"\s*:\s*(\d[\d,]{0,6})/gi },
];

for (const file of ['README.md', 'docs/index.html', 'meta.json']) {
	const text = read(file);
	for (const { name, re } of claimPatterns) {
		re.lastIndex = 0;
		let m;
		while ((m = re.exec(text))) {
			const value = num(m[1]);
			const before = text.slice(Math.max(0, m.index - 12), m.index);
			const after = text.slice(m.index + m[0].length, m.index + m[0].length + 32);
			const subset = SUBSET_BEFORE.test(before) || SUBSET_AFTER.test(after);
			const ok = value === count;
			if (report) {
				notes.push(`${file} [${name}] ${JSON.stringify(m[0])} -> ${value} ${ok ? 'ok' : 'MISMATCH'}${subset ? ' (subset phrase, ignored)' : ''}`);
			}
			if (!ok && !subset) {
				errors.push(`${file} claims ${JSON.stringify(m[0].trim())} but the dataset has ${count} panels`);
			}
		}
	}
}

// ---------- verdict ----------
if (report) {
	console.log(`dataset: ${count} panels, generated_at ${data.generated_at}`);
	for (const n of notes) console.log('  ', n);
}
if (errors.length > 0) {
	console.error('CONSISTENCY FAILED:');
	for (const e of errors) console.error(' -', e);
	process.exit(1);
}
console.log(`OK: meta.json, data/panels.csv (${count} rows), README/docs/index.html claims and ${ldBlocks.length} JSON-LD blocks all agree with ${count} panels @ ${data.generated_at}`);
