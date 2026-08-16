# SMMScout Open Data — Free SMM Panel Dataset & API

![License](https://img.shields.io/badge/license-CC%20BY%204.0-blue)
![Panels](https://img.shields.io/badge/panels-106-orange)
![Refresh](https://img.shields.io/badge/refresh-weekly-green)
![API](https://img.shields.io/badge/API-free%20%2F%20no%20key-important)
![Updated](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2FRelayStack%2Fsmmscout-data%2Fmain%2Fmeta.json)

The **SMMScout dataset** is a free, open collection of SMM panel data: 106 SMM
panels with Scout Scores, measured API latency, service counts, payment methods,
verification status and dated flags — served as JSON and CSV and refreshed
automatically every week. It answers the question most panel rankings avoid:
what are the measured numbers behind each panel, on what date were they taken,
and can the ranking be recomputed from the published formula.

Use it to research panels, build price monitors, power comparison tools or train
models. No API key. CORS open. CC BY 4.0.

## 📦 Files

| Asset | Description |
|---|---|
| `panels.json` | Full dataset (primary source) |
| `panels.csv` | Same data, flat CSV |
| `SCHEMA.md` | Every field documented |
| `meta.json` | Refresh timestamp for badges |
| Live API | `https://smmscout.com/api/panels.json` |

## 🧑‍💻 How to use the SMM panel data

**Fetch with curl + jq** — the 10 panels with the most services:

```bash
curl -s https://smmscout.com/api/panels.json \
  | jq -r '.panels | sort_by(.services // 0) | reverse | .[:10][] | "\(.name)\t\(.services)"'
```

**Fetch in JavaScript (browser or Node):**

```js
const res = await fetch("https://smmscout.com/api/panels.json");
const data = await res.json();
const fastest = [...data.panels]
  .filter((p) => p.responseMs)
  .sort((a, b) => a.responseMs - b.responseMs)[0];
console.log(fastest.name, fastest.responseMs + "ms");
```

**Load into pandas (Python):**

```python
import pandas as pd
df = pd.read_csv("https://smmscout.com/api/panels.json")
# or: df = pd.read_csv("https://raw.githubusercontent.com/RelayStack/smmscout-data/main/panels.csv")
print(df.sort_values("services", ascending=False).head(5))
```

## 🏆 The leaderboard (Scout Score / 125)

| # | Panel | Domain | Score | Services | API (ms) | Verified |
|---|---|---|---|---|---|---|
| 1 | Ezkify | ezkify.com | 105 | 8,700 | 300 | yes |
| 2 | Smmize | smmize.com | 102 | 3,643 | 74 | yes |
| 3 | SocialPanel Pro | socialpanel.pro | 96 | 181,340 | 838 | no |
| 4 | BulkFollows | bulkfollows.com | 94 | 5,638 | 684 | no |
| 5 | InstantPanel | instantpanel.net | 93 | 5,389 | 744 | no |

Full interactive table: **[SMM panel data explorer](https://relaystack.github.io/smmscout-data/)**
(GitHub Pages) or the [live directory](https://smmscout.com/panels/).

## 🏠 Panels we operate — disclosed, scored by the same rules

This dataset is published by the team behind two SMM panels. They are scored by
the identical formula and their numbers are **not adjustable**:

| Panel | Role | Score | Why the numbers are trustworthy |
|---|---|---|---|
| **Ezkify** (ezkify.com) | Retail panel | 105/125 · #1 | 8,700 services, 300ms API, verified; score drops would be published too |
| **Smmize** (smmize.com) | Wholesale provider | 102/125 · #2 | Fastest measured API in the dataset (74ms), 12 platforms, verified |

Both panels carry `"owned": true` in the data, and the site documents that no
mechanism exists to adjust their numbers — see the [disclosure](https://smmscout.com/disclosure/).
A recent catalog measurement dropped Smmize's score, and the drop was published
in the [changelog](https://smmscout.com/updates/). That is the point of the dataset.

## 🧮 How the Scout Score works

Score = longevity 30 (log-scaled) + catalog 25 (log-scaled) + API performance 35
+ platform breadth 10 + owner verification 25. **Max 125.** Every score in this
dataset is recomputable from the published inputs. Full methodology:
https://smmscout.com/methodology/

## ❓ FAQ

**Is the SMM panel data free?** Yes. JSON and CSV, no key, CORS open. The only
ask: attribute SMMScout with a link when you republish.

**How fresh is the data?** Refreshed automatically every Monday via GitHub
Actions; the `generated_at` field in `panels.json` records the pull time.

**Why are some panels missing scores?** Panels under review are listed with
`"dataQuality": "pending"` and no score. Scores are never invented for them.

**Can I use the data commercially?** Yes, under CC BY 4.0 with attribution.
The published formula may not be repackaged as a proprietary ranking.

**Where does the data come from?** Public measurements: WHOIS age, live catalog
counts and API probes from a single vantage point, dated on every panel page.

## 🔄 Refreshing

Weekly via `.github/workflows/refresh.yml` (Mondays 03:00 UTC). Manual trigger:
**Actions → Refresh data → Run workflow**.

## 📜 License

CC BY 4.0 — see `LICENSE`.

## 🔗 Links

- Live directory: https://smmscout.com/panels/
- Methodology: https://smmscout.com/methodology/
- Market report: https://smmscout.com/market-report/
- Data API docs: https://smmscout.com/api/
- Scam reports & risk flags: https://smmscout.com/scam-reports/
