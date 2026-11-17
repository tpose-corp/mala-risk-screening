# Company Charter: T-POSE Corp

Course 1305493 Software Engineering Case Studies, 1/2569, Mae Fah Luang University.
Client: Primary Care Pharmacy Service, Chiang Rai Prachanukroh Hospital.
Product: MALA Risk Screening web app.

## Mission

Give primary-care (รพ.สต.) staff a standard, safe way to screen Metformin patients for MALA risk
and send risky cases to the hospital fast, at zero cost, with the hospital's own clinical criteria.

## Members and roles

Full role descriptions are in [`../../Roles.txt`](../../Roles.txt).

| Role | Name | Student ID | Owns |
|---|---|---|---|
| Product Owner | Sutapat Chucham | 6531503085 | Backlog, priorities, scope lock, link to the hospital contact |
| Tech Lead | Sorrawit Thanakhwang | 6531503080 | Architecture, code quality, repo, deploy |
| AI Lead | Thiwakorn Boayairuksa | 6631503019 | AI tools, AI disclosure, AI-ROI, checking AI output |
| Designer (UX/UI) | Nararat Kritphet | 6631503110 | Screens, prototype, user journey, diagrams |
| QA / Test Lead | Neree Booncharoen | 6631503018 | Test plan, UAT sessions, metrics, issue tracking |

Data Protection Officer: **not named yet** (open gap, see `../03-compliance/legal-requirement-spec.md`).

## Team rules

These are the rules the team has worked by. Each one points to where it is written or enforced.

| # | Rule | Where |
|---|---|---|
| 1 | Clinical criteria come only from the hospital. No member and no AI invents a threshold. | `CLAUDE.md` rule 1, `README.md` Guardrails |
| 2 | The risk result is plain code, never an AI call. A doctor makes every clinical decision. | `CLAUDE.md` rules 2 and 3 |
| 3 | Synthetic data only in development, tests, screenshots and the demo. | `rule.md`, `CLAUDE.md` rule 5 |
| 4 | No secrets in git. Only `.env.example` is committed. | `.gitignore`, `.vercelignore` |
| 5 | Work goes on a branch and reaches `main` through a pull request; `main` is protected. | GitHub branch protection, PR #1 to #28 |
| 6 | AI never commits or pushes on its own; a member runs every git command. | `CLAUDE.md` rule 7 |
| 7 | Disclose AI use whenever AI materially helped. | `CLAUDE.md` rule 8, `.docs/final/ai-logic.md` |
| 8 | Every requirement traces to a real pain source, or is marked UNVERIFIED or BLOCKED. | `README.md` Guardrails, `backlog.md` |
| 9 | Never invent user data. If there is no measurement, write "not measured". | `.docs/04-build/test-plan.md` section 9.1 |
| 10 | Zero budget: free and open-source tools only. | `intent.md` Constraints |
| 11 | Scope changes need the Product Owner's sign-off. | `.docs/04-build/scope-lock.md` "After lock" |
