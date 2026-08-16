# SMMScout Open Data

Mirror of the [SMMScout](https://smmscout.com) panel dataset: 106 SMM panels with
Scout Scores, measured API latency, service counts, payment methods, verification
status and dated flags.

## Files

- `panels.json` — full dataset (snapshot, refreshed weekly)
- Live source: `https://smmscout.com/api/panels.json` (CORS-open, no key)

## Schema

```json
{
  "slug": "ezkify-com",
  "name": "Ezkify",
  "domain": "ezkify.com",
  "url": "https://ezkify.com",
  "platforms": ["Instagram", "TikTok", "YouTube", "Facebook", "X", "Telegram", "Spotify", "Twitch"],
  "services": 8700,
  "responseMs": 300,
  "verified": true,
  "boost": "featured",
  "flags": [{ "text": "...", "severity": "warning", "date": "2026-08-14" }]
}
```

## Methodology

Scores are computed from published inputs — the formula with all weights is at
https://smmscout.com/methodology/ (longevity 30 log-scaled, catalog 25 log-scaled,
API performance 35, platform breadth 10, owner verification +25; max 125).
Every score is recomputable from the data in this repo.

## License

Data: CC BY 4.0 with attribution to SMMScout (link to https://smmscout.com).
The Scout Score formula is published and may not be repackaged as a proprietary ranking.
