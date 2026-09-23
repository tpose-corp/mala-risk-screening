   # User Journey — MALA Risk Screening

v3 — Sep 8, 2026 · Pain source: INT-01 (hospital contact, Sep 7, 2026) + DOC-01 (original project document) + DOC-02 (real clinical criteria, Sep 8, 2026)
Fixed from v2: v2 modeled 3 named risk tiers with a doctor-recommendation-and-wait step for the lighter two. DOC-02 (the real criteria that arrived the same day) shows a **binary** model instead — alert vs. no-alert — with AI-generated advice delivered instantly for the no-alert case, no doctor loop.

## Main journey — front-line staff screens a patient

1. **Log in** — health-center/community health-center staff logs in with their own account
2. **Search for the patient** — search for the diabetic patient on Metformin being seen today (or add a new patient: name + DOB + optional HN + sex + facility)
3. **Fill in the screening form** — the real 13-item form (DOC-02): HN, name, sex, age, weight, height, latest eGFR, current Metformin dose, alcohol history, vomiting/diarrhea, reduced food intake, NSAID use, herbal/supplement use — guided, step-by-step, no clinical interpretation required
4. **The system runs the rule engine** (deterministic, not AI) — three independent checks:
   - Is the Metformin dose appropriate for this eGFR (CPG table)?
   - MALA risk score: eGFR<60(+1) + BMI<23(+2) + heavy alcohol(+2) — alert if ≥2
   - Sick Day Rule flags: any of vomiting/diarrhea, reduced intake, NSAIDs, herbs/supplements present?
5. **The path splits by result:**
   - **If the dose check fails OR the risk score ≥2 (alert case)** → the system alerts the referral hospital immediately, through the app **and** a LINE group, both at once — **the doctor/nurse at the hospital takes over the patient**; front-line staff's role ends here (no waiting for anything to come back)
   - **If neither triggers (no-alert case)** → the system generates advice (AI-assisted) from whichever Sick Day Rule flags are active, and front-line staff delivers it to the patient **immediately** — no doctor involved, no waiting
6. **Confirm/approve to close the case** — someone with approval rights confirms the screening result (has legal effect per ETA §9) — happens on every path
7. **Send data to the hospital to keep for analysis** — happens for **every case**, alert or not, after confirming the case is closed

## Pain points this journey solves (traced back to the pain source)

| Point in the old system (pain) | How the new journey solves it | Reference |
|---|---|---|
| No standard screening tool in primary care | Step 3-4: the real form + a deterministic rule engine, one standard across the whole network | DOC-01 + DOC-02 |
| รพ.สต. staff dispensing Metformin can't see the patient's eGFR or other risk data at the point of care | Step 3: eGFR pulled from the hospital system automatically (per DOC-02's demo), plus the rest captured at the point of dispensing | DOC-02 |
| Front-line staff might decide treatment themselves without consulting a doctor | Step 5: alert cases go straight to the hospital; even no-alert advice is system-generated, not staff's own clinical judgement | INT-01 + rule.md + DOC-02 |
| Slow referral of high-risk patients (mortality is high if slow) | Step 5: alert fires immediately, through two channels at once, skipping any wait step | DOC-01 (mortality 30-50%) + DOC-02 |
| The hospital has no overview of the cases screened in primary care | Step 7: always sends every case's data to the hospital to keep for analysis | Team confirmation Sep 8, 2026 + intent.md (Success metrics) |

## Open items affecting this journey (not final until answered)
- The alcohol question's exact shape — DOC-02's checklist and its own demo UI don't fully agree (raw yes/no + follow-ups vs. 4 discrete levels)
- Which scoring document is authoritative — the outline's point tally (≥2 = alert) or the demo's single 0–100 Risk Score (threshold 60) — or how they combine
- The real LINE group + hospital recipient for the pilot area, and the in-app notification side's design (undefined in any source doc)
- Real Sick Day Rules wording for step 5's AI-generated advice
- ~~Whether the Part 3.0 chatbot is meant for staff or for patients directly~~ — **answered: patient-facing.** It's a separate patient-side interaction, not part of this staff journey — stays out of scope for this document until it's designed as its own journey
