# SCHEMA.md — field documentation

Every field in `data/panels.json`, with type and notes. Fields with `null` mean
the panel is under review or the measurement is not available; **null inputs are
never invented** — the score simply excludes them.

Field names are snake_case, exactly as the live API serves them
(`https://smmscout.com/api/panels.json`). This dataset is a mirror: the values,
names and semantics are the API's, not a re-spelling of them.

## Top-level

| Field | Type | Notes |
|---|---|---|
| `generated_at` | string (ISO) | When the API served this payload; the mirror's pull time |
| `data_built_at` | string (ISO) | When the site's data blob behind this payload was built |
| `data_measured_at` | string (date) | Date the underlying measurements were taken |
| `count` | int | Number of panels in the dataset |
| `formula` | string | URL of the published methodology |
| `panels` | array | The panel objects |

## Panel object

| Field | Type | Notes |
|---|---|---|
| `slug` | string | Stable identifier, used in URLs (/panels/{slug}/) |
| `name` | string | Panel brand name |
| `domain` | string | Registered domain |
| `url` | string | Canonical smmscout.com panel page |
| `platforms` | array[string] | Platforms in the public service list (breadth caps at 8) |
| `services` | int or null | Live public catalog size (log-scaled input, clamped at 9,000) |
| `response_ms` | int or null | Measured API latency, one vantage point |
| `domain_age_years` | float or null | WHOIS age (log-scaled input, capped at 10 years) |
| `price_floor` | string or null | Published price floor text (e.g. `$0.001`) |
| `payments` | array[string] | Payment methods observed on the homepage; may be empty |
| `refill` | bool or null | Refill guarantee listed |
| `api` | bool or null | API documented |
| `verified` | bool | Owner proved control (+25 bonus) |
| `verified_on` | string or null | Date of the latest measurement pull |
| `owned` | bool | Operator discloses ownership of this panel |
| `data_quality` | string | `full` or `pending` (pending = no score) |
| `liveness` | object or null | Latest liveness probe: `{ state, reason, detail, http_status, checked_at }` |
| `operational` | bool | True only when `liveness.state` is `ok` (fail closed) |
| `script` | string or null | Panel software, when it is identifiable (e.g. `PerfectPanel`) |
| `score` | number or null | Scout Score 0-125, published to 0.1 — null when unscored |
| `risk_score` | int | Risk band 0-100, higher = more caution (see below) |
| `flags` | array[object] | Dated concerns: `{ text, severity, date, resolved }` |

## When a panel has no score

`score` is `null` when the panel is **not scored**, which is the case when either

- `data_quality` is `"pending"` (listed, not yet measured), or
- `operational` is `false` — the liveness probe did not find a healthy page
  (`liveness.state` is `dead` or `degraded`).

The rule is fail-closed and identical on the site, the live API and
`scripts/validate.mjs`: nothing is advertised (or scored) that was not measured.
A panel that stops answering keeps its row, its flags and its risk score, and
loses only the ranking number.

## Flags

- `severity`: `info` | `warning` | `critical`
- `resolved`: `true` means the concern was addressed; a resolved flag no longer
  counts toward the risk score
- Flags are observations, not convictions: see https://smmscout.com/scam-reports/

## Score (Scout Score, 0-125) — recomputable from this dataset

Base = ln(1 + min(age, 10)) / ln(11) × 30 + ln(1 + min(services, 9,000)) /
ln(9,001) × 25 + clamp(1 − (ms − 600) / 1400, 0, 1) × 35 + min(platforms / 8, 1) × 10,
plus a one-time +25 for owner-verified panels; the base is rounded to 0.1 before
the bonus, then rounded to 0.1 again.

Every input is published so the number can be recomputed. See
https://smmscout.com/methodology/. `scripts/validate.mjs` recomputes this for
every scored panel on every refresh and fails the refresh on any mismatch.

## Risk score (0-100) — a warning band, not the ranking

`risk_score` is published per panel and runs 0-100, **higher = more caution**. It
is computed server-side from five public inputs: active flags (+30 critical, +15
warning, +5 info, capped at 60), domain age (+15 under 2y, +10 under 5y, +5 under
8y), no published price floor (+10), data pending (+15), and owner verification
(−10 verified, +5 not).

Bands: 0-19 low risk · 20-39 caution · 40-59 elevated · 60+ high risk.
`https://smmscout.com/api/v2/panels.json` publishes the band as `risk_label`;
the arithmetic is documented at https://smmscout.com/methodology/ ("The risk
score"). The risk score is deliberately a different scale from the Scout Score
(0-125, higher = better) — do not compare the two numbers or rank on this one
without saying which is which.

Note: before 2026-09-13 the site's static payload and its API computed the risk
score with two different formulas, and this mirror had copied the older static
one. Since 2026-09-13 every surface publishes the single documented formula in
this file's terms; a value copied from a payload older than that date is not
comparable.

## CSV

`data/panels.csv` is the flat export for spreadsheet users. Its columns are
`slug,name,domain,url,platforms,services,response_ms,verified,boost,flags,score`
— `platforms` is `|`-joined, `flags` is `;`-joined flag text, and the richer
fields (`liveness`, `operational`, `risk_score`, `payments`, `domain_age_years`)
live in `data/panels.json` and the live API.
