# Issue log

Severity uses the Nielsen 0 to 4 scale in `.docs/04-build/test-plan.md` section 11
(4 = blocks the task, 3 = major, 2 = minor, 1 = cosmetic). The team set each severity.

"Fix commit" points to `main` on GitHub. All v2 fixes were merged in PR #28
(merge commit `ffc5eab`, 17 Nov 2026).

Retest columns:
- **Auto**: an automated test in `app/src/lib/*.test.ts`, last run in
  [`results/unit-tests-2026-11-18.txt`](results/unit-tests-2026-11-18.txt) (165 of 165 pass).
- **Team**: the team clicked through the flow on localhost with the synthetic accounts. This is a
  PROXY check, not a real user.
- **Real user**: not done yet for any v2 item. Planned in [`no-real-user-test.md`](no-real-user-test.md).

## A. From real users (session S01, hospital UAT, 17 Nov 2026)

Source: [`sessions/S01-2026-11-17-hospital-uat.md`](sessions/S01-2026-11-17-hospital-uat.md)

| ID | Issue | Sev. | Fix | Fix commit | Retest |
|---|---|---|---|---|---|
| F-01 | Only one staff role; doctors could export; no hospital back office | 3 | Three roles `admin`, `clinician`, `pcu`; clinician is read-only and cannot export; pcu sees its own unit only | `f2824dd`, `8c55f12` | Auto: `access.denied` paths in `session.ts`; Team: pass |
| F-02 | No national ID; patient matched by name and date of birth only | 3 | 13-digit national ID (CardID) required when adding a patient, unique in the database, check digit warning | `f2824dd`, `79e89cb` | Auto: `v2.test.ts` "national ID"; Team: pass |
| F-03 | Same patient could be added again at a second unit | 3 | Duplicate ID at another unit is refused with a popup "go to your own unit or the hospital" (`patient.duplicate.blocked` in the audit log) | `79e89cb` | Team: pass |
| F-04 | Patients added by a รพ.สต. went straight into use | 3 | New patients start as "pending"; the admin verifies and adds the HN | `79e89cb`, `8c55f12` | Team: pass |
| F-05 | Accounts came only from the seed script | 3 | Admin creates accounts with role and unit, gives a temporary password, the user must change it at first login | `f2824dd`, `8c55f12` | Auto: `v2.test.ts` "passwords"; Team: pass |
| F-06 | A screening could not be corrected at all, or the rule was unclear | 3 | Editable until confirmed; then locked with a popup naming the admin contact; the admin can amend with a reason, old and new values kept in `Amendment` | `79e89cb`, `8c55f12` | Team: pass |
| F-07 | One alert list, over-dose cases mixed with general risk | 3 | Two tabs: ใช้ยาเกินขนาด first, เสี่ยงทั่วไป second; `alertKind` stored per screening | `8c55f12` | Auto: `v2.test.ts` "alert kind"; Team: pass |
| F-08 | NSAID and herbal answers were yes or no only | 2 | Product name notes, summarised per unit at `/hospital/areas` | `79e89cb`, `8c55f12` | Team: pass |
| F-09 | Date and time not shown on every step | 3 | Thai date and time on every step: screened, edited, confirmed, acknowledged, follow-up | `1bf4041`, `79e89cb` | Team: pass |
| F-10 | No system overview for the hospital | 2 | `/admin` overview page | `8c55f12` | Team: pass |
| F-11 | Criteria, switches and manuals needed a developer | 3 | `/admin/criteria` (versioned, with approver and reason), `/admin/settings` (switch off per role), `/admin/manuals` | `f2824dd`, `8c55f12`, `5097b10` | Auto: `v2.test.ts` "criteria the hospital can change"; Team: pass |

## B. Found by the team while building and deploying

| ID | Issue | Sev. | Fix | Fix commit | Retest |
|---|---|---|---|---|---|
| T-01 | Admin could reset their own password from the accounts page and was logged out | 3 | Self-reset blocked; the admin changes their own password from the account page | `8c55f12` | Team: pass |
| T-02 | Lab date calendar opened below the screen edge | 2 | Calendar flips up when there is no room below | `1bf4041` | Team: pass |
| T-03 | New patient form buttons fell below the screen on small windows | 2 | Full-width form with sticky action bar | `79e89cb` | Team: pass |
| T-04 | Old live demo on Railway stopped (free trial ended) | 4 | Moved to Vercel + Neon, see `.docs/final/deployment.md` | `ffc5eab` (code), deploy on 17 Nov | Team: live site opens |
| T-05 | Live site slow: log in 9.1 s, pages 3 to 6 s | 3 | Server code moved to Singapore next to the database (`app/vercel.json`) | Not committed yet at the time of writing | Measured before: [`results/live-speed-2026-11-18.md`](results/live-speed-2026-11-18.md); after: pending |
