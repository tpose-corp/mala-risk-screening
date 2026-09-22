# Legal Requirement Spec — traced from W2 (PDPA / Computer Crime Act §26 / ETA §9,26,28)

v1 — Sep 7, 2026 · Source of truth: `rule.md` (written from the W2 session — AI Ethics, PDPA, IT Law)

This document acts as a **traceability matrix**: every rule in `rule.md` must trace to the backlog item that implements it, to prove compliance isn't dropped during BUILD.

## PDPA

| Rule from rule.md | Backlog item that implements it | Notes |
|---|---|---|
| Role-based RBAC, least-privilege | PBI-01, PBI-02 | |
| Data minimisation — collect only data needed for the MALA assessment | PBI-04, PBI-05 | Needs the real risk-factor list before the form's fields can be finalized |
| Privacy notice + consent (if consent is used as the legal basis) | PBI-13 | BLOCKED — waiting on the hospital contact to answer the open question in intent.md |
| Must not expose patient data through a public URL/log | PBI-12 (audit log must be redacted) | |
| Encrypt data in transit/at rest | (architecture — see the RBAC/Auth layer in `.docs/02-design/diagrams.md`) | Must be specified in the tech stack during the Architecture studio, W7 |
| Synthetic data in dev/test | (engineering practice — not a backlog item, a team working rule) | Enforced throughout BUILD/TEST |
| Data Protection Officer | (team governance — must name someone in Roles.txt) | **Gap — no DPO has been named in Roles.txt yet** |
| Sending patient data across organizations (รพ.สต. → referral hospital for analysis) requires a legal basis/inter-organization agreement | PBI-15 | **New gap, Sep 8, 2026** — the "send every case's data to the hospital for analysis" requirement was only just confirmed as a core capability; whether a data-sharing agreement/legal basis is needed for this cross-organization transfer hasn't been checked yet — needs discussing with the hospital contact |
| Notify the PDPC within 72 hours in the event of a breach | *No backlog item yet* | Out of MVP scope, but a documented process is still needed (not an in-app feature) |

## Computer Crime Act §26

| Rule from rule.md | Backlog item that implements it | Notes |
|---|---|---|
| Keep traffic/access logs ≥90 days | PBI-12 | |
| Log every login/logout, patient-data access, and creation/edit of a screening result | PBI-12 (covers every event in the sequence diagram) | |
| Logs cannot be edited/deleted by a regular user | PBI-12 + PBI-02 (RBAC) | |
| Never log a password/token | PBI-01 (must be stated as an explicit non-goal when designing auth) | |

## Electronic Transactions Act §9 / 26 / 28

| Rule from rule.md | Backlog item that implements it | Notes |
|---|---|---|
| The "approve/confirm" button must record the approver's identity + timestamp + the approved document | PBI-11 | |
| The system must never auto-approve a screening result in place of a doctor | PBI-06 (the rule engine is deterministic per the hospital's own stated criteria, clearly separated in the UI from "human approval") | Matches what INT-01 confirmed; reinforced Sep 8, 2026 by the team's decision to keep the rule engine as plain code, not an AI/LLM call — see `../../intent.md` "Risk calculation approach" |
| A doctor must be the one giving the final recommendation, not the system | PBI-08 (alert case — the hospital takes the patient over directly, instead of the system/front-line staff deciding) | Matches what INT-01 confirmed directly — **this is exactly where the legal requirement and the real user pain meet** (fixed Sep 8, 2026, 2nd pass: the model is now binary per DOC-02, not 3 tiers — the old PBI-09, "medium/no risk → doctor sends a recommendation," is superseded; the no-alert case now gets AI-assisted advice under PBI-16 with no doctor in the loop at all — worth double-checking this still satisfies ETA §9's "a doctor gives the final word" intent, since AI-generated advice for the no-alert case was never reviewed by a doctor per-case, only the underlying Sick Day Rules were doctor-authored in general) |
| Editing an already-signed document must create a new version, traceably | PBI-14 | |
| No staff member may sign on another's behalf; must authenticate before signing | PBI-01, PBI-11 | |

## Gaps to close before implementation begins
1. PBI-13 (consent/privacy notice) still BLOCKED — waiting on the hospital contact to answer whether an existing process already covers this
2. Name a DPO in `../../Roles.txt` — no one has been named yet
3. **New, Sep 8, 2026:** legal basis/agreement for sending patient data from รพ.สต. to the referral hospital for analysis (PBI-15) — not checked at all yet

Linked to: `../../rule.md` (the original rules, repo root as of Sprint 0/W6), `../01-requirements/backlog.md` (the full backlog), `../00-proposal/proposal.md`
