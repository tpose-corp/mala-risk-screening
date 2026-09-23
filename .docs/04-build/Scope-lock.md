# Scope Lock — W6 Sprint 0 (CONFIRMED by PO)

Status: **locked** — confirmed by the team, Sep 2026. Before this, the
backlog (`.docs/01-requirements/backlog.md`) marked almost every item `Must`, with several of those
`Must` items also `BLOCKED` on an unanswered question — the "too many MUSTs" trap the W6 material
warns about. This file is the real lock: one workflow a real user can finish end-to-end, everything
else explicitly Should/Could/Won't. Only the MUST list below becomes GitHub issues for this sprint.

> **The one-breath test:** *"Front-line staff logs in, adds/finds a patient, fills the screening
> form, sees a deterministic risk result, and confirms it."* That's the whole MUST list. Everything
> below that isn't in that sentence is not a MUST.

## MUST — ship or fail (Alpha Demo, W8)

| PBI | Item | Why it's MUST, not more |
|---|---|---|
| PBI-01 | Login | Can't do anything else without it |
| PBI-04 | Add a new patient (minimal form, no HOSxP integration) | Unblocked, doesn't depend on an open question |
| PBI-05 | Fill the 13-item screening form | The core input |
| PBI-06 | Deterministic rule engine (dose-vs-eGFR, risk score, Sick Day flags) | The core logic — the whole point of the app |
| PBI-07 | Show the result with plain-language explanation | The core output |
| PBI-11 | Confirm/approve the result | Closes the workflow; needed for ETA §9 legal effect |
| PBI-12 | Minimal audit log (who did what, when) | Legally required (CCA §26), and cheap to build alongside PBI-11 |

Read that list in one breath: *log in → add a patient → fill the form → see the result → confirm
it, logged.* That is the entire Alpha Demo workflow.

## SHOULD — important, ship if MUST is done

| PBI | Item | Why it waits |
|---|---|---|
| PBI-02 | Full role-based access control (multiple roles) | Alpha Demo can run on one "front-line staff" role; add doctor/admin roles once the MUST workflow works |
| PBI-08 | Real hospital alert via app **and** LINE | BLOCKED on the real LINE group/recipient — build the alert *trigger + record* as part of MUST (a flag on the result), wire the real delivery channel once that answer arrives |
| PBI-15 | Send every case to the hospital for analysis | Store it in the app's own DB as part of MUST; the actual hospital-side export/endpoint is Should until the hospital confirms a format |
| PBI-13 | Consent/privacy notice | Legally important, but needs the hospital's answer on whether a consent flow already exists — ship a basic in-app notice+checkbox as a Should, refine once answered |
| PBI-16 | AI-generated personalized advice text | The *display* of advice (even a static, flag-based template) can ship in Should; the AI-generation layer on top is a refinement, not the core |
| PBI-17 | MFA/OTP on login | The hospital contact asked for this and the team already agreed to it — so it's not a WON'T. It doesn't block the Alpha Demo workflow (basic PBI-01 login covers that), so it sits here: build after the MUST login works, before Beta. `rule.md`'s ETA section already names it as "should use if stronger identity assurance is required" |

## COULD — nice to have, first to cut

| PBI | Item |
|---|---|
| PBI-14 | Versioning when an approved record is edited |
| — | Search existing patient by name/HN (PBI-03) — folded here because it's BLOCKED on the HOSxP question; add-new-patient (PBI-04, MUST) covers the Alpha Demo path without it |

## WON'T — not this build (written down on purpose)

| Item | Reason |
|---|---|
| PBI-S1 — AdminDashboard | Not a core workflow; team-parked stretch goal |
| PBI-S2 — Automatic HOSxP/HIS integration | Needs the open question answered first; likely exceeds the 4-month timeline regardless |
| PBI-S3 — AI chatbot, confirmed patient-facing | Real pain source exists (DOC-02); UX/UI still undesigned; revisit after Alpha |
| Multi-facility rollout / network-wide sync | Out of scope for a one-month, one-pilot-site build |

**The line to the sponsor (พี่ / hospital contact) if new requests come in:**
> "That's a real need — it goes on the Could/Won't list for this build, and we'll revisit it after
> the Alpha Demo (Oct 7). Right now we're finishing the one screening workflow."

## After lock

Should/Could stay visible in the backlog but off the board; Won't stays written here so no one
re-argues it mid-sprint. If a new request comes in mid-build, it goes on Could/Won't (see the line
to the sponsor above) — it doesn't reopen this file. Any future rescoping needs the PO's sign-off
again, the same way this lock did.
