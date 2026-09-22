# MALA Risk Screening — Legal & Compliance Rules (rule.md)

Read this before writing any code that touches patient data, medical information, screening results, or clinical staff actions.

## PDPA (Personal Data Protection Act)

**What it is:** The Personal Data Protection Act (PDPA) regulates the collection, use, disclosure, and protection of personal data. Health and medical information is sensitive personal data and requires appropriate legal protection and safeguards.

**What it requires:** lawful processing · purpose limitation · data minimisation · security · appropriate handling of data-subject rights · additional protection for sensitive personal data.

### Rules for the agent

* If the system stores a patient's name, patient ID, national ID, date of birth, phone number, or other identifying information, it must restrict access to authorised medical staff.
* If the system stores medical history, symptoms, diagnoses, laboratory results, medication information, eGFR, kidney function, or MALA risk results, it must treat the information as sensitive personal data.
* If the system stores MALA screening information, it must use the data only for MALA risk screening, monitoring, clinical support, reporting, or another documented and legally permitted purpose.
* The system must collect only the patient information necessary to perform the MALA risk assessment.
* The system must not collect unrelated patient information merely because it may be useful in the future.
* If the system collects patient data, it must provide an appropriate privacy notice explaining why the data is collected and how it will be used.
* If consent is used as the legal basis for processing, the system must obtain and record valid consent before processing.
* If another lawful basis applies to processing health data in the healthcare context, the system must document that basis instead of unnecessarily relying on consent.
* If the system records consent, it must store the consent status, timestamp, purpose, and applicable notice/consent version.
* The system must allow authorised users to correct inaccurate patient information.
* The system must not allow ordinary users to modify clinical assessment results without appropriate authorization.
* If a patient requests access to their personal data, the system must provide a secure mechanism for handling the request.
* If a deletion request is received, the system must check whether medical, legal, or regulatory requirements require the information to be retained before deleting it.
* If patient data is no longer necessary and no retention requirement applies, the system must delete or anonymise it according to the approved retention policy.
* If the system displays a patient's MALA risk level, it must display it only to authorised medical personnel.
* The system must implement role-based access control for doctors, pharmacists, nurses, administrators, and other staff.
* The system must enforce least-privilege access to patient records.
* If a healthcare worker accesses a patient record, the system must authenticate and authorise the user before providing access.
* If a healthcare worker views a patient's eGFR, medication history, MALA risk score, or screening history, the system must restrict that information to authorised users.
* The system must not expose patient information through public URLs, unsecured API endpoints, browser source code, or client-side configuration.
* If patient data is transmitted to another service, the system must send only the minimum data required for that service.
* The system must encrypt sensitive patient data during transmission.
* The system must protect sensitive patient data at rest using appropriate security controls.
* The system must never store passwords, authentication tokens, API keys, or other credentials in plaintext.
* The system must not include patient names, patient IDs, diagnoses, laboratory results, medication histories, or risk scores in application logs unless strictly necessary.
* If patient information appears in logs, the agent must minimise, redact, or pseudonymise it.
* The agent must never hard-code real patient information into source code, test data, examples, screenshots, or documentation.
* Development and testing environments must use synthetic or appropriately anonymised patient data.
* If the system exports screening results, it must require appropriate authorization and must not include unrelated patient records.
* If the system shares information between primary-care units and Chiang Rai Prachanukroh Hospital, it must restrict the shared information to the minimum required for the intended healthcare purpose.
* The system must maintain an audit trail for sensitive access and actions involving patient records.
* The system must not use MALA patient data for advertising or unrelated commercial purposes.
* If the system uses historical MALA cases for research or analytics, it must apply appropriate legal, privacy, minimisation, and anonymisation/pseudonymisation controls.
* The system must not expose one patient's MALA risk assessment, medication information, or clinical history to another patient.
* If a personal-data breach involving patient records is detected, the system/company must have a process to notify the PDPC within 72 hours and to notify affected patients without delay if the breach is likely to cause them high risk.
* Because the system processes sensitive health data as a core activity, the company must appoint a Data Protection Officer responsible for PDPA compliance oversight.

## Computer Crime Act §26

**What it is:** Computer Crime Act §26 requires covered service providers to retain required computer traffic data for at least 90 days and permits longer retention when legally required.

**What it requires:** retain required access/traffic logs ≥90 days · associate relevant activity with a real user/account · protect logs from unauthorised modification or deletion.

### Rules for the agent

* If the system provides accounts for medical staff, it must maintain the required computer traffic/access logs for at least 90 days.
* If a medical staff member logs in, the system must record the authentication event with the relevant user/account identifier and timestamp.
* If a login attempt fails, the system should record the failed authentication event without storing the password.
* If a user logs out, the system should record the logout event.
* If a medical staff member opens a patient record, the system must log the access.
* If a medical staff member views a patient's MALA screening result, the system must log the access.
* If a medical staff member views eGFR, medication history, or other sensitive clinical information, the system must log the relevant access event.
* If a medical staff member creates a MALA screening record, the system must log the action and responsible user.
* If a medical staff member updates a screening result, the system must log who performed the update and when.
* If a medical staff member changes a patient's risk classification, the system must log the responsible user, timestamp, and action.
* If a medical staff member records a referral or escalation, the system must log the action and responsible user.
* If an administrator changes a user's role or permissions, the system must log the administrator account and the change.
* If an administrator creates, disables, or deletes a staff account, the system must log the action.
* If a patient record is archived or deleted, the system must log the responsible user and action.
* Required computer traffic/access logs must be retained for at least 90 days.
* The system must retain enough information in required logs to associate relevant activity with the responsible user/account.
* The system must use reliable timestamps for traffic and audit events.
* The system must protect required logs against unauthorised modification or deletion.
* Ordinary medical staff must not be able to modify or delete legally required traffic logs.
* The system must not store passwords, authentication secrets, session tokens, or private keys in traffic logs.
* If logs contain patient-related information, access to those logs must be restricted to authorised personnel.
* If a medical staff account is disabled or deleted, required logs associated with that account must remain available for the applicable retention period.
* If a longer retention period is legally required for a particular record, the system must not automatically delete it after 90 days.
* The system must provide authorised administrators with a mechanism to retrieve required logs for compliance purposes.
* If the application uses multiple services, the agent must preserve sufficient timestamps and identifiers to correlate relevant events across services.
* The agent must not implement a log-retention mechanism that automatically deletes required traffic logs before the applicable legal retention period.

## Electronic Transactions Act §9 / 26 / 28

**What it is:** The Electronic Transactions Act gives legal recognition to electronic transactions and electronic signatures when the method can identify the signer and indicate the signer's approval of the electronic information. Section 26 provides criteria for reliability, while §28 applies duties to certification service providers.

**What it requires:** identify the signer and indicate approval (§9) · use a reliable signature method where applicable (§26) · comply with certification-service-provider requirements when providing such a service (§28).

### Rules for the agent

* If a medical staff member clicks **"Approve Screening"**, the system must record the staff member's identity, screening record ID, patient record ID, timestamp, and approval action.
* If a medical staff member electronically signs a MALA screening report, the system must identify the signer.
* If a user approves a screening result, the system must clearly identify the exact screening record or document being approved.
* If a medical staff member signs a document, the system must preserve the exact version of the document that was signed.
* The system must record when the electronic signature or approval occurred.
* The system must associate the signature with the specific electronic record that was approved.
* If a signed MALA screening report is modified, the system must create a new version instead of silently changing the signed version.
* If a signed document is modified after signing, the system must make the modification detectable.
* The system must maintain an audit trail showing who approved or signed the screening record and when.
* If the electronic signature relies on a medical staff account, the system must require appropriate authentication before signing.
* The system must not allow one medical staff member to sign using another staff member's account.
* If stronger identity assurance is required, the system should use an additional authentication mechanism such as MFA or OTP.
* The system must not automatically sign or approve a MALA screening result on behalf of a medical professional.
* If the system calculates a MALA risk score automatically, it must distinguish the automated result from the medical professional's final approval.
* If a doctor or pharmacist approves an AI-generated or rule-based risk assessment, the electronic approval must identify that medical professional.
* If the system provides an **"I Agree"**, **"Confirm"**, or **"Approve"** button for a legally relevant action, it must record the user's identity, the specific information approved, and the timestamp.
* The system must provide authorised users with access to the final approved screening record.
* If an electronic signature is replaced, revoked, or invalidated, the system must preserve the previous signature/audit record rather than silently deleting it.
* The agent must never expose private signature keys, signature credentials, OTP secrets, or authentication tokens in source code, logs, or API responses.
* If an external certification service provider is used, the system must preserve the information required to verify the electronic signature.
* If the company does not operate a certification service, the agent must not claim that the company is a certification service provider.
* If the company operates its own certification service, the agent must implement the applicable duties under §28.
* The system must not automatically approve a recommendation to stop, continue, or adjust Metformin solely because an automated MALA risk score has been generated.
* If the system recommends referral, medication review, or further clinical assessment, it must present the recommendation as **clinical decision support**, not as an autonomous medical order.
* The system must require an authorised medical professional to make and record the final clinical decision.
* If the final clinical decision is recorded electronically, the system must record the responsible medical professional and timestamp.
* The system must preserve the relationship between the patient's screening inputs, calculated risk result, clinical recommendation, and final authorised decision.
