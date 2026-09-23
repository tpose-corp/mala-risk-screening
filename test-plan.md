# Test Plan — MUST workflow (Alpha Demo, W8)

Covers the 7 locked MUST items from `.docs/04-build/scope-lock.md` — written before the code
exists, per the W6 guidance to use AI/test design across the whole SDLC, not just after a feature
ships.

> **All test data must be synthetic** — fake names, fake HN, fake eGFR/weight/height values. Never
> use a real patient's data in a test case, screenshot, or bug report (`rule.md`).

## Testing pyramid for this build

| Level | What it covers here | Who runs it |
|---|---|---|
| Unit | PBI-06's rule engine — pure functions, no UI, no database | Whoever builds PBI-06 (Tech Lead/AI Lead), reviewed by QA |
| Integration | Login → form → result → confirm chain talks to the DB correctly | QA, once PBI-01/04/05/06/07/11 are wired together |
| Manual / UAT | A real front-line staff persona walks the full workflow | QA, then real users in TEST phase (W9+) |

## PBI-01 — Login

| # | Case | Steps | Expected |
|---|---|---|---|
| 1 | Valid login | Enter a correct username/password | Logged in, login event recorded with timestamp |
| 2 | Wrong password | Enter a valid username, wrong password | Rejected, no access granted, failed attempt logged (no password stored) |
| 3 | No session bypass | Try to open any patient-data page without logging in first | Redirected to login, no data shown |

## PBI-04 — Add a new patient

| # | Case | Steps | Expected |
|---|---|---|---|
| 1 | Minimum valid entry | Name + DOB + sex + facility, HN left blank | Patient created (HN is optional) |
| 2 | Missing required field | Leave name or DOB blank | Form blocks submit, clear error |
| 3 | Duplicate-looking name | Add two synthetic patients with the same name, different DOB | Both saved as separate patients (DOB disambiguates) |

## PBI-05 — Screening form (13 items)

| # | Case | Steps | Expected |
|---|---|---|---|
| 1 | Complete valid form | Fill all 13 fields with plausible synthetic values | Form submits, all values passed to the rule engine |
| 2 | Missing a required field | Leave eGFR or Metformin dose blank | Form blocks submit |
| 3 | Out-of-range value | Enter eGFR = -5 or weight = 0 | Form rejects/flags as invalid, no silent pass-through |
| 4 | Alcohol question edge case | Select each of the 4 alcohol levels in turn | Each level maps to the correct input the rule engine expects (flag if the checklist's raw yes/no shape and the picker's 4 levels disagree — see `intent.md` open item) |

## PBI-06 — Deterministic rule engine (the highest-risk part — test this hardest)

| # | Case | Input | Expected |
|---|---|---|---|
| 1 | Dose-vs-eGFR: pass | eGFR 50, dose 1500mg | No dose-mismatch flag (≤2000mg allowed at eGFR ≥45) |
| 2 | Dose-vs-eGFR: boundary | eGFR exactly 45, dose exactly 2000mg | No mismatch (boundary is inclusive — confirm inclusive/exclusive with the hospital contact if untested) |
| 3 | Dose-vs-eGFR: fail (mid band) | eGFR 35, dose 1500mg | Mismatch flag (band 30–44 caps at 1000mg) |
| 4 | Dose-vs-eGFR: contraindicated | eGFR 25, any dose | Contraindicated flag |
| 5 | Risk score: just under threshold | eGFR 65 (0pt) + BMI 24 (0pt) + no heavy alcohol (0pt) | Score 0, no alert from this check |
| 6 | Risk score: exactly at threshold | eGFR 55 (1pt) + BMI 22 (2pt) | Score 2 → **alert** (threshold is ≥2) |
| 7 | Risk score: multiple factors | eGFR 55 (1pt) + BMI 22 (2pt) + heavy alcohol (2pt) | Score 5 → alert |
| 8 | Sick Day flags: single | Vomiting/diarrhea = yes, everything else clean | Sick Day Rule advice triggered, independent of the score check |
| 9 | Sick Day flags: none | All four flags = no | No Sick Day advice |
| 10 | Combined: dose fail + score fail | Trigger both check 3/4 and check 6/7 at once | Both flags present, still resolves to one alert (not double-counted oddly) |
| 11 | No LLM call | Run the same input twice | Identical output both times (deterministic — proves it isn't going through a non-reproducible model call, per PBI-06's acceptance criteria) |

## PBI-07 — Result display

| # | Case | Steps | Expected |
|---|---|---|---|
| 1 | Alert result shown | Submit an input that triggers an alert | Screen clearly shows "alert" state + which check(s) triggered, in plain non-clinical language |
| 2 | No-alert result shown | Submit an input with no triggers | Screen shows "no alert" + any active Sick Day advice, not a blank/ambiguous state |

## PBI-11 — Confirm/approve

| # | Case | Steps | Expected |
|---|---|---|---|
| 1 | Approve records identity | Front-line staff presses Confirm on a result | Approver identity, timestamp, and the exact record approved are all stored (ETA §9) |
| 2 | Can't approve twice with different outcomes | Try to re-approve an already-confirmed record | Either blocked, or creates a new version rather than silently overwriting (ties to PBI-14) |

## PBI-12 — Audit log

| # | Case | Steps | Expected |
|---|---|---|---|
| 1 | Access is logged | Open a patient's screening record | Log entry created: who, what record, when |
| 2 | Edit is logged | Edit a screening record (if editing exists at this stage) | Log entry created with old/new distinguishable |
| 3 | Regular user can't delete logs | Attempt to delete/alter a log entry as a non-admin | Rejected (CCA §26 — logs protected from tampering) |

## What's out of scope for this test plan

Anything under SHOULD/COULD/WON'T in `scope-lock.md` (PBI-02 full RBAC, PBI-08 real LINE alert,
PBI-15 real hospital export, PBI-13 consent flow, PBI-16 AI advice generation, PBI-17 MFA, PBI-14
versioning, PBI-03 search) — test those once they're actually being built, not before.
