# Rule engine evaluation, cases R-01 to R-11

Run: 2026-11-17T17:37:10.154Z · rule version outline-draft-2026-09-08 · script app/scripts/eval-rule-cases.ts

Expected values come from .docs/04-build/test-plan.md section 6.2 (checked by hand against the hospital outline).

| ID | Test data | Expected | Actual | Result |
|---|---|---|---|---|
| R-01 | eGFR 75, 1500 mg, 70 kg | ok, score 0, no alert, no advice | ok, score 0, no alert, no advice | PASS |
| R-02 | eGFR 45, 2000 mg, 70 kg | ok, score 1, no alert, no advice | ok, score 1, no alert, no advice | PASS |
| R-03 | eGFR 44, 1500 mg, 70 kg | exceeds, score 1, alert, no advice | exceeds, score 1, alert, no advice | PASS |
| R-04 | eGFR 30, 1000 mg, 70 kg | ok, score 1, no alert, no advice | ok, score 1, no alert, no advice | PASS |
| R-05 | eGFR 29, 500 mg, 70 kg | contraindicated, score 1, alert, no advice | contraindicated, score 1, alert, no advice | PASS |
| R-06 | eGFR 75, 1000 mg, 55 kg | ok, score 2, alert, Sick Day advice | ok, score 2, alert, Sick Day advice | PASS |
| R-07 | eGFR 55, 1000 mg, 70 kg, regular heavy drinking | ok, score 3, alert, Sick Day advice | ok, score 3, alert, Sick Day advice | PASS |
| R-08 | eGFR 75, 1000 mg, 70 kg, drinks, no heavy item | ok, score 0, no alert, no advice | ok, score 0, no alert, no advice | PASS |
| R-09 | eGFR 75, 1000 mg, 70 kg, vomiting | ok, score 0, no alert, Sick Day advice | ok, score 0, no alert, Sick Day advice | PASS |
| R-10 | eGFR 75, 1000 mg, 70 kg, herbal | ok, score 0, no alert, Sick Day advice | ok, score 0, no alert, Sick Day advice | PASS |
| R-11 | R-07 submitted twice | identical output | identical output | PASS |

**11 of 11 cases pass.**
