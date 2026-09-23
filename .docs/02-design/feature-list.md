# Feature List — MALA Risk Screening (MVP)

v3 — Sep 8, 2026 · based on `.docs/01-requirements/backlog.md` · rebuilt around the real clinical criteria in `thresholds/` (DOC-02) — binary alert model, not 3 named tiers; see `../../intent.md`

## MVP — 3 core capabilities (scope locked by the team)

### 1. Screen the patient

| # | Feature | Epic | Backlog IDs |
|---|---|---|---|
| 1 | Log in with a staff account (RBAC) | Auth & Access | PBI-01, PBI-02 |
| 2 | Search / add a patient | Patient | PBI-03, PBI-04 |
| 3 | 13-item MALA risk screening form (real fields: eGFR, weight/height, Metformin dose, alcohol history, vomiting/diarrhea, reduced intake, NSAIDs, herbal/supplements) | Screening form | PBI-05 |
| 4 | Deterministic rule engine: dose-vs-eGFR check + risk score (eGFR/BMI/alcohol) + Sick Day Rule flags — **not** an AI call | Screening form | PBI-06 |
| 5 | Show the result: which check(s) triggered, or that none did | Result | PBI-07 |

### 2. Send data to the hospital to keep for analysis

| # | Feature | Epic | Backlog IDs |
|---|---|---|---|
| 6 | Send **every case's** screening data to the referral hospital to keep for analysis, always | Data for analysis | PBI-15 |

### 3. Alert the hospital, or give the patient advice — depending on the result

| # | Feature | Epic | Backlog IDs |
|---|---|---|---|
| 7 | **Alert case** (dose fails or risk score ≥2): alert the referral hospital immediately through the app **and** a LINE group, both at once — the hospital's doctor/nurse takes over the patient themselves (front-line staff's role ends there) | Escalation | PBI-08 |
| 8 | **No-alert case**: generate personalized advice (AI-assisted) from the active Sick Day Rule flags, for staff to deliver to the patient immediately — no doctor involved, no waiting | Advice | PBI-16 |

### Shared foundation (compliance — not a core capability, but legally required)

| # | Feature | Epic | Backlog IDs |
|---|---|---|---|
| 9 | Confirm/approve the screening result (e-signature per ETA) | Approval | PBI-11 |
| 10 | Audit log for every access/edit of the data | Compliance | PBI-12 |

## Stretch (out of MVP)

| Backlog ID | Feature | Reason |
|---|---|---|
| PBI-S1 | AdminDashboard (KPIs: % screened, MALA proportion, satisfaction) | Cut from core by team scope-lock decision |
| PBI-S2 | Automatic HOSxP/HIS integration | Waiting on the open question about the รพ.สต.'s existing system |
| PBI-S3 | AI chatbot, patient-facing ("เป็นที่ปรึกษาเมื่อผู้ป่วยไม่สบาย" — DOC-02, Part 3.0) | Has a real pain source now (unlike v2's guess). Confirmed patient-facing — still cut from MVP as a stretch goal, UX/UI not yet designed — see `../../intent.md` |

## Features still BLOCKED (waiting on the hospital contact before detailed design)
Feature 3 needs the alcohol-question shape reconciled between DOC-02's two documents — Feature 4 needs the two scoring documents (point-tally vs. 0–100 Risk Score) reconciled — Feature 7 needs the real LINE group + hospital recipient + in-app notification design — Feature 8 needs real Sick Day Rules wording — see the open questions in `../../intent.md`
