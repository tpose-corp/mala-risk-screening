# MALA Risk Screening web app (v2, after the hospital UAT on 17 Nov 2026)

Same core workflow as the Alpha (log in, find or add a patient, screen, result, confirm, send to the
hospital), rebuilt around the hospital's requirement list from the UAT session:

- **Three roles.** `admin` (hospital back office, manages everything), `clinician` (doctor or nurse
  chosen by the hospital: sees every unit, read-only, no export, records follow-up) and `pcu`
  (รพ.สต. staff: own unit only). Accounts are created only by the admin, with a temporary password
  that must be changed at first login.
- **Patients keyed by the 13-digit national ID.** A รพ.สต. can add a patient (status "pending")
  but a patient already registered at another unit is refused with a "go to your own unit or the
  hospital" popup. The admin verifies the identity and adds the HN.
- **Screening editable until confirmed**, then locked for the รพ.สต. (popup with the admin's
  contact). The admin can still correct it, with a reason, and every change is kept in the
  Amendment history with old and new values.
- **Two alert tabs** for the hospital: ใช้ยาเกินขนาด first, เกณฑ์เสี่ยงทั่วไป second.
- **NSAID / herbal answers name the product**, summarised per unit at `/hospital/areas`.
- **Admin back office** (`/admin`): overview, accounts, units, patients, criteria versions,
  settings (switch the system off per role), manuals.

Stack: Next.js 16 (App Router, TypeScript), Prisma 7 + PostgreSQL, bcryptjs, zod, Vitest.
All free tiers: Vercel (hosting) + Neon (PostgreSQL). Can also be self-hosted on any Postgres.

## Run it on your machine

```bash
cd app
npm install
npm run db:local              # starts a local PostgreSQL (prisma dev) and prints a postgres:// URL
cp .env.example .env          # paste that URL into DATABASE_URL
npx prisma migrate deploy     # tables + audit triggers
npx prisma db seed            # synthetic demo data
npm run db:seed:history       # optional: 5 years of synthetic history (8 units, ~450 patients, ~3,400 screenings)
npm run dev                   # http://localhost:3100
```

Demo accounts (synthetic), password `mala1234` for all: `admin` (hospital back office),
`doctor` and `nurse` (hospital clinicians), `somsri`, `manee`, `somchai` (รพ.สต. staff).

```bash
npm test                      # unit tests
npx tsc --noEmit && npm run lint
```

## Deploy (Vercel + Neon, both free)

1. Neon: create a project (region Singapore). Copy the **pooled** connection string and the
   **direct** one.
2. On your machine, point `.env` at Neon once and fill the database:
   `DATABASE_URL=<pooled>` and `DIRECT_URL=<direct>`, then `npx prisma migrate deploy` and
   `npx prisma db seed`. Put your local URL back afterwards.
3. Vercel: import the repo, set **Root Directory** to `app`, Build Command `npm run vercel-build`,
   and add the environment variables `DATABASE_URL` (pooled) and `DIRECT_URL` (direct) as Secret,
   Production only. `vercel.json` runs the server code in Singapore (`sin1`), next to Neon; without
   it the code runs in the USA and every page is several seconds slower.
4. Deploy. Every later deploy runs `prisma migrate deploy` before the build, so new migrations
   reach the database automatically.

Never put real patient data into the demo deployment (PDPA, see `../rule.md`).
Live: https://mala-risk-screening.vercel.app. More in `../.docs/final/deployment.md`.

## Where things are

| Path | What |
|---|---|
| `src/lib/rules.ts` | **PBI-06 rule engine** — plain functions, no AI. Every threshold traces to `intent.md` |
| `src/lib/rules.test.ts` | Unit tests, one per row of `test-plan.md` PBI-06 |
| `src/lib/v2.test.ts` | v2 tests: alert kinds, editable criteria, national ID, passwords |
| `scripts/eval-rule-cases.ts` | Runs rule cases R-01 to R-11 from `test-plan.md` 6.2; output in `../test/results/` |
| `src/lib/session.ts` | PBI-01 login sessions (httpOnly cookie, only a hash stored in DB) |
| `src/lib/audit.ts` | PBI-12 audit log helper (IDs only, no names/lab values; stores a short device summary, no IP) |
| `src/lib/audit-text.ts`, `audit-filters.ts` | Audit log as readable Thai (who/what/where/how), 90-day retention constant, filters |
| `prisma/schema.prisma` | Database tables |
| `prisma/migrations/*audit_triggers` | DB triggers: audit log append-only (CCA §26), and logging of any change made outside the app |
| `src/lib/actor.ts` | Marks the app's own writes so the DB triggers don't report them as outside changes |
| `src/lib/criteria.ts`, `settings.ts` | Criteria versions and system switches the admin edits |
| `src/app/admin/` | Hospital back office pages |
| `src/app/login/` | Login page + form |
| `src/app/patients/` | Patient list/search, `new/` add patient (PBI-04), `[id]/screen/` 13-item form (PBI-05) |
| `src/app/screenings/[id]/` | Step 3 result (PBI-07) · `next/` step 4 alert or Sick Day advice · `confirm/` step 5 e-signature (PBI-11) + case closed |
| `src/app/hospital/` | Referral hospital: two-tab alert inbox (ใช้ยาเกินขนาด first) with "รับเรื่องแล้ว" and follow-up note, `cases/` every case, `areas/` NSAID and herbal summary per unit, `export/` CSV in the hospital's report layout (admin only) |
| `src/lib/alcohol.ts` | Everyday drinking answers → standard drinks → checklist 9.2.1 / 9.2.2 |
| `src/lib/advice.ts` | What the screener must do and the patient advice text, per the hospital outline |
| `src/app/hospital/patients/[id]/` | Referral hospital: one patient's screening history |
| `src/app/audit/` | Read-only audit log viewer + `export/` CSV (admin only) |

## MUST status

| PBI | Status |
|---|---|
| PBI-01 Login | ✅ success/failure/logout logged; pages redirect to `/login` without a session |
| PBI-04 Add patient | ✅ name, DOB and 13-digit national ID required; duplicate ID at another unit refused; HN added by the admin on verification |
| PBI-05 13-item form | ✅ server-side validation, live BMI + eGFR meter |
| PBI-06 Rule engine | ✅ deterministic; 11 of 11 rule cases (`scripts/eval-rule-cases.ts`); thresholds editable by the admin as versions |
| PBI-07 Result | ✅ alert / no-alert with reasons in plain Thai |
| PBI-11 Confirm | ✅ stores who/when/rule version; can't be confirmed twice; locked afterwards, admin amendments keep old and new values (PBI-14) |
| PBI-12 Audit log | ✅ append-only at DB level; admin-only viewer with filters and CSV; see the CCA §26 table below |

MVP core capabilities (`proposal.md` / `README.md`):

| Core | Status |
|---|---|
| 1. Screen the patient | ✅ |
| 2. Send every case to the hospital for analysis | ✅ hospital sees every case in `/hospital/cases`; the admin downloads CSV (report sheet columns) |
| 3. Alert the hospital (app + LINE) / instant advice | ✅ in-app inbox with acknowledgement, auto-refresh every 10 s. LINE not built: waiting for the hospital to confirm the group and recipients |

Built in v2 (17 Nov 2026): full RBAC with three roles (PBI-02) and amendment history for confirmed
records (PBI-14).

Not built yet: LINE delivery (PBI-08), AI-written advice (PBI-16, the app uses the hospital's
own wording instead), MFA (PBI-17), consent notice (PBI-13).

## Audit log against `rule.md` (Computer Crime Act §26)

| Rule | How the app does it |
|---|---|
| Keep traffic/access logs at least 90 days | Nothing ever deletes audit rows: the DB triggers block DELETE and UPDATE, and `audit-guard.test.ts` fails if code tries. `AUDIT_RETENTION_DAYS = 90` in `audit-text.ts` is the floor for any future clean-up job. The `/audit` page shows how far back the log reaches |
| Link activity to a real user/account | Every row stores user ID + username at the time; the page shows name, role, facility. Rows of deleted accounts keep the old username |
| Log login, failed login, logout | `login.success`, `login.failed` (wrong password vs unknown account), `logout` |
| Log opening a patient record, viewing results/eGFR/medication | `patient.view`, `screening.view`, `hospital.case.view`, `hospital.patient.history.view`, list views, CSV downloads |
| Log creating/updating results, referral/escalation | `screening.create`, `alert.raised`, `advice.given`, `alert.acknowledge`, `screening.confirm` |
| Log role/permission changes, account create/disable/delete, record archive/delete | Admin screens log `admin.user.create`, `admin.user.update`, `admin.user.deactivate`, `admin.user.reset`, `admin.patient.deactivate`, `admin.screening.update`, `admin.criteria.update`, `admin.settings.update`. DB triggers also log any change made outside the app (`db.user.*`, `db.patient.*`, `db.screening.*`, `db.ruleset.*`), field names only |
| Refused access | `access.denied` (wrong area), `record.denied` (another facility's record), `audit.view.denied`, `hospital.export.denied`, `patient.duplicate.blocked`, `screening.edit.locked` |
| Reliable timestamps | Server clock, stored in UTC, shown in Thai time. The server must sync its clock (NTP) when deployed |
| Protect logs from modification/deletion | Append-only triggers; no edit/delete button anywhere |
| No passwords/tokens in logs | Passwords are never logged; a failed login keeps the typed username only if it is a real account (people type passwords into the username box). Session tokens are stored only as a hash and never logged |
| No patient names/lab values in logs (PDPA) | IDs only. The CSV search term is not kept, only that a search was used |
| Logs restricted to authorised staff | `/audit` and `/audit/export` are admin only |
| Administrators can retrieve logs for compliance | Filters (person, type, date range, failures only) and CSV download of every raw row; the download itself is logged |

The log does **not** store client IP addresses (team decision, Oct 7 2026). Ask the hospital whether its
server or network already keeps IP traffic logs, since the MDES notification on traffic data usually
lists the source IP.

## Open questions found while building (ask the hospital / team)

The rules now follow the three files in `../thresholds/` directly (outline sheet "draft",
the 13-item checklist, and the demo deck). Points that are our reading of them, to confirm:

1. **"ดื่มหนัก"** = yes to checklist 9.2.1 **or** 9.2.2 (the outline's report sheet feeds one
   alcohol column from both items). The old 4-level picker from the demo deck is no longer used.
2. **Herbal / supplement use (ข้อ 13)** triggers Sick Day Rules advice as well as area tracking,
   because the outline's Management cell for Part 4 is merged across NSAIDs and herbal.
3. **A Part 2 alert also asks the screener to give Sick Day Rules advice** (outline column F,
   and the demo's advice screen shows a high-risk case). This changes the earlier team decision
   in `intent.md` that the front-line role ends at the alert; dose changes stay with the doctor.
4. **Advice wording** is copied from the demo deck page 11. Its 5th card
   ("นัดตรวจการทำงานของไตซ้ำ") is cut off in the PDF, so it is left out until the full text arrives.
5. **Order of the hospital alert queue** (`src/lib/priority.ts`): contraindicated (eGFR < 30 on
   Metformin) first, then dose above CPG, then risk score only; longest wait first inside each group.
   This is our reading of the outline's Action column, not a written rule. Also ask whether
   vomiting/diarrhea (dehydration) should move a case up.
6. **Boundaries are inclusive** (eGFR exactly 45 → ≤2000 mg allowed; score exactly 2 → risk group).
7. **Client IP is not stored in the audit log** (team decision). Confirm with the hospital that its network
   keeps IP traffic data, or the app needs it back (see the CCA §26 table above).
8. `test-plan.md` PBI-06 #6 says eGFR 55 (1) + BMI 22 (2) = "Score 2"; that's 3. The exact-2
   boundary is tested separately (#6b in `rules.test.ts`).

## AI disclosure

This app's code was written with AI assistance (Claude Code), then run and checked by the team. Details: `../.docs/final/ai-logic.md`.
The clinical criteria were not invented by the AI — they come from `thresholds/` via `intent.md`.
