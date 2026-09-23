# CLAUDE.md — how an AI agent works in this repo

This file is the agent's rulebook for **MALA Risk Screening** (T-POSE Corp, course 1305493).
Read this, `rule.md`, and `.docs/04-build/scope-lock.md` before writing any code here.

## What this project is

A web app for primary-care staff (รพ.สต.) to screen type-2 diabetic patients on Metformin for
MALA (Metformin-Associated Lactic Acidosis) risk, using a **deterministic rule engine** built from
the hospital's real clinical criteria — not an AI/LLM judgment call. Full context: `README.md`,
`intent.md`.

## Hard constraints — never violate these

1. **Never invent clinical criteria.** Risk factors, thresholds, scoring, and the number of result
   tiers come only from the hospital's clinical team (source docs in `thresholds/`, confirmed in
   `intent.md`). If a clinical value isn't already written down and confirmed in `intent.md` or
   `.docs/01-requirements/backlog.md`, treat it as unknown — ask, don't guess.
2. **The MALA risk calculation is deterministic code, not an LLM call.** Team-confirmed
   (`intent.md`, PBI-06): dose-vs-eGFR check, risk-score formula, Sick Day Rule flags are all
   plain, unit-testable functions. AI/LLM use is limited to generating the *advice text* shown to
   staff after the deterministic result is already computed (PBI-16) — never to computing the
   result itself.
3. **A human medical professional always makes the final clinical call.** The system may alert,
   score, or flag — it must never autonomously approve, reject, or recommend stopping/adjusting
   Metformin. See `rule.md` (ETA §9/26/28 section) before touching the confirm/approve flow.
4. **Follow `rule.md` for anything touching patient data, auth, logs, or approval actions.** PDPA,
   Computer Crime Act §26, and ETA §9/26/28 rules there are binding in BUILD, not just DISCOVER —
   don't drop them because coding has started.
5. **Synthetic data only.** Never hard-code, log, or commit real patient data, real national IDs,
   or the real hospital contact's identifying details. Dev/test/demo data must be fake.
6. **Stay inside the locked scope.** The current MUST list lives in
   `.docs/04-build/scope-lock.md`. If a request would add a new MUST mid-sprint, don't just build
   it — flag it as a scope-creep risk and say it belongs on the SHOULD/COULD/WON'T list instead
   (see that file for the team's agreed response).
7. **Never commit, push, or otherwise upload anything to GitHub for this project on your own —
   not even with in-the-moment approval.** Always show the exact steps/commands and let a team
   member run them. This includes commits, pushes, PRs, issues, and permission changes.
8. **Disclose AI use.** When AI materially helped write a design, a rule, or code, say so — don't
   let AI-authored content pass as unremarked team output (course policy, see `Roles.txt` — AI
   Lead owns this).

## Tech stack constraints

- **฿0 budget** — free/open-source tools only.
- Likely hosted on the hospital's own server — avoid stacks that assume a paid managed platform
  the hospital can't run.
- One-month build, one team, no dedicated ops — per the W6 architecture guidance, prefer a single
  well-structured app ("modular monolith") over microservices or custom infra.

## Where things are

| Need | File |
|---|---|
| Problem, scope, constraints, open questions | `intent.md` |
| Legal/compliance rules | `rule.md` |
| Product backlog (full detail, traceability) | `.docs/01-requirements/backlog.md` |
| Current locked scope (MUST/SHOULD/COULD/WON'T) | `.docs/04-build/scope-lock.md` |
| Sprint 0 status / setup checklist | `.docs/04-build/sprint-0.md` |
| Team roles | `Roles.txt` |
| Design (feature list, user journey, prototype, diagrams) | `.docs/02-design/` |

## Working style

- Don't answer open questions in `intent.md` yourself — they're marked open because they need the
  hospital contact or the team, not a guess.
- When something is `BLOCKED` in the backlog, don't quietly unblock it by assuming an answer;
  surface the block.
- Keep commits small and scoped to one backlog item where practical (helps traceability back to
  PBI IDs).
