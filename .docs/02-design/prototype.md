# Prototype — MALA Risk Screening

v3 — Sep 8, 2026 · the rebuild described in v2 is **done**. `prototype-v2/` now matches the real criteria in `thresholds/` (DOC-02) — binary alert model, real 13-item form, AI-generated instant advice for the no-alert case, no doctor-recommendation wait step. Also ported to Figma (freeform) — see the bottom of this file.

Screens live at `prototype-v2/*.dc.html` (Claude Design canvas, in this same folder) and the published canvas: https://claude.ai/code/artifact/cc3a135d-2da2-46d6-9761-6eba7e325466. The original guessed prototype set (`prototype/*.dc.html`, 3-tier model) has been removed from the repo — `prototype-v2/` is the only set now.

| Screen | Matches backlog | Status |
|---|---|---|
| Login | PBI-01 | Fine as-is — no criteria dependency (`Main.dc.html`) |
| Search patient | PBI-03 | Fine as-is (`PatientSearch.dc.html`) |
| Add patient | PBI-04 | Fine as-is (`AddPatient.dc.html`) — field list matches the confirmed decision (name + DOB + optional HN + sex + facility) |
| Screening form | PBI-05 | **Done** — `RiskForm.dc.html` rebuilt with the real 13 items (HN, name, sex, age, weight, height, eGFR, Metformin dose, alcohol history, vomiting/diarrhea, reduced intake, NSAIDs, herbs/supplements) |
| Result | PBI-07 | **Done** — `RiskResult.dc.html` is now a binary alert/no-alert view (tweak: `outcome`) showing the dose check, risk score breakdown, and Sick Day Rule flags, not a 3-tier label |
| Alert / hospital takes over | PBI-08 | **Done** — `Referral.dc.html` shows the dual app+LINE alert firing at once, triggered from the binary rule result |
| Instant advice (no-alert case) | PBI-16 | **Done** — `Recommendation.dc.html` rebuilt into "AI-generated advice shown immediately, staff delivers it, no waiting, no doctor" |
| Confirm | PBI-11 | **Done** — `Confirm.dc.html`'s tweak relabeled to `pathType`: "แจ้งเตือนแล้ว" / "แจ้งคำแนะนำแล้ว" |
| AdminDashboard | PBI-S1 | Out of MVP — no file (the old guessed `AdminDashboard.dc.html` was removed along with the rest of the original prototype set) |
| Chatbot | PBI-S3 | Out of MVP — no file, still blocked on staff-vs-patient-facing |

## Still open
1. Don't finalize any of this as pixel-final until the two scoring documents (point-tally vs. 0–100 Risk Score) are reconciled with the hospital contact
2. The alcohol question's two shapes (checklist raw Q&A vs. demo's 4-level picker) — the prototype currently shows the 4-level picker only; the raw Q&A version is deferred, not built
3. When more real users are available (INT-02..05), test the prototype with them and update based on real feedback

## Figma copy
The same 8 screens were also rebuilt in Figma (hand-built with the Plugin API — no design system existed to import from): https://www.figma.com/design/L0YyF578hAPHRHlGUICkAf — converted to freeform (every frame `layoutMode = NONE`) so elements can be dragged/repositioned directly in the Figma editor. Kept in sync manually; if `prototype-v2/*.dc.html` changes, the Figma file needs a matching manual update, it does not auto-sync.
