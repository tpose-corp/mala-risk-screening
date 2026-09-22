# .docs — W5 User Validation Gate deliverables

T-POSE Corp · MALA Risk Screening · prepared Sep 7, 2026 (Gate: Sep 9, 2026)

> **W6 Sprint 0 docs (scope lock, setup checklist) live in [`04-build/`](04-build/), not here** —
> this folder is frozen as the Gate submission record.

## The 4 deliverables the course requires in full

| # | Required | File |
|---|---|---|
| 1 | Updated Proposal (problem statement + target users) | `00-proposal/proposal.md` |
| 2 | Product Backlog | `01-requirements/backlog.md` |
| 3 | Design draft (feature-list, user-journey, prototype, 4 diagrams) | `02-design/feature-list.md`, `02-design/user-journey.md`, `02-design/prototype.md`, `02-design/diagrams.md` |
| 4 | Compliance (rule.md + legal requirement spec traced from W2) | `../rule.md` (moved to repo root at Sprint 0, W6) + `03-compliance/legal-requirement-spec.md` |

> **Update:** the instructor confirmed, since Sep 9, 2026, that the Gate does not require a literal
> ≥5 interview headcount — what's graded is real, evidence-backed problems/needs from primary-care
> staff, which the team has (INT-01 + DOC-01 + DOC-02). The "❌ 1/5" line below is the historical
> snapshot from the actual Sep 8 submission (written before that confirmation); see
> `.docs/01-requirements/backlog.md` for the corrected framing going forward.

## Current Pass/Fail readout (Sep 8, 2026)

| Criterion | Status |
|---|---|
| ≥5 real users interviewed | ❌ **1/5** — need ≥4 more interviews before Sep 9 (see the interview log in `01-requirements/backlog.md`) — a problem-overview writeup from INT-01 has been added, but **it does not count toward the headcount** |
| All 4 diagrams complete | ✅ complete in `02-design/diagrams.md` (v3, binary alert model) + an editable `.drawio` copy at `02-design/mala-diagrams.drawio` |
| Every requirement traces back to a real pain point | 🔶 traceability exists for every item, now grounded in the real criteria from DOC-02 (`thresholds/`) as well as INT-01/DOC-01 — but the real-user headcount is still short |

**Summary: all 4 documents are complete and now reflect the real clinical criteria + binary alert model, but the Gate will not pass if the real-user interview count hasn't reached 5 by Sep 9 — this is the one remaining blocker**

## Immediate next steps
1. Schedule/conduct interviews with ≥4 more real front-line staff at รพ.สต./health centers, then update the interview log + the backlog items still BLOCKED
2. Reconcile DOC-02's own two scoring documents (point-tally threshold ≥2 vs. the demo's 0–100 Risk Score) with the hospital contact — blocks finalizing PBI-06
3. Confirm the real LINE group + hospital recipient for the pilot area, and design the in-app notification side (blocks PBI-08, PBI-16)
4. Name a DPO in `../Roles.txt` (compliance gap)
5. Check the legal basis for sending patient data across organizations to the referral hospital (PBI-15 — see `03-compliance/legal-requirement-spec.md`)
6. ~~Confirm whether the Part 3.0 chatbot (PBI-S3) is staff-facing or patient-facing before designing it~~ — **answered:** patient-facing (see `../intent.md`)

> **Sep 8, 2026, 2nd pass:** the real clinical criteria arrived (`thresholds/`, DOC-02) and replaced the 3-tier model from the 1st pass. The result is now **binary**: a deterministic rule engine (dose-vs-eGFR + risk score + Sick Day flags — not AI) decides alert vs. no-alert. Alert → the hospital takes the patient over, notified through **both the app and a LINE group** at once. No-alert → AI-assisted advice is generated and delivered by staff immediately, no doctor involved. Every case's data still goes to the hospital for analysis (PBI-15). PBI-09 (the old "doctor sends a recommendation" story) is superseded by PBI-16. The prototype (`02-design/prototype-v2/`) and a Figma copy (https://www.figma.com/design/L0YyF578hAPHRHlGUICkAf) were rebuilt to match — see detail in `../intent.md` and `02-design/prototype.md`
