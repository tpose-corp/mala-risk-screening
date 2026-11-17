# Comparison table: before and after

Rules used here: a number appears only if a file in this repo measured it. "Not measured" means
no one measured it; it is not zero. With no fair baseline, the Before cell says why instead of a
number (`test-plan.md` section 9.1).

| Item | Before | After | Change | Measured with | Evidence |
|---|---|---|---|---|---|
| Standard MALA screening tool at รพ.สต. | None | 13-item form with rule engine, live | New tool | Hospital document review | DOC-01 in [`backlog.md`](../01-requirements/backlog.md), [`rules.ts`](../../app/src/lib/rules.ts) |
| Rule cases giving the hospital's expected result | No tool to test | 11 of 11 | Not comparable | Eval script against hand-checked expected results | [`rule-cases-2026-11-18.md`](../../test/results/rule-cases-2026-11-18.md) |
| Automated tests passing | Not recorded for the Alpha | 165 of 165 (15 files) | Not comparable | vitest | [`unit-tests-2026-11-18.txt`](../../test/results/unit-tests-2026-11-18.txt) |
| Hospital change requests from S01 built | 0 of 11 (Alpha, 17 Nov) | 11 of 11 (v2) | +11 | Issue log, fix commits | [`issue-log.md`](../../test/issue-log.md) section A |
| User roles with separate access | 3 roles, any doctor could export | 3 roles: pcu own unit only, clinician read-only no export, admin | Matches F-01 | Code review, `session.ts` | `f2824dd`, [`issue-log.md`](../../test/issue-log.md) F-01 |
| Live log in time | 9.13 s (server in USA) | 1.00 s and 0.54 s (Singapore, 2 runs) | About 9 to 17 times faster | Playwright timing | [`live-speed-2026-11-18.md`](../../test/results/live-speed-2026-11-18.md) |
| Screening time per case by real staff | Not measured | Not measured | None | Planned: UAT-S1 to S3 | [`no-real-user-test.md`](../../test/no-real-user-test.md) |
| Risk judged correctly by real staff | Not measured | Not measured | None | Planned: test plan 9.1 | [`no-real-user-test.md`](../../test/no-real-user-test.md) |
| SUS score | Not measured | Not measured | None | Planned: test plan 9.2 | [`no-real-user-test.md`](../../test/no-real-user-test.md) |
| **AI row:** AI in the risk decision | None | None | No change, by design | Rule cases and code review | [`ai-logic.md`](ai-logic.md), [`rule-cases-2026-11-18.md`](../../test/results/rule-cases-2026-11-18.md) |
| **AI row:** time to build with AI | Not measured (no fair baseline without AI) | Not measured | None | None | [`ai-logic.md`](ai-logic.md) section 4 |
