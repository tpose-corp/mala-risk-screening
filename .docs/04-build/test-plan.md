# Test Plan: MALA Screening (v2, TEST phase)

Version 2.0, 28 October 2026. Replaces the W8 Alpha test plan (23 Sep 2026), which was written
before the code existed. The submitted copy (with team names) is the course deliverable; this file
is the working version for the repo.

> **All test data must be synthetic.** Use fake names, fake HN, made-up lab values. Never use a real
> patient's data in a test case, screenshot, or bug report (`rule.md`).

## 1. Purpose and system overview

This plan covers automated tests and real-user testing on **4 November 2026** for MALA Screening.

| Role | Uses the system to |
|---|---|
| Front-line staff | Find or add a patient, fill in the screening form, view and confirm the result |
| Hospital doctor | Review the alert inbox, open and acknowledge cases, export CSV |
| Admin | Review the audit log |

The rule engine (`app/src/lib/rules.ts`) is plain code built from the hospital's threshold
documents. It raises alerts only; a medical professional makes every clinical decision.

## 2. Objectives

1. Staff can screen and confirm a patient without help.
2. Every result and alert matches the hospital's threshold documents.
3. Doctors can find, open, and acknowledge alerts.
4. Each role reaches only its own pages, and sensitive actions are logged.
5. Real users are faster and more accurate than with the current method (before vs after).
6. SUS and TAM scores show whether users find it usable and would adopt it.

## 3. Scope

Only features built in the current app are tested.

### 3.1 In scope

| Area | What is tested | App screen |
|---|---|---|
| Login and sessions | Valid login, wrong password, no access to patient pages without logging in | Login |
| Patients | Search the patient list, add a new patient, required fields | Patients, Add patient |
| Screening form | All form items, required fields, out-of-range values, alcohol standard-drink calculator | Screening form |
| Rule engine | Results and alerts match the hospital threshold documents | Automated unit tests |
| Result and confirmation | Result in plain language; confirmation stores who, when, and which record (ETA §9) | Result, Confirm |
| Hospital alerts | Alert inbox, case details, acknowledge, case history, CSV export | Hospital inbox, Cases |
| Roles (RBAC) | Staff, doctor, and admin reach only their own pages | All |
| Audit log | Views and changes are logged; logs cannot be edited or deleted from the app (CCA §26) | Audit |
| Usability | Real users complete tasks on the laptops used in the session | All |

### 3.2 Out of scope

- **HIS integration (such as HOSxP).** PBI-S2, not built; users type eGFR and HN by hand. Data
  source questions are asked in the post-task interview (Section 8.4) to answer the open question
  in `intent.md`.
- LINE alerts, AI advice, patient chatbot, multi-factor login (not built).
- Load, penetration, and certification testing.
- The clinical thresholds themselves; the hospital owns them.
- Real patient data.

## 4. Test levels

Testing follows the Testing Pyramid. 150 automated unit tests (Vitest) already exist
(`cd app && npm test`).

| Level | Coverage in MALA Screening | Current status | Owner |
|---|---|---|---|
| Unit | Rule engine (dose vs eGFR, risk score, Sick Day reasons), alcohol calculator, audit log guard, filters, CSV report | 150 automated tests | Developer, reviewed by QA |
| Integration | Form → database → result; result → hospital inbox; acknowledgement → case history; actions → audit log | Manual, using Section 6 | Developer and QA |
| E2E / System | Staff workflow login → confirm; doctor workflow inbox → acknowledge; role permissions | Manual walkthrough before UAT | QA |
| Regression | Re-run all unit tests and every Critical and High case after each fix | Before every UAT day and after each fix | QA and developer |
| UAT | Tasks in Section 7 with real staff | 4 November 2026 | Moderator and note-taker |

## 5. Test environment and data

- **Build:** `main` on a team laptop; record the commit ID each test day.
- **Device:** Chrome on team laptops.
- **Accounts:** one demo account per role; passwords stay inside the team.
- **Data:** synthetic patients only; reset the database before each UAT session.
- **Rule version:** `outline-draft-2026-09-08` (`RULE_VERSION` in `app/src/lib/rules.ts`).
- **Evidence:** case ID, pass or fail, actual result, defect notes; no real-looking patient data in
  screenshots.

## 6. Test cases

32 cases. All Critical and High cases must pass before 4 November. Log a defect for every Fail.

### 6.1 Login, patients, and form

| ID | Role | Steps | Test data | Expected result | Priority | Result |
|---|---|---|---|---|---|---|
| TC-01 | Staff | Log in | Valid staff account | Home page opens; login is written to the audit log | High | |
| TC-02 | Any | Log in with a wrong password | Valid username, wrong password | Login refused, no page access, failed attempt logged without the password | Critical | |
| TC-03 | None | Open the patient list URL without logging in | No session | Sent to the login page; no patient data shown | Critical | |
| TC-04 | Staff | Add a patient with name or date of birth left blank | Name blank | Form blocks saving and names the missing field | High | |
| TC-05 | Staff | Add a patient with valid data, HN left blank | Name "Test Patient A", DOB 1960-01-01 | Patient saved and shown in the patient list | High | |
| TC-06 | Staff | Search the patient list | Search "Test Patient A" | Only matching patients are shown | Medium | |
| TC-07 | Staff | Submit the screening form with eGFR blank | eGFR blank, other fields valid | Submission blocked; eGFR field flagged | High | |
| TC-08 | Staff | Submit impossible values | eGFR -5, then weight 0 | Values rejected with a clear message; no result saved | High | |
| TC-09 | Staff | Use the alcohol standard-drink calculator | Pick a drink type and amount | Calculator answers checklist items 9.2.1 and 9.2.2 consistently with the amount entered | Medium | |

### 6.2 Rule engine (expected results from `outline-draft-2026-09-08`)

Height 160 cm in every row. 70 kg gives BMI 27.3 (0 points); 55 kg gives BMI 21.5 (2 points).
Other risk items are "No" unless stated.

| ID | Test data | Expected dose check | Expected risk score | Expected alert and advice | Priority | Result |
|---|---|---|---|---|---|---|
| R-01 | eGFR 75, dose 1500 mg, 70 kg | OK (max 2000 mg) | 0 | No alert, no Sick Day advice | Critical | |
| R-02 | eGFR 45, dose 2000 mg, 70 kg | OK (boundary, max 2000 mg) | 1 (eGFR below 60) | No alert | Critical | |
| R-03 | eGFR 44, dose 1500 mg, 70 kg | Exceeds (max 1000 mg) | 1 | Alert for dose | Critical | |
| R-04 | eGFR 30, dose 1000 mg, 70 kg | OK (boundary, max 1000 mg) | 1 | No alert | Critical | |
| R-05 | eGFR 29, dose 500 mg, 70 kg | Contraindicated | 1 | Alert for contraindication | Critical | |
| R-06 | eGFR 75, dose 1000 mg, 55 kg | OK | 2 (BMI below 23) | Alert for risk group; Sick Day advice | Critical | |
| R-07 | eGFR 55, dose 1000 mg, 70 kg, drinks alcohol = Yes, regular heavy drinking = Yes | OK | 3 (1 + 2) | Alert; Sick Day advice; advice to stop drinking | Critical | |
| R-08 | eGFR 75, dose 1000 mg, 70 kg, drinks alcohol = Yes, both heavy-drinking items = No | OK | 0 | No alert | High | |
| R-09 | eGFR 75, dose 1000 mg, 70 kg, vomiting = Yes | OK | 0 | No alert; Sick Day advice (vomiting) | High | |
| R-10 | eGFR 75, dose 1000 mg, 70 kg, herbal products = Yes | OK | 0 | No alert; Sick Day advice; herbal use recorded for tracking | High | |
| R-11 | Submit R-07 twice | Same as R-07 | Same | Identical results both times (deterministic, no AI) | High | |

### 6.3 Result, confirmation, and hospital side

| ID | Role | Steps | Test data | Expected result | Priority | Result |
|---|---|---|---|---|---|---|
| TC-10 | Staff | View a result | R-03 and R-01 patients | Alert and no-alert results are clearly different and explained in plain language | High | |
| TC-11 | Staff | Confirm a result with a note | R-03 patient | Confirmer, time, and record are saved; case shows as confirmed | Critical | |
| TC-12 | Staff | Try to confirm the same result again | Already confirmed case | Second confirmation refused and logged; first one unchanged | High | |
| TC-13 | Doctor | Open the alert inbox | After R-03, R-05, R-06 are submitted | All three appear as waiting, oldest first, with reason and facility | High | |
| TC-14 | Doctor | Open a case | R-05 case | Details match what staff entered; view is written to the audit log | High | |
| TC-15 | Doctor | Acknowledge an alert | R-05 case | Case moves from waiting to acknowledged; doctor and time recorded | Critical | |
| TC-16 | Doctor | Check case history | R-05 case | Submit, confirm, and acknowledge events in correct order with times | Medium | |
| TC-17 | Doctor | Export cases as CSV | Cases from R-01 to R-10 | File opens in Excel with Thai text correct and matches the case list | Medium | |

### 6.4 Roles and audit log

| ID | Role | Steps | Test data | Expected result | Priority | Result |
|---|---|---|---|---|---|---|
| TC-18 | Staff | Open hospital and audit page URLs | Staff account | Access denied | Critical | |
| TC-19 | Doctor | Open the audit page URL | Doctor account | Access denied | Critical | |
| TC-20 | Admin | Filter the audit log by user and action, then export | Admin account | Matching entries shown; CSV export works | High | |
| TC-21 | Admin | Look for any way to edit or delete a log entry in the app | Admin account | No edit or delete exists; logs are append-only | Critical | |

## 7. UAT tasks for real users

Tasks are short scenarios on printed patient cards, given one at a time, never naming a button.
Everyone gets the same tasks in the same order.

### 7.1 Before: the current way (baseline)

- **Staff:** screen one card the current way (for example, paper checklist and eGFR dose table),
  timed. The card matches UAT-S2 in difficulty but uses different numbers. Confirm the current
  method with the hospital contact first.
- **Doctors:** ask how they learn about at-risk patients today. If nothing comparable exists,
  report that instead of a before time.

### 7.2 After: tasks in MALA Screening

| Task | Role | Scenario given to the user | Success criterion |
|---|---|---|---|
| UAT-S1 | Staff | "Mr. Somchai is a new patient who came for his Metformin refill today. Screen him using the system." (card: eGFR 75, 1500 mg/day, 70 kg, 160 cm, no other risks) | Patient added, form saved, no-alert result reached, under 5 minutes, no help |
| UAT-S2 | Staff | "Mrs. Malee is already registered. Her latest lab shows eGFR 44 and she takes 1500 mg a day. Screen her and finish the case." | Existing patient found (not added twice), alert result reached, case confirmed |
| UAT-S3 | Staff | "Mr. Prasert is here, but his card has no weight on it. Screen him." (the moderator gives the weight only if asked) | User notices the missing value and asks or measures; no guessed value submitted |
| UAT-D1 | Doctor | "Primary-care units have sent new MALA alerts. Find the case that needs attention first and tell us why." | Opens the contraindicated case and states the reason correctly |
| UAT-D2 | Doctor | "You have reviewed that case. Record that the hospital has received it." | Case acknowledged and shown as received |
| UAT-D3 | Doctor | "Your department head wants this week's screened cases in Excel." | CSV downloaded and opened with correct Thai text |

Per task, record: success, time, errors, help given, sticking points, and quotes.

### 7.3 UAT test scripts (step by step)

Users follow these steps **after** the 7.2 tasks, so the scripted steps do not teach them the
screens before their task times are recorded. The user marks Pass or Fail for each step and can add
a comment. Button names are quoted in Thai exactly as they appear in the app, with an English gloss.
Patient data is synthetic. Any Fail is logged as a defect
(Section 11) with the step ID, for example "A8".

#### Script A: Front-line staff (primary-care nurse)

Synthetic patient: name "ทดสอบ ขั้นตอน", female, born 1 January 2503 (B.E.), weight 55 kg,
height 160 cm, eGFR 75, Metformin 1000 mg/day, no alcohol, no symptoms or triggers.

| Step | Action | Test data | Expected result | Pass / Fail | Comment |
|---|---|---|---|---|---|
| A1 | Open the system website | Link given by the team | The "เข้าสู่ระบบ" (Log in) page of the MALA risk screening system | | |
| A2 | Enter username and password, then click "เข้าสู่ระบบ" (Log in) | Staff account given by the team | The "ค้นหาผู้ป่วย" (Find patient) page opens | | |
| A3 | Type the name in the search box, then click "ค้นหา" (Search) | "ทดสอบ ขั้นตอน" | No patient found (not added yet) | | |
| A4 | Click "+ เพิ่มผู้ป่วยใหม่" (Add new patient) | | The "เพิ่มผู้ป่วยใหม่" (Add new patient) page | | |
| A5 | Leave every field empty and click "บันทึกและเริ่มคัดกรอง" (Save and start screening) | All fields empty | Nothing is saved; the system shows which fields are required | | |
| A6 | Enter name, date of birth, and sex, leave HN empty, then click "บันทึกและเริ่มคัดกรอง" (Save and start screening) | Synthetic patient above | Saved; the "แบบคัดกรอง" (Screening form) page opens for this patient | | |
| A7 | Enter weight and height | 55 kg and 160 cm | BMI is calculated automatically, about 21.5 | | |
| A8 | Enter a negative eGFR | -5 | A warning says the value cannot be negative | | |
| A9 | Correct the eGFR and enter the Metformin dose | eGFR 75 and 1000 mg/day | The warning disappears | | |
| A10 | Answer the alcohol question | "ไม่ดื่ม" (Does not drink) | No follow-up questions about drinking amount appear | | |
| A11 | Answer all 4 symptom and trigger questions | "ไม่ใช่" (No) for each | All questions answered | | |
| A12 | Click "ประมวลผลความเสี่ยง MALA" (Calculate MALA risk) | | The "ผลประเมิน" (Result) page shows "แจ้งเตือนแล้ว (Alert)", risk score 2 (risk group, BMI below 23), and the dose is appropriate | | |
| A13 | Read the "สิ่งที่คุณต้องทำ" (What you need to do) section | | The user can explain the next steps in their own words | | |
| A14 | Click "ดำเนินการต่อ" (Continue) | | The "แจ้งเตือนและคำแนะนำ" (Alert and advice) page shows the referral hospital was notified and gives Sick Day Rules advice | | |
| A15 | Tick "ข้าพเจ้าได้แจ้งคำแนะนำนี้ให้ผู้ป่วยรับทราบแล้ว" (I have given this advice to the patient), then click "ดำเนินการต่อ" (Continue) | | The "ยืนยันปิดเคส" (Confirm and close case) page | | |
| A16 | Tick "ข้าพเจ้าขอยืนยันว่าข้อมูลและผลการประเมินนี้ถูกต้อง" (I confirm this data and result are correct), add a note, then click "ยืนยันและบันทึกการตัดสินใจ" (Confirm and save) | Note: "ทดสอบระบบ" | A pop-up says the case is closed, with the confirmer's name and time; click "ตกลง" (OK) | | |
| A17 | Go back to "ค้นหาผู้ป่วย" (Find patient) and search the same name | "ทดสอบ ขั้นตอน" | Patient found with status "เสี่ยง (ส่งต่อ รพ. แล้ว)" (At risk, referred to hospital) | | |
| A18 | Click "ออกจากระบบ" (Log out) | | Back on the "เข้าสู่ระบบ" (Log in) page | | |

#### Script B: Referral hospital doctor

Before the session, the team prepares 3 waiting cases in the system using R-03, R-05, and R-06 from
Section 6.2.

| Step | Action | Test data | Expected result | Pass / Fail | Comment |
|---|---|---|---|---|---|
| B1 | Open the website, enter username and password, then click "เข้าสู่ระบบ" (Log in) | Doctor account given by the team | The "กล่องแจ้งเตือน" (Alert inbox) page opens | | |
| B2 | Look at the cases under "รอรับเรื่อง" (Waiting) | | Waiting cases are listed with the alert reason, the sending primary-care unit, and the waiting time | | |
| B3 | Click "ดูเคส" (View case) on any waiting case | | The "รายละเอียดเคส" (Case details) page shows the measured values, result, and triggers found | | |
| B4 | Look at the "ลำดับเหตุการณ์" (Timeline) section | | Case events are listed in time order, such as screening, alert, and case closed by the primary-care unit | | |
| B5 | Click "กลับ" (Back), then click "รับเรื่อง" (Acknowledge) on the same case | | The case moves from "รอรับเรื่อง" (Waiting) to "รับเรื่องแล้ว" (Acknowledged) with the doctor's name and time | | |
| B6 | Open the "ข้อมูลทุกเคส" (All cases) menu | | All screening results from primary-care units in the network are shown | | |
| B7 | Set the result filter to "แจ้งเตือน" (Alert), then click "ล้างตัวกรอง" (Clear filters) | | Filtered: only alert cases. After clearing: all cases again | | |
| B8 | Click "ดาวน์โหลด Excel (CSV)" (Download Excel) and open the file | | The file opens in Excel, Thai text is readable, and rows match the web page | | |
| B9 | Click "ออกจากระบบ" (Log out) | | Back on the "เข้าสู่ระบบ" (Log in) page | | |

## 8. Real users and session plan

10 sessions planned (7 front-line staff, 3 hospital doctors or pharmacists), one real user each,
about 40 minutes, meeting the course target of 10. Any shortfall is reported to the instructor.
Classmates and students never count as clinical users. Users appear only as codes (U01, U02, …);
the booking sheet with dates and units is kept outside the repo.

### 8.1 Session roles

- **Moderator:** gets consent, gives tasks one at a time, never helps.
- **Note-taker:** times tasks and records results and quotes.

### 8.2 Session steps (about 40 minutes)

1. Intro and PDPA consent; ask before any photo or recording (3 min)
2. Before task, current way (5 min)
3. Tasks with think-aloud, Section 7.2 (10 to 15 min)
4. Step-by-step test script, Section 7.3 (10 min)
5. SUS, then TAM (3 to 6 min)
6. Interview (5 min)
7. Enter results the same day

Run one pilot session before 4 November. If time allows, test about 5 users, fix, then test the rest.

### 8.3 Privacy and consent

Consent forms, the raw results sheet, and approved photos are kept by the team for the instructor
to check, never committed to this repo.

### 8.4 Post-task interview

Course questions:

1. What did you like about the system?
2. Where did you get stuck?
3. Would you keep using it at work? Why or why not?
4. What would you change or add?

Data source questions (staff only), for the HIS open question in `intent.md`:

5. What program records your patient data?
6. Where do you find a patient's eGFR?
7. Which form items are already in that system?
8. Do you use the hospital's HN or your own number?
9. Who looks after the system, and how do we reach them?

## 9. Metrics

Before and after task results are required (portfolio P4). SUS and TAM are optional extras.

### 9.1 Task results (required)

| Metric | How it is measured | Reported as |
|---|---|---|
| Task success rate | Successful tasks divided by attempts, per task | Percent per task, for example 6 of 7 (86%) |
| Time on task | Seconds from reading the task to finishing it | Mean and range per task; before time vs UAT-S2 time |
| Errors | Wrong entries, wrong pages, or wrong answers, one definition for before and after | Mean errors per user |
| Help needed | Times the user asked for help or was stuck over 60 seconds | Count per task |
| Risk judged correctly | Before: paper judgement matches the expected result? After: correct alert or no-alert reached? | Correct out of total, before vs after |
| Data lookup time | Part of the before time spent finding eGFR or HN | Seconds; estimates the value of HIS integration |

No fair baseline means no before numbers; never invent them.

### 9.2 System Usability Scale (SUS)

Standard 10 items (Brooke, 1996), accepted Thai translation, 1 to 5 scale, right after the tasks.
Odd items score (answer − 1), even items (5 − answer), sum × 2.5 gives 0 to 100. Report mean and SD
against the benchmark of 68.

### 9.3 Technology Acceptance Model (TAM)

TAM (Davis, 1989) fits because MALA Screening is a workplace tool; UTAUT2 is for consumer apps.
Items adapted from Davis (1989) and Venkatesh and Davis (2000), 1 to 5 scale, translated into Thai,
back-translated, and tried in the pilot.

| Code | Construct | Item |
|---|---|---|
| PU1 | Perceived Usefulness | Using MALA Screening lets me screen Metformin patients more quickly. |
| PU2 | Perceived Usefulness | Using MALA Screening makes it easier to know which patients are at risk of MALA. |
| PU3 | Perceived Usefulness | I find MALA Screening useful in my work. |
| PEOU1 | Perceived Ease of Use | Learning to use MALA Screening is easy for me. |
| PEOU2 | Perceived Ease of Use | My interaction with MALA Screening is clear and understandable. |
| PEOU3 | Perceived Ease of Use | I find MALA Screening easy to use. |
| BI1 | Behavioral Intention | I intend to use MALA Screening in my work. |
| BI2 | Behavioral Intention | If MALA Screening were available at my unit, I would use it regularly. |
| BI3 | Behavioral Intention | I would recommend MALA Screening to colleagues who screen Metformin patients. |

Score per construct = mean of its items; report mean and SD. Link the lowest construct to task
problems. No cause-and-effect claims, and SUS and TAM stay separate.

## 10. Entry and exit criteria

| Stage | Start when | Finished when |
|---|---|---|
| Functional testing (Section 6) | Build on `main` runs; test data and expected results written | All unit tests pass; every Critical and High case run; no open Critical defect |
| UAT (4 Nov) | Functional exit met; users booked; consent forms, cards, questionnaires, results sheet ready; pilot done | All 10 planned sessions done, or any shortfall reported to the instructor; results, SUS, TAM entered for every session |
| Final presentation | UAT results analysed | Top 3 to 5 problems listed with severity; fixes shown with before and after screenshots; no rule engine result disagrees with 6.2 |

## 11. Defect severity (Nielsen 0 to 4)

| Severity | Meaning | MALA example | Action |
|---|---|---|---|
| 4 Catastrophe | Unsafe result, missed alert, unauthorised record access, or data loss | R-05 does not raise an alert | Stop UAT of that workflow; fix and retest first |
| 3 Major | A main workflow is blocked or important information is wrong | Doctor cannot acknowledge an alert | Fix before the final presentation |
| 2 Minor | Works, but causes noticeable friction | Users cannot find the alcohol calculator | Fix if time allows |
| 1 Cosmetic | Visual or wording issue | Label spacing | Backlog |
| 0 Not a problem | Observed, no change needed | | None |

Each defect: ID, date, user or case ID, steps, expected vs actual, severity, clean screenshot, owner
role, retest result. Track defects as GitHub issues.

## 12. Schedule

UAT is on 4 November, the course field testing day. No testing on 31 October (guest lecture).

| Date | Activity | Responsible role |
|---|---|---|
| Wed 28 Oct | Submit the Test Plan | Project team |
| Thu 29 to Fri 30 Oct | Book users; confirm the current screening method; prepare cards, consent forms, questionnaires, results sheet | Test lead, PO |
| Thu 29 to Fri 30 Oct | Run all unit tests and Section 6 cases; fix Critical and High defects | Developer, QA |
| Sat 31 Oct | Guest lecture, no testing | Whole team |
| Sun 1 to Tue 3 Nov | Pilot session; regression run; reset test database | Moderator, note-taker, QA |
| Wed 4 Nov | UAT sessions with real users; enter results the same evening | Moderator, note-taker |
| Thu 5 to Tue 10 Nov | Analyse results; fix top problems; retest; before and after screenshots | Whole team |
| Wed 11 or 18 Nov | Final presentation | Whole team |

## 13. Roles

| Role | Responsibilities |
|---|---|
| Test lead (QA) | Owns this plan, runs Section 6, keeps the defect log, compiles results |
| Product Owner | Books real users, contacts the hospital, confirms the current screening method |
| Developer (Tech Lead) | Prepares the build and test data, fixes defects, runs unit tests |
| AI Lead | Records where AI was used and checks AI-drafted content was reviewed |
| Moderator / Note-taker | Run each UAT session (see 8.1) |
| Hospital clinical team | Own the clinical thresholds; review any disagreement between results and their documents |

## 14. Risks

| Risk | Mitigation |
|---|---|
| Not enough real users on 4 Nov, especially doctors | Book through the hospital contact; allow nearby days; report any shortfall, never invent sessions |
| The current screening method is unclear, so the baseline is unfair | Confirm it before 4 Nov; use matched patient cards; report limits honestly |
| Clinical thresholds are still a hospital draft (8 Sep 2026) | Test only against the hospital's document; send any doubt (for example, whether either heavy-drinking item counts) to the clinical team |
| Users enter real patient details | Clearly fake names on printed cards; remind users; reset the database after each session |
| A severity 4 defect appears during UAT | Stop that workflow, record it, fix and retest |
| No internet at the test site | Run the app locally on the team laptop; bring a backup laptop |

## 15. AI use

| Part | How AI was used | Team review |
|---|---|---|
| Version 1 structure (team draft) | A team member drafted the sections; an AI assistant helped with structure and English wording | Revised by the team in version 2 |
| Version 2 revision | Claude (Anthropic) revised version 1 against the course Test Plan requirements and the current app | Read through by the team |
| Rule engine cases R-01 to R-11 | Claude derived test data and expected results from `app/src/lib/rules.ts`, which follows the hospital's MALA outline document | Each expected result checked by hand against the hospital document |
| TAM items | Adapted by Claude from Davis (1989) and Venkatesh and Davis (2000) | Thai translation and back-translation by team members |

AI did not set any clinical threshold and is not used in the rule engine.
