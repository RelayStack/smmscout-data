# Contributing

## Data corrections

Wrong catalog count? Stale latency? Open an issue with the panel slug and the
measured value, or use the official flow: https://smmscout.com/verify/ — every
correction lands in the changelog with a date.

## Issues

- Bug in the dataset: include the panel slug + expected/actual values
- Format questions: see SCHEMA.md first
- Security: see SECURITY.md

## Pull requests

- Data updates are automated (weekly refresh workflow); manual PRs are for
  docs, format fixes and new artifacts
- Every push and PR runs `verify` (`.github/workflows/verify.yml`), which needs
  only `node` — no `package.json`, no `npm install`. To reproduce it locally:

  ```bash
  node scripts/validate.mjs
  node scripts/stats.mjs && git diff --exit-code data/stats.json
  node scripts/verify-consistency.mjs
  ```

  If you touch `data/panels.json`, commit `data/panels.csv`, `data/stats.json`
  and `meta.json` from the same pull — the run fails otherwise.
- Keep commits focused; tests are not required for docs-only changes
