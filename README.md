# MALA Risk Screening

**T-POSE Corp** · Course 1305493 Software Engineering Case Studies, 1/2569 (ADT, Mae Fah Luang University)
Real-world project with the **Primary Care Pharmacy Service, Chiang Rai Prachanukroh Hospital**

**Live demo:** https://mala-risk-screening.vercel.app
**Final evidence index:** [`.docs/final/README.md`](.docs/final/README.md)

> **Demo only. Synthetic data only.** Never enter a real patient's name, HN, or lab values into the
> demo site. It is public and is not the hospital's system (PDPA, see [`rule.md`](rule.md)).
> Demo accounts are listed in [`app/README.md`](app/README.md#run-it).

## Current status (18 Nov 2026)

**DELIVER phase.** Hospital staff tried the Alpha on **17 Nov 2026** (session S01) and asked for 11
changes. All 11 are built in **v2** (PR #28) and deployed on Vercel + Neon. Every claim and number
for the final presentation links to a file from [`.docs/final/README.md`](.docs/final/README.md).

## The problem

**Metformin-Associated Lactic Acidosis (MALA)** is an uncommon but severe complication (30–50%
mortality). It happens when Metformin builds up as kidney function declines, often with a trigger
such as dehydration or acute illness.

A review of cases in Mueang District, Chiang Rai (FY2023–2025) found that **58% of patients who
developed MALA got their Metformin from a primary-care unit** (รพ.สต. / urban health centers). These
units have **no standard risk-screening tool**, and front-line staff usually lack a doctor's clinical
training, so high-risk patients can be missed.

Full detail → [`.docs/01-requirements/backlog.md`](.docs/01-requirements/backlog.md#problem-overview-from-int-01-and-doc-01)

## What the system does

Front-line staff fill in the hospital's real 13-item screening form. A **deterministic rule engine**
(plain code, no AI) checks the Metformin dose against eGFR, computes the MALA risk score, and flags
Sick Day Rule triggers. The result is binary: **alert** or **no alert**. A doctor always makes the
clinical decision.

| Built and working (v2) | Not built (out of current scope) |
|---|---|
| Three roles: รพ.สต. staff (own unit only), hospital clinicians (all units, read-only, no export), hospital admin | LINE alerts to the hospital |
| Patients keyed by 13-digit national ID; a patient of another unit is refused | AI-generated advice text |
| New patients wait for the admin to verify and add the HN | Patient chatbot |
| 13-item screening form, editable until confirmed, then locked | Automatic HIS / HOSxP data import |
| Rule engine from the hospital's MALA outline; thresholds editable by the admin as versions | Multi-factor login, consent notice |
| Result in plain Thai, Sick Day advice from the hospital outline | |
| Staff confirmation (who, when, rule version); admin amendments with reason and history | |
| Hospital side: two alert tabs (over-dose first), acknowledge, follow-up note, case history, NSAID and herbal summary per area | |
| Admin back office: overview, accounts, units, patients, criteria, settings, manuals, CSV export | |
| Append-only audit log with admin viewer (CCA §26) | |
| 165 unit tests, 11 of 11 rule cases ([`test/results/`](test/results/)) | |

Locked scope → [`.docs/04-build/scope-lock.md`](.docs/04-build/scope-lock.md)

## Run it locally

Requires Node.js 20 or later.

```bash
cd app
npm install
npm run db:local             # local PostgreSQL, prints a postgres:// URL
cp .env.example .env         # paste that URL into DATABASE_URL
npx prisma migrate deploy
npx prisma db seed           # demo accounts, password mala1234
npm run dev                  # http://localhost:3100
npm test                     # unit tests
```

Full setup, demo accounts, and code map → [`app/README.md`](app/README.md).
Deploy notes → [`.docs/final/deployment.md`](.docs/final/deployment.md).

## Where to find things

| What you need | Go to |
|---|---|
| **Final evidence index (start here)** | [`.docs/final/README.md`](.docs/final/README.md) |
| Web app source code | [`app/`](app/) |
| Problem, scope, constraints, KPIs, open questions for the hospital | [`intent.md`](intent.md) |
| Legal requirements (PDPA, Computer Crime Act §26, Electronic Transactions Act §9/26/28) | [`rule.md`](rule.md) |
| Rules for AI agents working in this repo | [`CLAUDE.md`](CLAUDE.md) |
| Proposal, backlog, design, compliance (W5 Gate deliverables) | [`.docs/README.md`](.docs/README.md) |
| Locked scope (MUST / SHOULD / COULD / WON'T) | [`.docs/04-build/scope-lock.md`](.docs/04-build/scope-lock.md) |
| Test Plan (TEST phase) | [`.docs/04-build/test-plan.md`](.docs/04-build/test-plan.md) |
| Test sessions, issue log, test run logs | [`test/`](test/) |
| Company Charter | [`.docs/00-proposal/company-charter.md`](.docs/00-proposal/company-charter.md) |
| Sprint 0 setup record | [`.docs/04-build/sprint-0.md`](.docs/04-build/sprint-0.md) |
| Click-through prototype | [`.docs/02-design/prototype-v2/mala-user-journey.html`](.docs/02-design/prototype-v2/mala-user-journey.html) |
| Original project document from the hospital | `.docs/01-requirements/โครงการ MALA screening - ศูนย์ข้อมูลยา รพศ ชร.docx` |

## Guardrails

- **Real users only.** Never substitute classmates or a made-up persona for a real user.
- **Clinical criteria come only from the hospital's clinical team.** The dev team or an AI never invents them.
- **Every requirement traces back to a real pain source.** If there is none yet, mark it `UNVERIFIED` or `BLOCKED`.
- **฿0 budget.** Free and open-source tools only.
- **PDPA-safe.** Synthetic data only in development, testing, and the demo.
- **No clinical decisions by the system.** A doctor always makes the final call.

## Team

| Role | Owner |
|---|---|
| Product Owner | Sutapat Chucham |
| Tech Lead | Sorrawit Thanakhwang |
| AI Lead | Thiwakorn Boayairuksa |
| Designer (UX/UI) | Nararat Kritphet |
| QA / Test Lead | Neree Booncharoen |
