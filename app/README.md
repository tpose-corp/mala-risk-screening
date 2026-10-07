# MALA Risk Screening — web app (Alpha, W8)

The working MVP for the locked MUST workflow in `../.docs/04-build/scope-lock.md`:
**log in → add/find a patient → fill the 13-item form → deterministic risk result → confirm, logged.**

Stack: Next.js 16 (App Router, TypeScript) · Prisma 7 + SQLite · bcryptjs · zod · Vitest.
All free/open source, runs on any machine with Node.js ≥ 20 (can be self-hosted at the hospital).

## Run it

```bash
cd app
npm install
cp .env.example .env          # Windows PowerShell: copy .env.example .env
npx prisma migrate dev        # creates dev.db (tables + audit-log protection)
npx prisma db seed            # synthetic demo users + patients
npm run dev                   # → http://localhost:3100 (port 3100 so it does not clash with other projects on 3000)
```

Demo accounts (synthetic), password `mala1234` for all:
`somsri` and `manee` (รพ.สต. nurses), `doctor` (referral-hospital doctor), `admin` (can open `/audit`).

```bash
npm test                      # unit tests: rule engine (test-plan.md → PBI-06), audit log, filters, text
npx tsc --noEmit && npm run lint
```

## Where things are

| Path | What |
|---|---|
| `src/lib/rules.ts` | **PBI-06 rule engine** — plain functions, no AI. Every threshold traces to `intent.md` |
| `src/lib/rules.test.ts` | Unit tests, one per row of `test-plan.md` PBI-06 |
| `src/lib/session.ts` | PBI-01 login sessions (httpOnly cookie, only a hash stored in DB) |
| `src/lib/audit.ts` | PBI-12 audit log helper (IDs only, no names/lab values; stores a short device summary, no IP) |
| `src/lib/audit-text.ts`, `audit-filters.ts` | Audit log as readable Thai (who/what/where/how), 90-day retention constant, filters |
| `prisma/schema.prisma` | Database tables |
| `prisma/migrations/*auditlog_append_only` | DB triggers that block UPDATE/DELETE on the audit log (CCA §26) |
| `prisma/migrations/*audit_db_changes` | DB triggers that log account and record changes made outside the app |
| `src/app/login/` | Login page + form |
| `src/app/patients/` | Patient list/search, `new/` add patient (PBI-04), `[id]/screen/` 13-item form (PBI-05) |
| `src/app/screenings/[id]/` | Step 3 result (PBI-07) · `next/` step 4 alert or Sick Day advice · `confirm/` step 5 e-signature (PBI-11) + case closed |
| `src/app/hospital/` | Referral hospital: alert inbox with "รับเรื่องแล้ว" (core 3, in-app), `cases/` every case + `export/` CSV in the hospital's report layout (core 2) |
| `src/lib/alcohol.ts` | Everyday drinking answers → standard drinks → checklist 9.2.1 / 9.2.2 |
| `src/lib/advice.ts` | What the screener must do and the patient advice text, per the hospital outline |
| `src/app/hospital/patients/[id]/` | Referral hospital: one patient's screening history |
| `src/app/audit/` | Read-only audit log viewer + `export/` CSV (admin only) |

## MUST status

| PBI | Status |
|---|---|
| PBI-01 Login | ✅ success/failure/logout logged; pages redirect to `/login` without a session |
| PBI-04 Add patient | ✅ name + DOB required, HN optional |
| PBI-05 13-item form | ✅ server-side validation, live BMI + eGFR meter |
| PBI-06 Rule engine | ✅ deterministic, 20 unit tests |
| PBI-07 Result | ✅ alert / no-alert with reasons in plain Thai |
| PBI-11 Confirm | ✅ stores who/when/rule version; can't be confirmed twice |
| PBI-12 Audit log | ✅ append-only at DB level; admin-only viewer with filters and CSV; see the CCA §26 table below |

MVP core capabilities (`proposal.md` / `README.md`):

| Core | Status |
|---|---|
| 1. Screen the patient | ✅ |
| 2. Send every case to the hospital for analysis | ✅ hospital sees every case in `/hospital/cases` and downloads CSV (report sheet columns) |
| 3. Alert the hospital (app + LINE) / instant advice | ✅ in-app inbox with acknowledgement, auto-refresh every 10 s. LINE not built: waiting for the hospital to confirm the group and recipients |

Not built yet: LINE delivery (PBI-08), AI-written advice (PBI-16, the app uses the hospital's
own wording instead), full RBAC (PBI-02), MFA (PBI-17), consent notice (PBI-13), record versioning (PBI-14).

## Audit log against `rule.md` (Computer Crime Act §26)

| Rule | How the app does it |
|---|---|
| Keep traffic/access logs at least 90 days | Nothing ever deletes audit rows: the DB triggers block DELETE and UPDATE, and `audit-guard.test.ts` fails if code tries. `AUDIT_RETENTION_DAYS = 90` in `audit-text.ts` is the floor for any future clean-up job. The `/audit` page shows how far back the log reaches |
| Link activity to a real user/account | Every row stores user ID + username at the time; the page shows name, role, facility. Rows of deleted accounts keep the old username |
| Log login, failed login, logout | `login.success`, `login.failed` (wrong password vs unknown account), `logout` |
| Log opening a patient record, viewing results/eGFR/medication | `patient.view`, `screening.view`, `hospital.case.view`, `hospital.patient.history.view`, list views, CSV downloads |
| Log creating/updating results, referral/escalation | `screening.create`, `alert.raised`, `advice.given`, `alert.acknowledge`, `screening.confirm` |
| Log role/permission changes, account create/disable/delete, record archive/delete | The app has no screen for these, so DB triggers log any such change made outside the app (`db.user.*`, `db.patient.*`, `db.screening.*`), field names only |
| Refused access | `access.denied` (wrong area), `record.denied` (another facility's record), `audit.view.denied`, `hospital.export.denied` |
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

This app's code was written with AI assistance (Claude Code), reviewed and run by the team.
The clinical criteria were not invented by the AI — they come from `thresholds/` via `intent.md`.
