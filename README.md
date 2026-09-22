# MALA Risk Screening

**T-POSE Corp** · Course 1305493 Software Engineering Case Studies, 1/2569 (ADT, Mae Fah Luang University)
Real-world project with the **Primary Care Pharmacy Service, Chiang Rai Prachanukroh Hospital**

> Full detail lives in the file linked under each section.

---

## What's the problem

**Metformin-Associated Lactic Acidosis (MALA)** is an uncommon but severe complication with a high mortality rate (30–50%), caused by Metformin (a widely used blood-sugar medication for type-2 diabetics) building up in the bloodstream when kidney function declines, combined with triggering factors such as dehydration, acute kidney injury (AKI), or an acute flare of a chronic disease.

A review of patient cases in Mueang District, Chiang Rai (FY2023–2025) found that **58% of patients who developed MALA received their Metformin from a primary-care unit** (รพ.สต. / urban health centers) — a point where:
- **There is no standard risk-screening tool**
- **Front-line staff usually don't have clinical knowledge equal to a doctor/professional nurse** (confirmed from a real-user interview)

The result is that deciding which case is "risky" relies on individual judgement — some high-risk patients aren't screened/referred in time, before their condition progresses into the high-mortality MALA.

Full detail (where the disease comes from, problems learned from real front-line interviews) → [`.docs/01-requirements/backlog.md`](.docs/01-requirements/backlog.md#problem-overview-from-int-01-and-doc-01)

## What we're building (Proposed outcome)

A web app for screening MALA risk, for primary-care front-line staff (who may not have deep clinical knowledge) to fill in patient data through the real 13-item form the hospital provided (eGFR, weight/height, Metformin dose, alcohol history, vomiting/diarrhea, reduced intake, NSAIDs, herbal/supplements). A deterministic rule engine checks the Metformin dose against eGFR, computes a MALA risk score, and flags Sick Day Rule triggers — the result is **binary**, not a named tier: it either **alerts** or it doesn't. On an alert, the system notifies the referral hospital immediately, through the app **and** a LINE group at once, and **the doctor/nurse at the hospital takes over caring for the patient themselves** (not send advice back for front-line staff to carry out). Otherwise, the system generates advice (AI-assisted) from whichever flags are active, and front-line staff delivers it to the patient **immediately** — no doctor involved, no waiting. In every case, the data is always sent to the hospital to keep for analysis. Neither the system nor front-line staff decide the treatment approach in place of a doctor.

**MVP (3 core capabilities, locked per roadmap W6):**
1. Screen the patient — Login → search patient → fill the real screening form → run the rule engine → show the result
2. Send every case's data to the hospital to keep for analysis
3. Alert the hospital (app + LINE) on an alert case, or generate instant advice on a no-alert case

**Out of MVP (stretch):** an AI chatbot (real pain source now — still unclear if staff- or patient-facing), AdminDashboard, automatic HOSxP/HIS integration

### User groups

| Group | Role |
|---|---|
| Primary user | รพ.สต. staff / small health-center staff — fills in the screening form |
| Recipient of the alert | Doctor/staff at the referral hospital, reached via the app **and** LINE at once — takes over the patient directly on an alert; no advice sent back |
| Data subject (data in the system) | Type-2 diabetic patients on Metformin at a primary-care unit (sensitive data under PDPA) |

## Repo structure — where to find things

| What you need | Go to |
|---|---|
| Problem, scope, constraints, KPIs, open questions still awaiting an answer from the hospital contact | [`intent.md`](intent.md) |
| Legal requirements (PDPA, Computer Crime Act §26, Electronic Transactions Act §9/26/28) — the agent's compliance rulebook | [`rule.md`](rule.md) |
| The agent's operating rules for this repo (scope, stack, what never to invent, how to work) | [`CLAUDE.md`](CLAUDE.md) |
| Original project document from the hospital | `.docs/01-requirements/โครงการ MALA screening - ศูนย์ข้อมูลยา รพศ ชร.docx` |
| Prototype screens (Claude Design canvas, real 13-item form + binary alert model, still pending real-user testing) | [`.docs/02-design/prototype-v2/`](.docs/02-design/prototype-v2/) |
| Deliverables for the W5 User Validation Gate (proposal, backlog, design draft, compliance) | [`.docs/README.md`](.docs/README.md) |
| Locked scope for this build (MUST/SHOULD/COULD/WON'T) | [`.docs/04-build/scope-lock.md`](.docs/04-build/scope-lock.md) |
| Sprint 0 setup status + steps | [`.docs/04-build/sprint-0.md`](.docs/04-build/sprint-0.md) |
| Team roles | [`Roles.txt`](Roles.txt) |

## Current status

Requirements and design (problem statement, backlog, feature list, user journey, prototype, diagrams,
compliance) are complete; the W5 Gate is passed. Now in **BUILD (W6)**: scope lock and Sprint 0 are
in progress — see `.docs/04-build/` for the current checklist. Real front-line staff interviews are
still ongoing (see the interview log in
[`.docs/01-requirements/backlog.md`](.docs/01-requirements/backlog.md)) — more real interviews
strengthen the requirements, but per the instructor's confirmation (since Sep 9, 2026), the Gate
itself grades evidence of real problems/needs, not a literal headcount.

## Guardrails to hold throughout the project

- **Real users only** — never substitute classmates or a made-up persona for a real user, no matter how short-handed
- **Clinical criteria (risk factors, thresholds, number of result tiers) must come only from the hospital contact/medical team** — the dev team or an AI must never invent them (see open questions in `intent.md`)
- **Every requirement must trace back to a real pain source** (an interview, or a real case from the docx) — if there's no real source yet, mark it `UNVERIFIED`/`BLOCKED` and don't use it to answer the Gate
- **฿0 budget** — free/open-source tools and platforms only
- **Always PDPA-safe** — never use real patient data during dev/demo; use synthetic data (see `rule.md`)
- **The system must never make clinical decisions in place of a doctor** — a doctor must always make the final call

## Team

| Role | Owner |
|---|---|
| Product Owner | Sutapant Chucham |
| Tech Lead | Sorrawit Thanakhwang |
| AI Lead | Thiwakorn Boayairuksa |
| Designer (UX/UI) | Nararat Kritphet |
| QA / Test Lead | Neree Booncharoen |
