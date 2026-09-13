// Derived statistics from the dataset.
//
// "scored" is the published rule, not just data_quality: a panel has a score
// only when its data is complete AND a measurement says it is operational
// (liveness.state === "ok"). Counting a dead domain as score 0 put two
// non-operational panels into the 0-50 bucket and dragged the published mean
// down; unscored panels are now excluded from every score/latency figure.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const data = JSON.parse(readFileSync(join(root, 'data/panels.json'), 'utf8'));
const panels = data.panels ?? [];

const isScored = (p) => (p.data_quality ?? '') !== 'pending' && (p.liveness?.state ?? null) === 'ok';
const scored = panels.filter(isScored);
const scores = scored.map((p) => p.score ?? 0).sort((a, b) => a - b);
const mean = scores.reduce((a, b) => a + b, 0) / Math.max(scores.length, 1);
const median = scores.length ? scores[Math.floor(scores.length / 2)] : 0;

const platformCount = {};
for (const p of panels) for (const pl of p.platforms ?? []) platformCount[pl] = (platformCount[pl] ?? 0) + 1;

const latencies = scored.map((p) => p.response_ms).filter((v) => v !== null && v > 0).sort((a, b) => a - b);
const fastest = latencies.slice(0, 5);

const stats = {
	generated_at: data.generated_at,
	panels: panels.length,
	scored: scored.length,
	unscored: panels.length - scored.length,
	pending: panels.filter((p) => (p.data_quality ?? '') === 'pending').length,
	not_operational: panels.filter((p) => (p.liveness?.state ?? null) !== 'ok').length,
	verified: panels.filter((p) => p.verified).length,
	score: {
		mean: Math.round(mean * 10) / 10,
		median: Math.round(median * 10) / 10,
		max: Math.round((scores[scores.length - 1] ?? 0) * 10) / 10,
		distribution: {
			'0-50': scores.filter((s) => s < 50).length,
			'50-75': scores.filter((s) => s >= 50 && s < 75).length,
			'75-90': scores.filter((s) => s >= 75 && s < 90).length,
			'90-100': scores.filter((s) => s >= 90 && s < 100).length,
			'100-125': scores.filter((s) => s >= 100).length,
		},
	},
	latency: {
		measured: latencies.length,
		fastest_ms: fastest,
		mean_ms: Math.round(latencies.reduce((a, b) => a + b, 0) / Math.max(latencies.length, 1)),
	},
	platforms: Object.fromEntries(Object.entries(platformCount).sort((a, b) => b[1] - a[1])),
};

writeFileSync(join(root, 'data/stats.json'), JSON.stringify(stats, null, 2));
console.log(`stats: ${stats.panels} panels, mean ${stats.score.mean}, fastest API ${stats.latency.fastest_ms[0] ?? 'n/a'}ms`);
