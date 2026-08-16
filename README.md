# SMMScout Open Data

![License](https://img.shields.io/badge/license-CC%20BY%204.0-blue)
![Panels](https://img.shields.io/badge/panels-106-orange)
![Refresh](https://img.shields.io/badge/refresh-weekly-green)
![API](https://img.shields.io/badge/API-free%20%2F%20no%20key-important)

Open SMM panel dataset: **106 panels** with Scout Scores, measured API latency,
service counts, payment methods, verification status and dated flags. Updated
automatically every week.

| Asset | Description |
|---|---|
| `panels.json` | Full dataset (primary) |
| `panels.csv` | Same data, flat CSV for spreadsheets and scripts |
| `SCHEMA.md` | Field-by-field documentation |
| Live API | `https://smmscout.com/api/panels.json` (CORS-open, no key) |

## Quick start

```bash
# JSON
curl -s https://smmscout.com/api/panels.json | jq '.panels | length'
# 106

# CSV
python3 - <<'PY'
import urllib.request, json
d = json.load(urllib.request.urlopen("https://smmscout.com/api/panels.json"))
top = sorted((p for p in d["panels"] if p.get("dataQuality") != "pending"),
             key=lambda p: -(p.get("services") or 0))[:5]
for p in top:
    print(p["name"], p["domain"], p["services"], "services")
PY
```

## Data preview

| # | Panel | Domain | Score /125 | Services | API (ms) | Verified |
|---|---|---|---|---|---|---|
| 1 | Ezkify | ezkify.com | 105 | 8,700 | 300 | yes |
| 2 | Smmize | smmize.com | 102 | 3,643 | 74 | yes |
| 3 | SocialPanel Pro | socialpanel.pro | 96 | 181,340 | 838 | no |
| 4 | BulkFollows | bulkfollows.com | 94 | 5,638 | 684 | no |
| 5 | InstantPanel | instantpanel.net | 93 | 5,389 | 744 | no |

Scores are computed from the published formula: longevity 30 (log-scaled),
catalog 25 (log-scaled), API performance 35, platform breadth 10, owner
verification +25. Max 125. Full methodology: https://smmscout.com/methodology/

## Refreshing

This repo updates itself weekly via GitHub Actions (`.github/workflows/refresh.yml`)
by pulling the live API and committing the diff. You can also trigger it manually:
**Actions → Refresh data → Run workflow**. Every commit records the measurement
date in the `generated_at` field.

## License

Data: **CC BY 4.0** — use freely with attribution to SMMScout (link to
https://smmscout.com). The Scout Score formula is published and may not be
repackaged as a proprietary ranking. See `LICENSE`.

## Links

- Live directory: https://smmscout.com/panels/
- Methodology: https://smmscout.com/methodology/
- Market report: https://smmscout.com/market-report/
- Data API docs: https://smmscout.com/api/
