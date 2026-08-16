// Dataset validation + score recomputation check.
// Fails the build/refresh if the dataset is internally inconsistent.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const data = JSON.parse(readFileSync(join(root, 'data/panels.json'), 'utf8'));
const panels = data.panels ?? [];
const errors = [];

// 1. Top-level shape
if (typeof data.generated_at !== 'string') errors.push('generated_at missing');
if (!Array.isArray(panels)) errors.push('panels must be an array');

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// 2. The published formula (methodology page v3)
function formula(p) {
	const longevity = clamp(Math.log(1 + Math.max(p.domain_age_years ?? 0, 0)) / Math.log(11), 0, 1) * 30;
	const scale = (Math.log(1 + (p.services ?? 0)) / Math.log(9001)) * 25;
	const perf = clamp(1 - ((p.response_ms ?? 4000) - 600) / 1400, 0, 1) * 35;
	const breadth = clamp((p.platforms ?? []).length / 8, 0, 1) * 10;
	return Math.round((longevity + scale + perf + breadth + (p.verified ? 25 : 0)) * 10) / 10;
}

const seen = new Set();
let scored = 0;
for (const p of panels) {
	// 3. Required fields
	for (const f of ['slug', 'name', 'domain', 'url', 'platforms']) {
		if (p[f] === undefined) errors.push(`${p.slug ?? '?'}: missing ${f}`);
	}
	// 4. Slug uniqueness
	if (seen.has(p.slug)) errors.push(`duplicate slug: ${p.slug}`);
	seen.add(p.slug);
	// 5. Pending panels must not carry a score; scored panels must match the formula
	if ((p.data_quality ?? '') === 'pending') {
		if (p.score !== undefined && p.score !== null) errors.push(`${p.slug}: pending panel carries a score`);
	} else {
		const expected = formula(p);
		if (Math.abs((p.score ?? 0) - expected) > 0.05) {
			errors.push(`${p.slug}: score ${p.score} does not match formula ${expected}`);
		}
		scored++;
	}
	// 6. Flag shape
	for (const f of p.flags ?? []) {
		if (!f.text || !f.date) errors.push(`${p.slug}: flag missing text or date`);
	}
}

// 7. Stats sanity
if (scored === 0) errors.push('no scored panels');

// 8. CSV parity
const csv = readFileSync(join(root, 'data/panels.csv'), 'utf8').split('\n').filter((l) => l.trim() !== '');
if (csv.length - 1 !== panels.length) errors.push(`CSV rows ${csv.length - 1} != JSON panels ${panels.length}`);

if (errors.length > 0) {
	console.error('VALIDATION FAILED:');
	for (const e of errors) console.error(' -', e);
	process.exit(1);
}
console.log(`OK: ${panels.length} panels (${scored} scored), scores match the published formula, CSV parity confirmed`);
