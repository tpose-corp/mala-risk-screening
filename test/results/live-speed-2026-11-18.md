# Live site speed, measured by the team

Site: https://mala-risk-screening.vercel.app (Vercel + Neon, synthetic data only)
Measured: 18 Nov 2026, about 00:20 Thai time, from Thailand, by the team (not a real user).

## How it was measured

1. `curl` timed the login page 3 times (`time_total`).
2. A headless browser (Playwright) logged in as the demo `admin` account and opened 4 pages.
   Each number is milliseconds from the click or `goto` until the page loaded (`domcontentloaded`).
3. The response header `x-vercel-id` shows where the page was served. `sin1::iad1` means the
   request entered Vercel in Singapore but the server code ran in Washington, USA (`iad1`).
   The database (Neon) is in Singapore, so every database query crossed the Pacific twice.

## Before the region fix (code running in `iad1`, USA)

| What | Time |
|---|---|
| Login page HTML (curl, 3 runs) | 0.83 s, 0.47 s, 0.47 s |
| Log in (submit to first page) | 9.13 s |
| `/admin` | 3.90 s |
| `/admin/patients` | 3.04 s |
| `/hospital` | 5.79 s |
| `/hospital/cases` | 4.20 s |

## Fix

`app/vercel.json` sets `"regions": ["sin1"]` so the server code runs in Singapore, next to the
database. See `.docs/final/deployment.md`.

## After the region fix

Not measured yet. Re-run the same steps after the next production deploy and add the numbers
here. Do not fill this table with an estimate.

| What | Time |
|---|---|
| Log in | |
| `/admin` | |
| `/admin/patients` | |
| `/hospital` | |
| `/hospital/cases` | |
