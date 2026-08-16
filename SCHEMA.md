# SCHEMA.md — field documentation

Every field in `panels.json`, with type and notes. Fields with `null` mean the
panel is under review or the measurement is not available; **null inputs are
never invented** — the score simply excludes them.

## Top-level

| Field | Type | Notes |
|---|---|---|
| `generated_at` | string (ISO) | When this snapshot was pulled |
| `count` | int | Number of panels in the dataset |
| `formula` | string | URL of the published methodology |
| `panels` | array | The panel objects |

## Panel object

| Field | Type | Notes |
|---|---|---|
| `slug` | string | Stable identifier, used in URLs (/panels/{slug}/) |
| `name` | string | Panel brand name |
| `domain` | string | Registered domain |
| `url` | string | Homepage |
| `platforms` | array[string] | Platforms in the public service list |
| `services` | int or null | Live public catalog size (log-scaled input) |
| `responseMs` | int or null | Measured API latency, one vantage point |
| `domainAgeYears` | float or null | WHOIS age (log-scaled input) |
| `verified` | bool | Owner proved control (+25 bonus) |
| `verifiedSince` | string or null | Verification date |
| `verifiedOn` | string or null | Date of the latest measurement pull |
| `boost` | string or null | "pro" / "featured" — labeled placement, never score |
| `owned` | bool | Operator discloses ownership of this panel |
| `dataQuality` | string | "verified" or "pending" (pending = no score) |
| `payments` | array[string] or null | Payment methods observed on the homepage |
| `refill` | bool or null | Refill guarantee listed |
| `api` | bool or null | API documented |
| `priceNote` | string or null | Published price floor text |
| `focus` | string | Primary use case tag |
| `region` | string | Primary market region |
| `flags` | array[object] | Dated concerns: `{ text, category, severity, date, resolvedDate? }` |

## Flags

- `severity`: `info` | `warning` | `critical`
- `resolvedDate` present = the concern was addressed; the flag no longer counts
  against the risk score
- Flags are observations, not convictions: see https://smmscout.com/scam-reports/

## Risk score (separate from Scout Score)

Not in this dataset (computed server-side), but its inputs (flags, age, price
data) are all here. Risk is a 0-100 warning band; the Scout Score is the 0-125
ranking. They measure different things on purpose.
