# No real-user test with measurements

## Why not

- The Test Plan (`.docs/04-build/test-plan.md`) planned 10 timed sessions with real primary-care
  and hospital staff, codes U01 to U10. No timed session results, SUS forms or TAM forms are
  recorded in this repo, so the team reports none. Nothing below is made up.
- The real-user session S01 on 17 Nov 2026 had 5 users (U01 to U05) plus comments from the
  hospital nurse. It gave qualitative feedback only (11 change requests, see
  `sessions/S01-2026-11-17-hospital-uat.md`); task times, success rates, SUS and TAM were not
  recorded. v2 was built from that feedback and has not been in front of real users yet.
- Real patient data cannot be used (PDPA, `rule.md`), and staff time at รพ.สต. is limited.

## What the team tested instead

| Method | Label | What it covers | Evidence |
|---|---|---|---|
| Unit tests (vitest) | Team test cases | Rule engine, alcohol answers, advice, audit log rules, filters, paging, national ID, passwords, editable criteria | [`results/unit-tests-2026-11-18.txt`](results/unit-tests-2026-11-18.txt): 165 of 165 pass, 15 files |
| Rule cases R-01 to R-11 | Team test cases, expected results checked by hand against the hospital outline | Every rule branch and the deterministic check | [`results/rule-cases-2026-11-18.md`](results/rule-cases-2026-11-18.md): 11 of 11 pass |
| Role click-through on localhost | PROXY (team, not a real user) | Each role reaches only its own pages; locked screening popup; duplicate ID popup | Issue log column "Team" in [`issue-log.md`](issue-log.md) |
| Live site timing | Team measurement | Speed on the deployed site | [`results/live-speed-2026-11-18.md`](results/live-speed-2026-11-18.md) |
| Real user qualitative feedback | REAL (S01) | Which parts were missing or wrong for the hospital | [`sessions/S01-2026-11-17-hospital-uat.md`](sessions/S01-2026-11-17-hospital-uat.md) |
| Published research | SECONDARY | That the problem is real and that rule-based checks help dosing | [`../.docs/01-requirements/secondary-evidence.md`](../.docs/01-requirements/secondary-evidence.md) |

No heuristic review score, SUS, TAM or UTAUT2 result exists yet.

## Before and after measured by the team

| Item | Before | After | How |
|---|---|---|---|
| Rule cases with the expected result | No tool at รพ.สต. (DOC-01) | 11 of 11 | `app/scripts/eval-rule-cases.ts` |
| Same input gives the same result | Not applicable (no tool) | Yes (R-11) | same script |
| Hospital requests from S01 built | 0 of 11 (Alpha) | 11 of 11 (v2, PR #28) | issue log section A |
| Live log in time | 9.13 s (server in USA) | Pending re-measure after the Singapore region deploy | `results/live-speed-2026-11-18.md` |

Screening time per case and "risk judged correctly" by real staff have no numbers. A fair before
value needs the current paper method timed at a รพ.สต., which has not been done.

## Ready-to-run plan for real users

1. Use `.docs/04-build/test-plan.md` sections 7 to 9 as written: tasks UAT-S1 to S3 for รพ.สต.
   staff, UAT-D1 to D3 for doctors or nurses, then SUS and TAM.
2. Two v2 changes to the task cards: UAT-S1 needs a synthetic 13-digit ID, and UAT-D3 (CSV
   download) is now an admin task, because clinicians may not export (F-01).
3. Add one task for the lock rule: "Correct the weight on a case you already confirmed." Success
   = the user sees the locked popup and knows to call the admin.
4. Book through the hospital contact: at least 5 รพ.สต. staff and 3 hospital clinicians, codes
   U01 to U10, no names.
5. Before each session, reset the demo database with `npx prisma db seed` on a fresh database so
   every user starts from the same synthetic data.
6. Write each session to `test/sessions/Uxx-<date>.md` with success, time, errors, help and quotes,
   and each SUS and TAM answer sheet to `test/results/`. Put defects in `issue-log.md`.
