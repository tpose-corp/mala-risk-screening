# Intent: MALA Risk Screening Web Application

Author: [Student team — 1305493 SE Case Study course]. Status: draft.
Source: โครงการ MALA screening - ศูนย์ข้อมูลยา รพศ ชร.docx (original project document from the Primary Care Pharmacy Service, Chiang Rai Prachanukroh Hospital)

> Note: this file is based primarily on the original project document (docx). Anything in `.docs/02-design/prototype-v2/` (UI screens, confirm/e-signature steps, admin dashboard) is the team's **guess at UI/UX** only, not yet confirmed by the project owner ("พี่" / the hospital contact) — do not cite it as a requirement until confirmed. The underlying screening fields and rule logic now come from the real `thresholds/` documents (see "Real clinical criteria received" below), but the screen layout/wording is still unconfirmed. Open items are collected in "Open questions" below.

## Problem
Metformin-Associated Lactic Acidosis (MALA) is an uncommon but severe, high-mortality complication, usually triggered when a patient has contributing factors such as acute kidney injury (AKI), dehydration, or an acute flare of a chronic disease.

A review of patient cases in Mueang District, Chiang Rai (FY2023–2025) found that **58% of patients who developed MALA received their Metformin from a primary-care unit** (รพ.สต. / urban health centers) — reflecting a gap in risk-screening tools and medication-safety monitoring for Metformin at the primary-care level. There is no easily accessible Clinical Decision Support Tool at the point of care.

## Proposed outcome
Build a web application for screening MALA risk in diabetic patients seen at primary-care units, so medical staff can assess risk and refer patients quickly, to one standard across the whole network — reducing MALA incidence and improving medication safety.

### MVP — 3 core capabilities (revised/confirmed by the team, Sep 8, 2026; result shape revised again same day — see "Confirmed workflow model" below)
1. **Patient screening:** login → search/add patient → fill risk-assessment form → show the result (alert-triggered or not, per the real criteria in `thresholds/`)
2. **Send data to the hospital for analysis:** every case must always be sent to the referral hospital to keep for analysis — a separate requirement from item 3
3. **Alert system to the hospital for risky cases:** when a case crosses the threshold, the system must let the referral hospital know — through the app **and** LINE, at the same time — so it can be managed correctly

**Stretch (out of MVP):** an AI chatbot for patients to ask questions (e.g. about MALA / their medication) — added Sep 8, 2026, replacing AdminDashboard as the primary stretch focus

## Target users / scope
- **System users:** medical staff at รพ.สต. units and urban health centers in the Chiang Rai Prachanukroh Hospital network
- **Data subjects (patients in the system):** type-2 diabetic patients on Metformin seen at primary-care units
- **Geographic scope:** every primary-care unit in the Chiang Rai Prachanukroh Hospital network, Mueang District, Chiang Rai

## Constraints
- **Budget:** none (฿0) — must use only free/open-source tools and platforms, likely hosted on the hospital's own server (consistent with the docx's emphasis on cost-effectiveness / using the hospital's internal resources)
- **Platform:** browser-based web application, on computer or smartphone
- **Timeline:** the team's actual project runs **4 months per the course schedule** (the original docx specifies 12 months, Oct 2026–Sep 2027, which is the hospital's full PDCA timeline, not the dev team's timeline) — need to confirm with the hospital contact how far into the PDCA cycle the team is responsible for delivering within these 4 months (expected focus: Plan + Do — design the criteria with the medical team + build the web app ready for pilot; Check/Act after the pilot is likely outside the student team's scope)
- **Legal:** must comply with PDPA, Computer Crime Act §26, and Electronic Transactions Act §9/26/28 as detailed in `rule.md` (patient data is sensitive data)
- **Risk-assessment criteria (important):** per the docx, the criteria are not yet fixed — the team must "draft risk-assessment criteria and a shared practice guideline together with the medical and pharmacy teams," extracting risk factors from a retrospective case review (eGFR, age, comorbidities, concurrent medications) — **this is the system's core logic and it does not exist in any document yet; it must be obtained directly from the hospital contact**

## Success metrics (from the docx — the project's KPIs, not the software's KPIs, but the system must be able to support measuring them)
| Type | Metric | Target |
|---|---|---|
| Process | % of diabetic patients on Metformin in primary care screened via the web app | ≥ 80% |
| Outcome | Proportion of MALA patients with a history of receiving the drug from primary care | Down to < 30% |
| Quality | % satisfaction of medical staff with the app | ≥ 85% |

## Confirmed by the hospital contact (Sep 7, 2026) — interview at the hospital

> Must confirm before treating as spec: **is this hospital contact the same "พี่" who owns the original project, or a new front-line user (counting as 1 of the 5 people needed for the W5 gate)?** If it's a different person from the project owner, count this as real-user interview #1/5 (still need ≥4 more before Sep 9).

- **End user (confirmed):** front-line staff at small health centers, who **do not need clinical knowledge equal to a doctor or nurse** — this affects UX: the form must be guided/step-by-step, using language that doesn't require the user's own interpretation, minimizing the clinical judgement required of whoever fills it in
- ~~**Screening outcome (confirmed to have 3 tiers):** (1) High risk / severe-emergency (2) Medium risk / severe-needs-follow-up (3) No risk / safe~~ — **superseded Sep 8, 2026, see "Confirmed workflow model" below.** INT-01 described 3 named tiers; the real criteria documents that arrived the same day (`thresholds/`) are binary throughout (exceeds threshold → alert, else → record + advice), with no separately-named middle tier anywhere. The team reviewed this discrepancy and went with the binary model from the real documents — the 3-tier language is kept here, struck through, as a record of what changed and why, not as current spec
- ~~**Workflow split by tier**~~ — **superseded Sep 8, 2026, folded into "Confirmed workflow model" below.** The referral hospital's name is still not confirmed — expected to be Chiang Rai Prachanukroh Hospital per the original docx

## Confirmed workflow model (binary, Sep 8, 2026 — this is the current spec, supersedes the 3-tier bullets above)

- **Result shape:** binary, not 3 named tiers. The screening form computes several independent checks straight from `thresholds/MALA outline prg.xlsx` (see "Real clinical criteria received" below for the exact rules): a dose-vs-eGFR (CPG) check, a MALA risk score (eGFR/BMI/alcohol, threshold ≥2), and symptom/AKI-trigger flags (vomiting/diarrhea, reduced intake, NSAIDs, herbs/supplements). If the dose check fails or the risk score crosses the threshold → **alert**. Otherwise → **no alert**, but any active symptom/AKI flags still produce Sick Day Rules advice.
- **Alert case:** the system alerts the referral hospital **immediately** — through the in-app notification system **and** a LINE group, both, at the same time (team-confirmed Sep 8, 2026) — and then **the doctor/nurse at the hospital takes over managing the patient themselves**, not send a recommendation back for front-line staff to carry out. Front-line staff's role ends at the alert step (kept from the earlier decision, re-confirmed Sep 8, 2026 even though the hospital's own demo deck depicts advice being sent back instead — see "Contradiction found and resolved" below).
- **No-alert case:** the system generates personalized advice (Sick Day Rules etc. per whichever Part 3.0/4.0 flags are active) from the computed flags, and front-line staff delivers it to the patient **immediately** — no doctor involved, no waiting, no separate "receive recommendation" screen. This replaces the earlier "medium/no risk → wait for a doctor's recommendation" design — **done (Sep 8, 2026):** `.docs/02-design/prototype-v2/Recommendation.dc.html` was rebuilt into an "instant AI-generated advice" screen (no waiting state, no doctor) to match.
- **Every case, alert or not:** gets sent to the referral hospital to keep for analysis (unchanged from before).
- **Risk calculation approach (confirmed by the team, Sep 8, 2026):** the score/threshold checks themselves are a **deterministic rule engine** (plain arithmetic per the hospital's own formula), not an AI/LLM call — reproducible, auditable, free, and keeps the clinical-decision ownership traceable to the hospital's stated criteria rather than an opaque model. **AI (LLM) is used only for:** (a) turning the computed flags into personalized, readable advice text for the no-alert case (matches the demo's "AI GENERATED" advice card), (b) the Part 3.0 chatbot, and optionally (c) OCR to read the HN off a photo of the patient's booklet (demo screen 1/7) — a convenience feature, not safety-critical.
- **Scope of front-line staff's decision-making (confirmed — matches `rule.md`):** must never decide the treatment approach themselves, in any case — whether it's a case the hospital takes over directly (high risk) or a case where they must follow the doctor's recommendation (other tiers) → confirms the `rule.md` constraint "the system/user must never make clinical decisions themselves; a doctor must always make the final call"
- **Dashboard for viewing the data kept for analysis: still unconfirmed.** The team itself isn't sure it's needed — consistent with `roadmap.md` already parking AdminDashboard as a stretch goal, not core MVP (see "Feature scope" below). Storing data in the DB with query/export support is enough for MVP for now
- **Patient identification for Add Patient (confirmed by the team, Sep 8, 2026):** use **HN (hospital number)** instead of national ID to reduce sensitive-data exposure; minimum field set = name + date of birth (required, to prevent matching the wrong patient — common Thai names repeat often) + HN (optional, if the patient already has one) + sex + facility (auto-filled). On the hospital side, matching is done by a **human** (looking the patient up by name/HN) — no automated integration/matching is required for MVP
- **RiskResult vs. Confirm — when the alert actually fires (confirmed by the team, Sep 8, 2026):** the alert/referral for a high-risk result must fire **immediately when the result screen is shown**, not wait for the separate Confirm/e-signature step — an emergency case cannot afford that delay. Confirm is purely the ETA §9 e-signature/approval step that closes out the record for legal/audit purposes, and happens after the tier-specific path (referral, or recommendation-and-follow) is done, for every tier

## Real clinical criteria received (Sep 8, 2026 — from `thresholds/`, source of truth for spec.md)

> Three files arrived from the hospital contact: `MALA_Screening_Checklist.docx` (the real 13-question screening form), `MALA outline prg.xlsx` (the scoring/action rules), and `MALA-risk screening web app with-demo-slides.pdf` (a demo deck by วรางคณา งานดี, ศูนย์ข้อมูลยาและเภสัชสนเทศ รพ.เชียงรายประชานุเคราะห์). This **replaced** the earlier guessed criteria — **done (Sep 8, 2026):** `.docs/02-design/prototype-v2/RiskForm.dc.html` was rebuilt with the real 13-item form from this section, not the old "eGFR/creatinine/comorbidities" placeholder list. (The original guessed `prototype/03-RiskForm.dc.html` no longer exists — that whole first prototype set was removed from the repo.)

**The screening form (13 items):** HN, name, sex, age, weight, height, latest eGFR (mL/min/1.73m², pulled from the hospital HIS per the demo), current Metformin dose (mg/day), then a risk-screening section — detailed alcohol history (do they drink → binge in one sitting: male >5/female >4 standard drinks within 2 hrs → regular heavy drinking: male >15/female >8 standard drinks per week, with a reference table of standard-drink equivalents per beverage type), recent vomiting/diarrhea, reduced food intake for 1–2 days, NSAID use, herbal medicine/supplement use. The demo's actual UI simplifies the alcohol question to 4 discrete levels (none / occasional ≤1x/week / regular ≥3x/week / heavy ≥5 drinks/session or daily) rather than the checklist's raw yes/no + follow-ups — **the two documents don't fully agree on the alcohol question's exact shape**, needs reconciling.

**The rule engine (`MALA outline prg.xlsx`, "draft") — 4 independent parts, not one 3-tier scale:**
1. **Part 1.0 (CPG dose check):** eGFR ≥45 → dose should be ≤2000mg; eGFR 30–44 → ≤1000mg; eGFR <30 → Metformin contraindicated. Mismatch → consult a doctor to adjust the dose → **system auto-alerts the responsible doctor**
2. **Part 2.0 (MALA risk score, research-based):** eGFR <60 = 1 point, BMI <23 = 2 points, heavy alcohol history = 2 points → **score ≥2 = "MALA risk group"** → close monitoring, adjust/hold Metformin, advise alcohol cessation, advise Sick Day Rules → system stores the at-risk patient pending clinical handling
3. **Part 3.0 (symptom triggers):** vomiting/diarrhea present, or temporary malnutrition present → advise Sick Day Rules → system prompts the screener to give that advice; **a chatbot is named here** ("มี chat bot ที่สามารถให้คำแนะนำหรือเป็นที่ปรึกษาเมื่อผู้ป่วยไม่สบาย") — this is the first real pain source for the chatbot idea (see PBI-S3 in the backlog), though it's still unclear whether it's staff-facing or patient-facing (see open question below)
4. **Part 4.0 (AKI-inducing factors, evidence-based):** NSAID use present → advise Sick Day Rules; herbal/supplement use present → system stores the data for tracking inappropriate health-product use in the area

**The demo's illustrated UX (`*-demo-slides.pdf`) shows a single composite "Risk Score"** (e.g. 72/100 against a threshold of 60) rather than the outline's separate point tallies — **the demo and the outline spreadsheet don't obviously reconcile**; treat both as draft until the hospital contact confirms which is the real model (or how they combine).

**Alert channel — confirmed dual-channel (team, Sep 8, 2026):** every alert fires through **both** the in-app notification system **and** a LINE group at the same time — not LINE alone. The demo shows the LINE side: alerts land in a group ("กลุ่มแจ้งเตือน MALA · เครือข่ายอำเภอเมือง", ~12 members: doctors/pharmacists/nurses/รพ.สต. staff) as an auto-posted card (patient, abnormal values, suggested action) with "เปิดเคสในระบบ" / "รับเรื่องแล้ว" buttons. The in-app side (a notification/inbox the hospital team also sees inside the web app itself) is not detailed in any source document yet — still needs designing. `.docs/02-design/diagrams.md`'s architecture diagram needs updating to show both channels, not just the generic "Notification Service" it has now.

**Contradiction found and resolved with the team (Sep 8, 2026):** the demo deck's own flow (slide "หน้าจอ 7/7") shows the hospital team reviewing the LINE alert and sending advice **back** to รพ.สต. staff while the patient stays there — the opposite of "the hospital takes the patient over directly." The team was asked directly and **confirmed keeping the earlier decision**: high risk → the hospital takes the patient over, front-line staff's role ends at the alert. This overrides what the demo slide happens to depict — **flag this explicitly if it ever goes back to the hospital contact**, since their own demo material shows the other behavior and the discrepancy hasn't been explained yet.

### Still open after this document
- **Reconcile the two scoring documents** — the outline's per-factor point tally (threshold ≥2) vs. the demo's single 0–100 Risk Score (threshold 60): are they the same model shown two ways, or does one supersede the other?
- ~~Does a genuine middle "medium risk" tier still exist?~~ — **answered (team, Sep 8, 2026):** no, go with the binary model per `thresholds/` — see "Confirmed workflow model" above. Still worth asking the hospital contact directly why INT-01 described 3 tiers, in case there's a nuance the written documents don't capture yet
- **Is Part 1.0's dose-mismatch alert the same LINE alert as Part 2.0's risk-score alert, or a separate one?** Both name "the responsible doctor" as the recipient but aren't explicitly said to be one unified alert
- **Is the Part 3.0 chatbot staff-facing or patient-facing?** The demo's advice screen (slide 11) is clearly staff-facing ("เจ้าหน้าที่ให้ความรู้เฉพาะรายได้ โดยไม่ต้องจำแนวทางทั้งหมด"); Part 3.0's wording ("เป็นที่ปรึกษาเมื่อผู้ป่วยไม่สบาย") could mean either the chatbot advises staff, or patients use it directly — changes the chatbot's whole UX if answered either way
- Has this criteria been endorsed/signed off by a doctor/pharmacist body, or is it still this one person's (วรางคณา งานดี) draft — the outline itself is titled "draft"

### Hospital alert mechanism — mostly answered, remaining gaps
- ~~Through what channel~~ — **answered:** in-app notification **and** LINE group, both, always (see above) — the in-app side's actual design (inbox? push? who sees it?) is still undefined
- Which referral hospital / LINE group is the real one for the team's pilot area (the demo says "เครือข่ายอำเภอเมือง" — is that the same Chiang Rai Prachanukroh Hospital network already assumed elsewhere in this doc?)
- Is there an SLA/response time if no one in the LINE group acknowledges ("รับเรื่องแล้ว") in time — the demo doesn't show a fallback
- Whether "เปิดเคสในระบบ" (open case in system) from the LINE card is a separate action from the app's own referral/confirm flow, or the same thing surfaced two places

### Existing systems/data
- What system does the รพ.สต. currently use to record patient data / eGFR test results (paper, HOSxP, another HIS) — does data need to be pulled automatically, or does staff enter everything manually
- **Partially answered (Sep 8, 2026):** every screening result must be sent to Chiang Rai Prachanukroh Hospital (assumed to be the same referral hospital that receives referrals — needs confirming the name) to always be kept for analysis (see PBI-15 in `.docs/01-requirements/backlog.md`) — **still don't know the format/endpoint/frequency required** (real-time per case, or a batch cycle), and haven't checked whether a data-sharing agreement between organizations is required under PDPA (see the gap noted in `.docs/03-compliance/legal-requirement-spec.md`)
- Does the system need to connect/exchange data with the Chiang Rai Prachanukroh Hospital system, or other primary-care units

### Users / access rights (workflow not specified in the docx)
- Who fills in the assessment data (nurse/pharmacist/other), who approves the result / decides on referral
- Is a "confirm/e-signature" step required by law (ETA), or is just recording who performed the action enough
- What does "refer" actually mean — refer to where, through what channel (system, phone, referral letter)

### Feature scope
- Is a dashboard/report needed to track the 3 KPIs above (who views it, how often) — needed for the "Check" phase of the PDCA cycle mentioned in the docx
- Is a user manual/training material needed as part of the dev team's deliverable (the docx mentions "producing a test and a manual")
- Within the team's 4 months, must delivery reach an actual pilot test (piloted at 1-2 units), or is delivering a deploy-ready system for the hospital to trial themselves enough
- **AI chatbot for patients to ask questions (added Sep 8, 2026, stretch):** there is still no pain source from a real user backing this need — must ask the hospital contact / real patients what they'd actually want to ask (about MALA / medication / appointments?), and because this feature talks to patients directly, must check PDPA / the risk of giving clinical information that hasn't gone through a doctor before designing it (risk of conflicting with the `rule.md` constraint "the system must never make clinical decisions in place of a doctor" if designed poorly)

### Hosting/Deploy
- "Likely to be hosted through the hospital" — need to confirm what server/IT the hospital actually has (on-premise, the hospital's own cloud, or none yet and needs a recommendation) in order to choose a stack that can actually be deployed on a ฿0 budget

### Responsibility/legal
- Who is the project's Data Protection Officer (`rule.md` requires someone be responsible)
- When does the patient sign the consent/privacy notice — does one already exist in the primary-care process, or does it need to be built into the system
