# Session S01: hospital UAT, 17 Nov 2026

| Item | Value |
|---|---|
| Date | 17 Nov 2026 |
| Place | Chiang Rai Prachanukroh Hospital |
| System shown | Alpha MVP (v1), synthetic data only |
| Participants | **5 real users, U01 to U05**, plus comments from the hospital nurse who is the team's contact. No names are kept. |
| Format | The users tried the system and gave feedback; the nurse added comments. The session was recorded and the team transcribed the recording. The recording is not in the repo because it contains voices and names. |
| Type of evidence | **Real users, qualitative.** No task timing, no success rates and no SUS or TAM forms were collected in this session. |

## What the staff said (feedback, translated from the team's Thai transcript notes)

The users and the nurse liked the core flow and asked for these changes. Feedback was written down for the group, not per user. Each item has an ID used in the
[issue log](../issue-log.md).

| ID | Feedback |
|---|---|
| F-01 | Split the system into roles: the hospital back office (admin) manages everything; doctors and nurses only view patients and decide what to do, and must not export data; รพ.สต. staff only screen patients of their own unit. |
| F-02 | Use the 13-digit national ID (CardID) together with the HN. The ID is entered only when adding a patient. |
| F-03 | A patient who already belongs to another unit should not be screened at a second unit. Staff should send the patient back to their own unit or to Chiang Rai Prachanukroh Hospital. |
| F-04 | Patients added by a รพ.สต. must be confirmed by the hospital back office, which adds the real HN. |
| F-05 | Accounts are created only by the hospital, with a role, and a unit for รพ.สต. staff. |
| F-06 | A screening may be edited only up to a certain step. After that a popup says it cannot be edited and to call the hospital admin, who can edit it. |
| F-07 | Split alerts into two tabs on the doctor side: over-dose (ใช้ยาเกินขนาด) first, because the doctor must act on it first, then general risk (เสี่ยงทั่วไป). |
| F-08 | For painkillers or ยาชุด (NSAID) and herbal products, write down what the patient takes, so the team can visit an area that looks risky. |
| F-09 | Show date and time clearly on every step: screening time, edit time, and so on. ("เน้นเป็นสำคัญ", marked as most important.) |
| F-10 | The admin should see an overview of the whole system to monitor it. |
| F-11 | The hospital must be able to run the system itself after hand-over: switch the system off for รพ.สต. or doctors, change the screening criteria, upload manuals, without asking a developer. |

## What this session proves and does not prove

- It proves that real hospital users saw the system and found gaps in roles, identity checks,
  editing rules and alert order. All 11 items were built in v2 (see the issue log).
- It does not prove that v2 is faster or easier for users. v2 has not yet been retested with real
  users. See [`../no-real-user-test.md`](../no-real-user-test.md).
