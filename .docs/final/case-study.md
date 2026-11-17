# Case study: MALA Risk Screening

**Live URL:** https://mala-risk-screening.vercel.app (synthetic data only)
**Repo:** https://github.com/tpose-corp/mala-risk-screening
**Team:** T-POSE Corp, with the Primary Care Pharmacy Service, Chiang Rai Prachanukroh Hospital

## 1. Problem

Metformin-Associated Lactic Acidosis (MALA) is rare but kills 30 to 50 percent of patients
([secondary evidence](../01-requirements/secondary-evidence.md), section 1). The hospital's own
review of Mueang District, Chiang Rai, FY2023 to 2025, found that **58 percent of MALA patients got
Metformin from a primary-care unit** (DOC-01). Those units had **no standard screening tool**, and
their staff usually lack a doctor's training, so they judged risk by themselves (INT-01).

Sources: [`backlog.md` problem overview](../01-requirements/backlog.md#problem-overview-from-int-01-and-doc-01),
DOC-01 and DOC-02 in the interview log, [`secondary-evidence.md`](../01-requirements/secondary-evidence.md).

## 2. Process

| Phase | When | What happened | Evidence |
|---|---|---|---|
| Discover | Aug to Sep 2026 | Interview with the hospital contact (INT-01); hospital project document (DOC-01); real clinical criteria (DOC-02: 13-item checklist, rule spreadsheet, demo deck) | `backlog.md`, `intent.md`, `thresholds/` |
| Define | Sep 2026 | Backlog with MoSCoW; MUST list locked to one path: log in, add patient, screen, result, confirm, logged | `.docs/01-requirements/backlog.md`, `.docs/04-build/scope-lock.md` |
| Design | Sep 2026 | Feature list, user journey, clickable prototype, 4 diagrams | `.docs/02-design/` |
| Build Alpha | Sep to 7 Oct 2026 | Next.js app with a deterministic rule engine, audit log, hospital inbox; deployed on Railway | PR #22, commit `7fb5d83` |
| Test plan | 28 Oct 2026 | Test Plan v2: test cases, UAT tasks, SUS and TAM | `.docs/04-build/test-plan.md` |
| Real-user session | 17 Nov 2026 | 5 real users (U01 to U05) tried the Alpha; with the hospital nurse's comments, 11 changes were requested | `test/sessions/S01-2026-11-17-hospital-uat.md` |
| Build v2 | Nov 2026 | Work divided by area, one member each, with Claude Code; the Tech Lead merged the parts and filled the gaps; PR #28 | `test/issue-log.md`, commits `f2824dd` to `5097b10` |
| Deliver | 17 to 18 Nov 2026 | Moved to Vercel + Neon; evidence written up | `deployment.md`, this folder |

Key decisions:
- **Rules, not AI, decide risk.** The hospital's criteria are a fixed table, so plain code gives the
  same answer every time and can be checked line by line ([`ai-logic.md`](ai-logic.md)).
- **The hospital owns the numbers.** In v2 the admin changes thresholds at `/admin/criteria`.
  Every change is a new version with the approver's name and a reason, and each result stores the
  version it used.
- **Legal rules from day one.** Append-only audit log enforced by database triggers (Computer Crime
  Act section 26); confirmation stores who, when and which rule version (Electronic Transactions
  Act); synthetic data only (PDPA). See [`../../rule.md`](../../rule.md) and
  [`../../app/README.md`](../../app/README.md#audit-log-against-rulemd-computer-crime-act-26).

## 3. Outcome

What exists now:
- A working system with three roles (รพ.สต. staff, hospital clinicians, hospital admin), the
  hospital's 13-item form, a rule engine, two alert tabs (over-dose first), national ID duplicate
  check, lock after confirmation with admin amendments, per-area NSAID and herbal summary, and an
  admin back office.
- 165 of 165 unit tests and 11 of 11 rule cases pass
  ([`test/results/`](../../test/results/)).
- 11 of 11 change requests from the real-user session are built ([`issue-log.md`](../../test/issue-log.md)).

What is **not** shown yet, and why: no timed real-user sessions, no SUS or TAM results, so there is
no before and after for screening time or accuracy by real staff. The plan to get them is in
[`test/no-real-user-test.md`](../../test/no-real-user-test.md). Numbers are in
[`comparison-table.md`](comparison-table.md).

Not built: LINE alerts (waiting for the hospital's group), AI-written advice (the app uses the
hospital's own wording), MFA, consent notice, link to the hospital's HIS.

## 4. Lessons

- One interview plus real documents was enough to build the right rules, but the 17 Nov session
  showed that roles, identity and editing rules only appear when real staff use the system.
- The clinical criteria are still the hospital's draft of 8 Sep 2026. The system lets the hospital
  correct them without a developer, but the hospital must sign off the final numbers.
