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

## After the region fix (code running in `sin1`, Singapore)

Measured on 18 Nov 2026 after deploying `main` at merge `7d7a69c` (PR #29). Same script, same
account, run twice. Header now `x-vercel-id: sin1::sin1::...`.

| What | Before | After, run 1 | After, run 2 |
|---|---|---|---|
| Login page HTML (curl, 3 runs) | 0.83 s, 0.47 s, 0.47 s | 0.25 s, 0.19 s, 0.20 s | |
| Log in (submit to first page) | 9.13 s | 1.00 s | 0.54 s |
| `/admin` | 3.90 s | 0.19 s | 0.16 s |
| `/admin/patients` | 3.04 s | 0.34 s | 0.59 s |
| `/hospital` | 5.79 s | 0.17 s | 0.16 s |
| `/hospital/cases` | 4.20 s | 0.33 s | 0.22 s |

Log in is about 9 to 17 times faster; pages are about 5 to 36 times faster. The first request
after the database has been idle for about 5 minutes is still slower (Neon free tier wakes up).
