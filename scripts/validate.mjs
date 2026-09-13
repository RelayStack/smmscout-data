// Dataset validation + score recomputation check.
// Fails the build/refresh if the dataset is internally inconsistent.
//
// The formula below is the PUBLISHED one (smmscout.com/methodology/, formula v3)
// as implemented in smmscout/src/lib/score-formula.ts. Two published rules this
// file used to miss, and both made the weekly refresh fail on real data:
//   1. the catalog input is clamped at the published 9,000-service cap (without
//      it a 181,340-service catalog earns 33.25 of its 25 points), and
//   2. a panel has no published score unless a measurement says it is
//      operational - the same fail-closed rule the live API applies, which is
//      why a dead domain (liveness.state != "ok") carries score: null.
// Keep in step with src/lib/score-formula.ts; this is the mirror's only copy.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const data = JSON.parse(readFileSync(join(root, 'data/panels.json'), 'utf8'));
const panels = data.panels ?? [];
const errors = [];

// 1. Top-level shape
if (typeof data.generated_at !== 'string') errors.push('generated_at missing');
if (!Array.isArray(panels)) errors.push('panels must be an array');
if (data.count !== undefined && data.count !== panels.length) {
	errors.push(`count ${data.count} != panels ${panels.length}`);
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const round1 = (v) => Math.round(v * 10) / 10;

// Published formula constants (src/lib/score-formula.ts FORMULA / SCORE_CAPS).
const CATALOG_CAP = 9000;
const AGE_CAP_YEARS = 10;
const LATENCY_FLOOR_MS = 600;
const LATENCY_WINDOW_MS = 1400;
const LATENCY_FALLBACK_MS = 4000;
const BREADTH_CAP_PLATFORMS = 8;
const VERIFY_BONUS = 25;

/** The published formula (methodology page v3). */
function formula(p) {
	const age = Math.max(p.domain_age_years ?? 0, 0);
	const svc = Math.min(Math.max(p.services ?? 0, 0), CATALOG_CAP);
	const ms = p.response_ms ?? LATENCY_FALLBACK_MS;
	const longevity = clamp(Math.log(1 + age) / Math.log(1 + AGE_CAP_YEARS), 0, 1) * 30;
	const catalog = clamp(Math.log(1 + svc) / Math.log(1 + CATALOG_CAP), 0, 1) * 25;
	const perf = clamp(1 - (ms - LATENCY_FLOOR_MS) / LATENCY_WINDOW_MS, 0, 1) * 35;
	const breadth = clamp((p.platforms ?? []).length / BREADTH_CAP_PLATFORMS, 0, 1) * 10;
	// The published base is rounded to 0.1 and only then carries the verify bonus.
	const base = round1(longevity + catalog + perf + breadth);
	return round1(base + (p.verified ? VERIFY_BONUS : 0));
}

/** A panel is scored only when its data is complete AND a measurement says it is up. */
function isScored(p) {
	return (p.data_quality ?? '') !== 'pending' && (p.liveness?.state ?? null) === 'ok';
}

const seen = new Set();
let scored = 0;
let unscored = 0;
for (const p of panels) {
	// 3. Required fields
	for (const f of ['slug', 'name', 'domain', 'url', 'platforms']) {
		if (p[f] === undefined) errors.push(`${p.slug ?? '?'}: missing ${f}`);
	}
	// 4. Slug uniqueness
	if (seen.has(p.slug)) errors.push(`duplicate slug: ${p.slug}`);
	seen.add(p.slug);
	// 5. Unscored panels must not carry a score; scored panels must match the formula
	if (!isScored(p)) {
		if (p.score !== undefined && p.score !== null) {
			const why = (p.data_quality ?? '') === 'pending' ? 'pending data' : `not operational (liveness ${p.liveness?.state ?? 'unmeasured'})`;
			errors.push(`${p.slug}: ${why} but carries score ${p.score}`);
		}
		unscored++;
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
	// 7. Risk score: published as an integer 0-100 warning band (higher = worse),
	// never invented for a panel without one.
	if (p.risk_score !== undefined && p.risk_score !== null) {
		if (typeof p.risk_score !== 'number' || !Number.isInteger(p.risk_score) || p.risk_score < 0 || p.risk_score > 100) {
			errors.push(`${p.slug}: risk_score ${p.risk_score} is not an integer in 0-100`);
		}
	}
}

// 8. Stats sanity
if (scored === 0) errors.push('no scored panels');

// 9. CSV parity
const csv = readFileSync(join(root, 'data/panels.csv'), 'utf8').split('\n').filter((l) => l.trim() !== '');
if (csv.length - 1 !== panels.length) errors.push(`CSV rows ${csv.length - 1} != JSON panels ${panels.length}`);

if (errors.length > 0) {
	console.error('VALIDATION FAILED:');
	for (const e of errors) console.error(' -', e);
	process.exit(1);
}
console.log(`OK: ${panels.length} panels (${scored} scored, ${unscored} unscored), scores match the published formula, CSV parity confirmed`);
