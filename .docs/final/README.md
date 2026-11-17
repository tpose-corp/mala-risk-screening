# Final evidence index: MALA Risk Screening (T-POSE Corp)

Everything is on branch **`main`** unless a row says otherwise.
**Live system:** https://mala-risk-screening.vercel.app (synthetic data only).
**Repo:** https://github.com/tpose-corp/mala-risk-screening

Labels: **REAL** = from real users or the hospital. **SECONDARY** = published evidence.
**PROXY** = the team, not a real user. A number with no file behind it is not used.

## 1. Discover

| Item | File |
|---|---|
| Company Charter (members, roles, team rules) | [`../00-proposal/company-charter.md`](../00-proposal/company-charter.md), [`../../Roles.txt`](../../Roles.txt) |
| Proposal | [`../00-proposal/proposal.md`](../00-proposal/proposal.md) |
| Real-user interview INT-01 and hospital documents DOC-01, DOC-02 (REAL) | [`../01-requirements/backlog.md`](../01-requirements/backlog.md#interview-log-pain-source-evidence) |
| Pains found (problem overview) | [`../01-requirements/backlog.md`](../01-requirements/backlog.md#problem-overview-from-int-01-and-doc-01) |
| Review of the problem (SECONDARY, fewer than 5 interviews) | [`../01-requirements/secondary-evidence.md`](../01-requirements/secondary-evidence.md) |
| Product Backlog with MoSCoW | [`../01-requirements/backlog.md`](../01-requirements/backlog.md) |
| MUST tasks locked, plus the v2 update | [`../04-build/scope-lock.md`](../04-build/scope-lock.md) |
| Lean Canvas | Not made (optional) |
| `rule.md` (PDPA and legal) and its traceability | [`../../rule.md`](../../rule.md), [`../03-compliance/legal-requirement-spec.md`](../03-compliance/legal-requirement-spec.md) |
| `CLAUDE.md` (how the team uses AI) | [`../../CLAUDE.md`](../../CLAUDE.md) |

## 2. Build

| Item | File |
|---|---|
| Diagrams v4: use case, ER, sequence, architecture | [`../02-design/diagrams.md`](../02-design/diagrams.md) |
| Architecture (how the parts connect) | [`../02-design/diagrams.md`](../02-design/diagrams.md#4-architecture-diagram), [`deployment.md`](deployment.md) |
| Design: feature list, user journey, prototype | [`../02-design/`](../02-design/) |
| Source code | [`../../app/`](../../app/) |
| Our own tests (15 files) | [`../../app/src/lib/`](../../app/src/lib/) `*.test.ts`, [`../../app/scripts/eval-rule-cases.ts`](../../app/scripts/eval-rule-cases.ts) |
| How to run (setup, `.env.example`, test accounts) | [`../../README.md`](../../README.md#run-it-locally), [`../../app/README.md`](../../app/README.md), [`../../app/.env.example`](../../app/.env.example) |
| No secrets: scan result | [Secret check](#secret-check) below |

## 3. Test

| Item | File |
|---|---|
| Test Plan | [`../04-build/test-plan.md`](../04-build/test-plan.md) |
| Real-user session S01, hospital, 17 Nov 2026 (REAL, qualitative) | [`../../test/sessions/S01-2026-11-17-hospital-uat.md`](../../test/sessions/S01-2026-11-17-hospital-uat.md) |
| No timed real-user test: why, what instead, plan | [`../../test/no-real-user-test.md`](../../test/no-real-user-test.md) |
| Before and after numbers | [`comparison-table.md`](comparison-table.md) |
| SUS / TAM / UTAUT2 results | None collected; see [`../../test/no-real-user-test.md`](../../test/no-real-user-test.md) |
| Issue log (severity, fix commit, retest) | [`../../test/issue-log.md`](../../test/issue-log.md) |
| Test run logs (PROXY) | [`../../test/results/`](../../test/results/) |

## 4. Deliver

| Item | File |
|---|---|
| Case study (Problem, Process, Outcome, live URL) | [`case-study.md`](case-study.md) |
| AI logic (Where, How, Prove, Measure) | [`ai-logic.md`](ai-logic.md) |
| Comparison table, with AI rows | [`comparison-table.md`](comparison-table.md) |
| Role statement: Sutapat Chucham, Product Owner | [`role-statements/6531503085-sutapat.md`](role-statements/6531503085-sutapat.md) |
| Role statement: Sorrawit Thanakhwang, Tech Lead | [`role-statements/6531503080-sorrawit.md`](role-statements/6531503080-sorrawit.md) |
| Role statement: Thiwakorn Boayairuksa, AI Lead | [`role-statements/6631503019-thiwakorn.md`](role-statements/6631503019-thiwakorn.md) |
| Role statement: Nararat Kritphet, Designer | [`role-statements/6631503110-nararat.md`](role-statements/6631503110-nararat.md) |
| Role statement: Neree Booncharoen, QA / Test Lead | [`role-statements/6631503018-neree.md`](role-statements/6631503018-neree.md) |

## 5. Other supporting documents

| Item | File |
|---|---|
| Deployment notes | [`deployment.md`](deployment.md) |
| Where AI is and is not used, limits, what happens when it fails | [`ai-logic.md`](ai-logic.md) |
| Data sources: hospital criteria (DOC-02) | [`../../thresholds/`](../../thresholds/), [`../../intent.md`](../../intent.md) |
| Audit log against Computer Crime Act section 26 | [`../../app/README.md`](../../app/README.md#audit-log-against-rulemd-computer-crime-act-26) |
| User manuals | Uploaded by the hospital admin inside the app at `/admin/manuals` |

## Secret check

Checked on 18 Nov 2026 across all branches and the full git history:
- No `.env` file was ever committed. Only `app/.env.example` exists, with a local example URL.
- No database URL with a password, API key or access token was found in any commit.
- No database file (`*.db`, `*.sqlite`) was ever committed.
- The demo password `mala1234` is public on purpose (synthetic demo accounts). See the limits in
  [`deployment.md`](deployment.md#known-limits-of-the-demo).
