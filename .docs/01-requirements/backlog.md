# Product Backlog — MALA Risk Screening

Team: T-POSE Corp · v1 — Sep 7, 2026
Owner: Product Owner (Sutapant Chucham)

> This backlog's rule: **every item must have a "Pain source" column pointing back to real evidence** (a user interview, or a real case from the original docx). No item may come from the team's or an AI's guess/assumption without a source — if there's no real source yet, mark it `UNVERIFIED` and don't use it to answer the Gate.

## ⚠️ User Validation Gate status (read this first)

> **Confirmed by the instructor since Sep 9, 2026:** the Gate does not require hitting a literal
> interview headcount. What's actually graded is whether the team gathered **real problems and
> needs from actual primary-care nurses/staff** and traced requirements back to them —
> interviewing exactly 5+ named people is not itself the pass/fail bar. Treat the interview count
> below as supporting evidence, not the blocker. Keep collecting real pain points/needs as the
> team encounters real staff, but don't treat "not enough interviews" as an open blocker on its own.

| Criterion | Target | Current status (Aug 27, 2026) |
|---|---|---|
| Real problems/needs gathered from real primary-care staff | Evidence-based, not headcount-based (confirmed by the instructor since Sep 9, 2026) | **1 person** — the hospital contact — plus the original docx (DOC-01) and the real clinical-criteria documents (DOC-02); more staff-level interviews strengthen this but aren't individually required |
| All 4 diagrams complete | use-case, ER, sequence, architecture | 🔶 last drafted Sep 8, 2026 (2nd pass) — **stale again as of the same day**, real clinical criteria + binary model (DOC-02) arrived after that draft; needs a 3rd pass |
| Every requirement traces back to a real pain point | 100% | 🔶 some trace to the original docx (real, but not an interview), some trace to a single interview — evidence exists, keep strengthening as more real staff input comes in |

**Summary: the Gate's real bar is traceable, evidence-backed requirements — not a headcount. The team has real evidence (INT-01, DOC-01, DOC-02); the open item is finishing the diagrams' 3rd pass and continuing to gather staff-level pain points where possible.**

## Interview log (pain-source evidence)

| ID | Interviewee | Role | Date | Pain / info summary |
|---|---|---|---|---|
| INT-01 | Hospital contact | Staff/project owner on the hospital side | Aug 27, 2026 | Front-line users have less clinical knowledge than a doctor/nurse; described a 3-tier screening result (superseded by DOC-02, see below); must notify the hospital immediately if severe/emergency; front-line staff must never decide treatment themselves |
| DOC-01 | Original project document (docx) | Primary Care Pharmacy Service, Chiang Rai Prachanukroh Hospital | Before the project started | 58% of MALA patients received the drug from primary care; no CDS tool; criteria must be designed together with the medical team |
| DOC-02 | `thresholds/` (checklist docx + rule-engine xlsx + demo-slides pdf) | วรางคณา งานดี, ศูนย์ข้อมูลยาและเภสัชสนเทศ รพ.เชียงรายประชานุเคราะห์ | Sep 8, 2026 | **The real clinical criteria** — 13-question screening form, dose-vs-eGFR (CPG) check, MALA risk score (eGFR/BMI/alcohol, threshold ≥2), symptom/AKI-trigger Sick Day Rule flags; binary alert model (not 3 tiers); alert channel = in-app **and** LINE group; names an AI-generated advice card and a chatbot. See `../../intent.md` "Real clinical criteria received" for full detail |
| INT-02..05 | *None yet* | Real front-line staff at รพ.สต./health centers |

### Problem overview (from INT-01 and DOC-01)

> Note: this content deepens the understanding of the "real pain" from one informant. Per the
> instructor's confirmation above (since Sep 9, 2026), the Gate cares about evidence of real
> problems/needs, not a literal interview headcount — this section plus DOC-01/DOC-02 is that
> evidence; more interviews with front-line staff are still valuable but not individually mandatory

**What the disease is, where it comes from:** Metformin-Associated Lactic Acidosis (MALA) is an uncommon but severe, high-mortality complication (30–50% per medical reports), caused by Metformin (a widely used blood-sugar medication for type-2 diabetics) building up in the bloodstream once the kidneys can no longer clear it fast enough, combined with triggering factors such as dehydration, acute kidney injury (AKI), or an acute flare of a chronic disease — once lactic acid accumulates in the blood past a certain point it becomes a medical emergency requiring immediate treatment.

**The problem actually found in the area (DOC-01):** a review of patient cases in Mueang District, Chiang Rai (FY2023–2025) found that 58% of patients who developed MALA received Metformin from a primary-care unit (รพ.สต. / urban health centers) — a dispensing point that **had no standard risk-screening tool** before this.

**The problem INT-01 confirmed from real front-line work:** the hospital contact explained that staff stationed at these primary-care units **usually don't have clinical knowledge equal to a doctor or professional nurse**, so they have to rely on individual judgement to assess which patient is "at risk" and should be referred — there's no shared standard that every unit uses. The result is that some high-risk patients aren't screened or referred in time, before their condition progresses into the high-mortality MALA. The hospital contact also confirmed:
- The screening result should be split into 3 tiers (severe/emergency, severe/needs follow-up, safe) — so front-line staff don't have to interpret for themselves how "severe" something is
- A severe/emergency case must notify the referral hospital immediately, because a slow referral is the main cause of high mortality
- Front-line staff **must never decide the treatment approach themselves** — they must always wait for a recommendation from a doctor at the hospital — reflecting that the clinical-knowledge gap at the front line is a risk the team must design the system to close directly, rather than letting the system/staff decide in place of a doctor

**Why this is a problem worth solving:** three layers of gaps stack on top of each other — (1) the highest-risk dispensing point (primary care) has no screening tool, (2) the front-line people at that point have more limited knowledge than elsewhere, and (3) there's no standard channel to refer/ask a doctor for a recommendation fast enough — letting high-risk patients fall through the system until they develop into severe, high-mortality MALA. This is the main pain source that the whole backlog (especially Epics B–D) traces back to.

---

## Epic A — Authentication & Access Control
Pain source: `rule.md` (RBAC/PDPA requirement, derived from the W2 legal session — not a clinical pain point, but a legal requirement)

| ID | User Story | Acceptance Criteria | Priority | Pain source | Status |
|---|---|---|---|---|---|
| PBI-01 | As front-line staff, I need to log in with my own account, so the system knows who entered the data | The system authenticates before accessing any patient data; logs the login event with a timestamp | Must | rule.md (PDPA + CCA §26) | Ready |
| PBI-02 | As an admin, I need to set access rights by role (staff/doctor/admin), to restrict who sees patient data per least-privilege | Front-line staff sees only relevant cases; the screening result is shown only to authorized people | Must | rule.md (PDPA RBAC) | Ready |
| PBI-17 | As a medical staff member, I need to verify my login with a second factor (MFA/OTP), so account access is harder to compromise for sensitive patient data | Login requires a second factor (OTP via SMS/app, or equivalent) in addition to password before granting access; failed second-factor attempts are logged | Should | Hospital contact request, Sep 2026 — team agreed | `.docs/04-build/scope-lock.md` (SHOULD) — build after PBI-01 works, doesn't gate the Alpha Demo |

## Epic B — Patient search/registration
Pain source: INT-01 (need to know whether staff enters everything themselves or pulls from an existing system — not yet confirmed)

| ID | User Story | Acceptance Criteria | Priority | Pain source | Status |
|---|---|---|---|---|---|
| PBI-03 | As front-line staff, I need to search for a patient already in the system, so I don't re-enter data | Can search by name / national ID / HN | Must | INT-01 | **BLOCKED** — need to know first whether it connects to the existing HOSxP/HIS (open question in intent.md) |
| PBI-04 | As front-line staff, I need to add a new patient not yet in the system | Minimum form: **name + date of birth + HN (if available, optional) + sex + facility (auto-filled)** — uses HN instead of national ID to reduce sensitive data (data minimisation); date of birth is required alongside the name to prevent matching the wrong patient (Thai names repeat often) — **team-confirmed Sep 8, 2026:** matching on the hospital side is done by a human (searches by name+HN); no auto-matching/integration is required in the MVP | Must | INT-01 + rule.md + team confirmation Sep 8, 2026 | Ready |

## Epic C — MALA risk screening form
Pain source: DOC-01 (58% of risk factors from primary care) + INT-01 (users have limited clinical knowledge) + DOC-02 (the real 13-question form and rule engine, Sep 8, 2026)

| ID | User Story | Acceptance Criteria | Priority | Pain source | Status |
|---|---|---|---|---|---|
| PBI-05 | As front-line staff, I need to fill in a guided, step-by-step screening form (without interpreting clinical terms myself), to reduce the chance of entering something wrong | Form fields per DOC-02's checklist: HN, name, sex, age, weight, height, latest eGFR, current Metformin dose (mg/day), alcohol history (drinks? → binge in one sitting: M>5/F>4 std. drinks/2hrs → regular heavy: M>15/F>8 std. drinks/week, with the standard-drink reference table), vomiting/diarrhea, reduced food intake 1–2 days, NSAID use, herbal/supplement use. Each field has validation; non-clinical language throughout | Must | INT-01 + DOC-02 | **Unblocked Sep 8, 2026** — real fields known; still need to reconcile the checklist's raw alcohol Q&A against the demo UI's simplified 4-level picker (see `intent.md`) |
| PBI-06 | As the system, I need to run the rule engine on the data entered, so the result is deterministic and traceable to the hospital's own criteria — **not** an AI/LLM call (team-confirmed Sep 8, 2026, see `intent.md` "Risk calculation approach") | Computes 3 independent checks: (1) dose-vs-eGFR per CPG table (≥45→≤2000mg, 30–44→≤1000mg, <30→contraindicated) (2) MALA risk score = eGFR<60(+1) + BMI<23(+2, BMI computed from weight/height) + heavy-alcohol(+2), alert if ≥2 (3) Sick-Day-Rule flags: vomiting/diarrhea, reduced intake, NSAIDs, herbs/supplements (each independent, no scoring). Plain deterministic code, unit-testable, no external model call | Must | DOC-02 | **Unblocked Sep 8, 2026** — real formula known; still need to reconcile against the demo's single 0–100 "Risk Score" (see `intent.md`) |

## Epic D — Result, alert, and sending data for analysis
Pain source: INT-01 (confirmed the alert workflow) + DOC-01 (mortality is high if referral is slow) + DOC-02 (the real binary model, dual-channel alert, and AI-advice-generation concept, Sep 8, 2026) — **fixed Sep 8, 2026 (2nd pass):** v1 assumed 3 named tiers with a doctor-recommendation loop for medium/no risk; the real documents (DOC-02) show a **binary** model instead — exceeds threshold → alert (hospital takes over, unchanged from the 1st fix), else → record + **AI-generated advice delivered by staff immediately, no doctor loop, no waiting**. PBI-09 below is superseded accordingly.

| ID | User Story | Acceptance Criteria | Priority | Pain source | Status |
|---|---|---|---|---|---|
| PBI-07 | As front-line staff, I need to see the screening result with an easy-to-understand explanation of what triggered it (or didn't) | Shows which check(s) triggered (dose mismatch / risk score / Sick Day Rule flags) or that none did, in plain language + a status color | Must | INT-01 + DOC-02 | Ready (design) |
| PBI-08 | As the system, when the dose check fails or the risk score is ≥2, I need to alert the referral hospital immediately through **both the in-app notification system and a LINE group** (team-confirmed Sep 8, 2026), so **the doctor/nurse at the hospital takes over caring for the patient themselves** (not send a recommendation back for front-line staff to carry out) | Alert reaches the responsible person on the hospital side within the set time, through both channels at once; logs the alert; front-line staff sees an "alerted" status and their role ends there | Must | INT-01 + DOC-02 + team confirmation Sep 8, 2026 | **BLOCKED** — waiting on the real LINE group / hospital recipient for the pilot area, and the in-app notification side's design (undefined in any source doc yet) |
| ~~PBI-09~~ | ~~When the result is "medium risk" or "no risk," a doctor sends a recommendation back through the app for front-line staff to follow~~ | — | — | — | **Superseded Sep 8, 2026 (2nd pass)** — DOC-02 shows no doctor-in-the-loop for the non-alert case; replaced by PBI-16 |
| PBI-16 | As front-line staff, when neither check triggers an alert, I need the system to generate personalized advice (Sick Day Rules etc., per whichever flags from PBI-06 are active) so I can deliver it to the patient immediately, with no doctor involved and no waiting | Advice text is generated from the computed flags (AI/LLM-assisted per `intent.md`), shown/printable for the patient, references which flags produced it; record still gets confirmed/saved (PBI-11) and sent for analysis (PBI-15) same as an alert case | Must | DOC-02 (demo slide 11, "AI GENERATED" advice card) | **BLOCKED** — waiting on real Sick Day Rules wording from the hospital contact; AI-generation approach still needs picking (see stretch PBI-S3 for the related chatbot) |
| ~~PBI-10~~ | ~~When the result is "safe," record and close the case immediately without waiting on the hospital~~ | — | — | — | **Superseded Sep 8, 2026 (1st pass)**, further superseded by PBI-16 above |
| PBI-15 | As the system, I need to send screening results for **every case** to the referral hospital to keep for analysis, always, whether or not an alert fired | Every confirmed screening record is sent to the hospital side within the set time; supports the success metrics in `intent.md` | Must | Team confirmation Sep 8, 2026 + intent.md (Success metrics) | **BLOCKED** — waiting on the endpoint/data format the hospital can receive |

## Epic E — Confirm / e-Signature / Audit
Pain source: `rule.md` (ETA §9/26 + CCA §26 — a legal requirement, not from an interview)

| ID | User Story | Acceptance Criteria | Priority | Pain source | Status |
|---|---|---|---|---|---|
| PBI-11 | As someone with approval rights, I need to press "confirm/approve" on a screening result for it to have legal effect | Records the approver's identity, the approval time, the approved document (per ETA §9) | Must | rule.md | Ready |
| PBI-12 | As the system, I need to log an audit trail for every access/edit of patient data and screening results | Log kept ≥90 days, cannot be edited/deleted by a regular user (per CCA §26) | Must | rule.md | Ready |

## Epic F — Compliance gaps (found while building the traceability matrix, not yet answered by the hospital contact)
Pain source: `rule.md` (PDPA/ETA) — detailed in `.docs/03-compliance/legal-requirement-spec.md`

| ID | User Story | Acceptance Criteria | Priority | Pain source | Status |
|---|---|---|---|---|---|
| PBI-13 | As a patient, I need to receive a privacy notice/consent before my data is used for screening | Shows/records consent status, timestamp, purpose per rule.md | Must | rule.md | **BLOCKED** — waiting on the hospital contact to answer whether a consent flow already exists in the primary-care process |
| PBI-14 | As the system, when an already-approved document is edited, I need to create a new version instead of overwriting it | The old version is still viewable, edits are traceable (per ETA) | Must | rule.md | Ready (can be designed now, doesn't need to wait on the hospital contact) |

## Stretch / out of MVP

| ID | User Story | Reason it's cut from MVP |
|---|---|---|
| PBI-S1 | AdminDashboard for tracking KPIs (% screened, MALA proportion, satisfaction) | Parked as a stretch goal by team scope-lock decision — not a core workflow |
| PBI-S2 | Automatic HOSxP/HIS integration | Needs the open question answered first; may exceed the 4-month timeline |
| PBI-S3 | AI chatbot, patient-facing ("เป็นที่ปรึกษาเมื่อผู้ป่วยไม่สบาย" — DOC-02, Part 3.0) | Added Sep 8, 2026 — **has a real pain source (DOC-02)**, unlike v1's guess. **Confirmed patient-facing** (team decision) — still cut from MVP as a stretch goal; UX/UI still needs designing before build |

---
Linked to: `.docs/00-proposal/proposal.md`, `.docs/02-design/*`, `.docs/03-compliance/legal-requirement-spec.md`, `../../intent.md` (full open questions), `../../rule.md` (full legal requirements, repo root)
