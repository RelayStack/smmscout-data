# Changelog

Tracked on the site: https://smmscout.com/updates/

## 2026-09-13
- **Data refresh to the current payload** — 129 panels, `generated_at`
  2026-09-13T15:32:18Z. The mirror's `data/panels.json` had been a 2026-09-08
  snapshot and `data/panels.csv` / `data/stats.json` / `meta.json` were still the
  106-panel 2026-09-07 pull.
- **`risk_score` semantics changed — every one of the 129 rows moved.** The
  mirror carried a pre-unification copy computed by the retired static formula, on
  a different scale (e.g. nsboostbd-com 8 -> 50, smmstore-com 23 -> 45,
  addfans-org 28 -> 75, followdeh-com 13 -> 50). All 129 values are now the single
  published 0-100 warning band documented at
  https://smmscout.com/methodology/ ("The risk score"), the same number the site,
  the page HTML, `/api/v1/panels.json`, `/api/v2/panels.json` and the static
  `/api/panels.json` serve. `risk_label` (Low risk / Caution / Elevated / High
  risk) is published by `/api/v2/panels.json`; it is not in this dataset's
  `panels.json`, which carries the numeric `risk_score` only. Do not compare a
  value copied from a payload older than 2026-09-13 against the current ones.
- **New fields from the live API:** `liveness`
  (`{ state, reason, detail, http_status, checked_at }`) and `operational`.
  A panel that is not operational now carries `score: null` — 16 dead/degraded
  rows lost their ranking number while keeping their flags and risk score.
- **`data/panels.csv` rebuilt** (129 rows, up from 106) and `data/stats.json`
  regenerated: mean Scout Score 89.3, median 90.8, max 105.1 over the 60 scored
  panels; 69 panels are unscored today (67 with pending data, 16 not operational).
- **`scripts/validate.mjs` and `scripts/stats.mjs` now implement the published
  rules** — the catalog input is clamped at the published 9,000-service cap and
  "scored" means complete data *and* an operational liveness measurement. Without
  those, `validate.mjs` rejected the current payload on 7 rows and the weekly
  refresh would have failed again; `stats.mjs` was counting two dead domains as
  score 0, which pulled the published mean down to 86.4.
- **Docs corrected:** README and the GitHub Pages explorer no longer advertise
  106 panels, the explorer reads the published `score` field instead of carrying
  its own copy of the formula, the CSV links point at `data/panels.csv`, and
  SCHEMA.md now documents the fields this dataset actually has (snake_case, plus
  `liveness`, `operational` and `risk_score`).

## 2026-08-16
- v1.0: initial release (106 panels)
- Scoring v3: platform breadth input, log-scaled age/catalog, weights 30/25/35/10/25
- Weekly refresh automation (GitHub Actions, Mondays 03:00 UTC)
- Dataset fields synced with the live API (snake_case, full measured inputs)
