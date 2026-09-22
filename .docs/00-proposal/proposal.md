# Proposal (Updated) — MALA Risk Screening Web Application

Team: T-POSE Corp · 1305493 Software Engineering Case Studies, 1/2569
Version: v3 — Sep 8, 2026 (updated from the real clinical criteria received, DOC-02)
Previous version: v1 was based on the original project document (docx) only — see `intent.md` for full detail

> This document is a summary for the Discover gate only. The source for everything in it is `intent.md` (source of truth) — if you need to update it, edit `intent.md` first, then sync the change here.

## What changed in this version
- Added the first real-user interview (hospital contact, Aug 27, 2026), confirming: a screening result split (initially described as 3 levels — see below), the hospital-alert workflow, the constraint that front-line staff must not decide treatment themselves, and the real user's level of clinical knowledge
- **v2 (Sep 8, 2026, 1st pass) — fixed a workflow misunderstanding:** the earlier version assumed every severe case waits for a doctor's recommendation and front-line staff carries it out themselves. Corrected to: high risk → the hospital takes over the patient directly.
- **v3 (Sep 8, 2026, 2nd pass) — the real clinical criteria arrived (DOC-02: a screening checklist, a rule-engine spreadsheet, and a demo deck from the hospital's own drug information center).** They show a **binary** result — alert vs. no-alert — computed by a **deterministic rule engine** (dose-vs-eGFR check + a risk score from eGFR/BMI/alcohol + Sick Day Rule symptom flags), not the 3 named tiers INT-01 described. Alert case: unchanged, hospital takes the patient over, now confirmed to fire through **both the in-app system and a LINE group** at once. No-alert case: the system generates advice (AI-assisted) and staff delivers it **immediately** — there is no doctor-recommendation wait step at all. The AI chatbot stretch goal now has a real pain source (DOC-02, Part 3.0) instead of being a guess
- **Still not closed:** reconciling DOC-02's own two scoring documents against each other (point-tally vs. 0–100 Risk Score), and confirming whether the hospital contact counts toward the Gate's real-user evidence or is the original project owner. **Closed:** the chatbot is confirmed patient-facing (team decision)

## Problem statement
**Metformin-Associated Lactic Acidosis (MALA)** is an uncommon but severe, high-mortality complication (medical reports put it at 30–50%), caused by Metformin building up in the bloodstream when kidney function declines, combined with contributing factors such as dehydration, acute kidney injury (AKI), or an acute flare of a chronic disease.

A review of patient cases in Mueang District, Chiang Rai (FY2023–2025) found that **58% of patients who developed MALA received the drug from a primary-care unit** (รพ.สต. / urban health centers) — a point where **there is no standard risk-screening tool** and **front-line staff usually don't have clinical knowledge equal to a doctor/professional nurse** (confirmed by the Sep 7, 2026 interview), forcing reliance on individual judgement to decide which patient is at risk and should be referred.

The result is that a number of high-risk patients aren't screened or referred in time, before their condition develops into the high-mortality MALA.

## Target users
| Group | Role | Key trait that affects the design |
|---|---|---|
| Primary user (fills in the screening) | รพ.สต. staff / small health-center staff | **Doesn't need clinical knowledge equal to a doctor/nurse** → needs a guided form, plain language, no need to interpret the result themselves |
| Recipient of the alert | Doctor/staff at the referral hospital (expected: Chiang Rai Prachanukroh Hospital — name pending confirmation), reached via in-app notification **and** a LINE group at once | Alert case: takes over the patient directly, no advice sent back — every case's data is sent for analysis regardless |
| Data subject (data in the system) | Type-2 diabetic patients on Metformin at a primary-care unit | Sensitive data under PDPA — see `rule.md` |

## Proposed outcome
A web app for screening MALA risk that lets front-line staff (who may not have deep clinical knowledge) fill in patient data through a guided 13-item form (the real one from DOC-02: eGFR, weight/height, Metformin dose, alcohol history, vomiting/diarrhea, reduced intake, NSAIDs, herbal/supplements). A deterministic rule engine checks the Metformin dose against eGFR (CPG table), computes a MALA risk score, and flags Sick Day Rule triggers. **If the dose check fails or the risk score reaches the threshold (alert case)**: the system alerts the referral hospital immediately — through the app and a LINE group, both at once — and **the doctor/nurse at the hospital takes over the patient themselves** (front-line staff's role ends there). **Otherwise (no-alert case)**: the system generates personalized advice (AI-assisted) from the active flags, and front-line staff delivers it to the patient immediately — no doctor involved, no waiting. In every case, data is always sent to the hospital to keep for analysis. **The system never decides in place of a doctor, and front-line staff never decides the treatment approach themselves** (matches `rule.md`)

## Scope (MVP, locked W6) — 3 core capabilities
1. **Screen the patient:** Login → search patient → fill the real 13-item screening form → run the rule engine → show the result
2. **Send every case's data to the hospital to keep for analysis**
3. **Alert the hospital (app + LINE) on an alert case, or generate instant advice on a no-alert case**

See `.docs/02-design/feature-list.md` — **Stretch:** an AI chatbot for patients (real pain source, DOC-02 Part 3.0 — confirmed patient-facing), AdminDashboard

## Known gaps (blockers before starting BUILD)
1. DOC-02's own two scoring documents don't reconcile (point-tally threshold ≥2 vs. a single 0–100 Risk Score, threshold 60) — need the hospital contact to confirm which is real
2. The real LINE group + hospital recipient for the pilot area + the in-app notification side's design
3. Number of formal interviews so far = **1** (the hospital contact), plus the original docx (DOC-01) and the real clinical-criteria documents (DOC-02) as additional real evidence — per the instructor's confirmation (since Sep 9, 2026), the Gate grades evidence of real problems/needs, not a literal interview headcount; see full status in `.docs/01-requirements/backlog.md`

Full detail for every topic (constraints, success metrics, open questions) is in `../../intent.md`
