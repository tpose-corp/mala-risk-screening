# AI logic: Where, How, Prove, Measure

Short answer: **AI is not part of the running system.** The MALA risk result is plain code built
from the hospital's criteria. AI was used heavily to **build** the system and its documents.

## 1. Where

| Place | AI used? | Detail |
|---|---|---|
| Risk result (dose check, risk score, Sick Day flags) | **No** | `app/src/lib/rules.ts`, plain arithmetic. `CLAUDE.md` rule 2 forbids an AI call here. |
| Advice text shown to staff | **No** | AI-written advice (PBI-16) was not built. The app shows the hospital's own wording from its demo deck (`app/src/lib/advice.ts`). |
| Patient chatbot | **No** | Not built (WON'T in `scope-lock.md`). |
| Writing the code | **Yes** | Members used Claude Code (Anthropic) to write the code. For v2 the work was divided by area, one per member (`f2824dd` database and roles, `1bf4041` UI, `79e89cb` รพ.สต. side, `8c55f12` hospital side and admin, `5097b10` tests and data). The Tech Lead merged the parts and fixed or added what was missing. |
| Documents | **Yes** | Test Plan v2, rule cases R-01 to R-11, TAM items (`test-plan.md` section 15), READMEs, this `.docs/final/` folder, issue log and session record (drafted by Claude Code from the repo and the team's notes, then read by the team). |
| Clinical thresholds | **No** | Every number comes from `thresholds/` (DOC-02). AI never set one. |

## 2. How

- **Tool:** Claude Code (Anthropic), in the terminal, working in this repo.
- **Rules given to the AI:** [`CLAUDE.md`](../../CLAUDE.md): never invent criteria, rules not AI
  for risk, human makes the clinical call, follow `rule.md`, synthetic data only, never commit or
  push by itself, disclose AI use.
- **Input:** the hospital's documents in `thresholds/`, `intent.md`, `rule.md`, the backlog, and
  for v2 the 11 change requests from session S01.
- **Human control:** a member ran every git command and opened every pull request; `main` is
  protected; the team ran the app and checked each role on localhost before merging.

## 3. Prove

The part that matters for safety is the rule engine, so that is what is tested.

| Test set | Baseline (expected answer) | How it is run | Result |
|---|---|---|---|
| Rule cases R-01 to R-11 (`test-plan.md` section 6.2), every branch and boundary | Expected results written by hand from the hospital outline, not from the code | `npx tsx scripts/eval-rule-cases.ts` | **11 of 11 pass**, [`test/results/rule-cases-2026-11-18.md`](../../test/results/rule-cases-2026-11-18.md) |
| Unit tests, 15 files (rules, alcohol, advice, audit guard, national ID, passwords, editable criteria and more) | Test-plan rows and `rule.md` | `cd app && npm test` | **165 of 165 pass**, [`test/results/unit-tests-2026-11-18.txt`](../../test/results/unit-tests-2026-11-18.txt) |
| Determinism: same input twice | Identical output | R-11 and `rules.test.ts` #11 | Pass |

### Where the AI was wrong and people caught it

| What | Caught by | Fix |
|---|---|---|
| Test plan row PBI-06 #6 said eGFR 55 + BMI 22 = score 2; it is 3 | Writing the tests | Noted in `app/README.md` open question 8; boundary tested separately (#6b) |
| Admin could reset their own password and lock themselves out | Team using the v2 build | Self-reset blocked (issue T-01) |
| Calendar opened off screen; form buttons fell below the screen | Team using the v2 build | Issues T-02, T-03 |
| Live site was slow because the server ran in the USA | Team timing the live site | Region fix, issue T-05 |

### Why the result can be trusted, and what happens if something fails

- The rule engine has no model, no randomness and no network call. If it fails, the page shows
  an error and nothing is saved; it can never return a guessed result.
- A person still confirms every case, and a hospital doctor or nurse handles every alert.
- The hospital can change thresholds in v2. Impossible values are refused (`paramProblems`,
  tested in `v2.test.ts`), each change needs an approver's name and a reason, and every result
  stores the rule version it used, so old results can be traced.
- **Limits:** the criteria are the hospital's draft (8 Sep 2026); the alcohol reading
  ("either 9.2.1 or 9.2.2 counts") and the alert order are the team's reading, listed as open
  questions in `app/README.md`. **Bias check:** the rules use eGFR, BMI, dose, alcohol and
  symptoms only. Sex enters only through the hospital's alcohol definitions (different drink
  counts for men and women), which come from DOC-02.

## 4. Measure (AI-ROI)

| Item | Without AI | With AI | Measured with |
|---|---|---|---|
| Time to build the work | Not measured. No fair baseline: the team never built the same work without AI | Not measured | None |
| Hospital change requests built after S01 | 0 of 11 | 11 of 11 | `test/issue-log.md`, PR #28 |
| Size of the v2 change | Not applicable | 103 files, +5,516 and −1,616 lines | `git diff --shortstat f2824dd^ 5097b10` |
| AI in the risk decision | None | None | `rules.ts`, 11 of 11 rule cases |

AI made the build faster, but AI-written code still needs review. Every member discloses AI use
in their role statement.
