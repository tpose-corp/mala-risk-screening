# Diagrams — MALA Risk Screening (4 required for the W5 Gate)

v3 — Sep 8, 2026 · rebuilt around the real clinical criteria in `thresholds/` (DOC-02) — see `../../intent.md` "Real clinical criteria received" and "Confirmed workflow model" for the source of every rule below. An editable draw.io version of these same 4 diagrams lives alongside this file at `mala-diagrams.drawio`.

> **What changed from v2 (same day):** v2 modeled 3 named risk tiers with a doctor-recommendation loop for the lighter two. The real documents that arrived after v2 show a **binary** model instead (alert vs. no-alert), computed by a **deterministic rule engine** (not AI), with alerts going through **both the in-app system and a LINE group**, and AI used only to generate patient advice text (and a possible chatbot) for the no-alert path. Still open, not resolved by this version: reconciling the outline's point-tally scoring against the demo's single 0–100 "Risk Score," and whether the Part 3.0 chatbot is staff-facing or patient-facing — see `../../intent.md`. Do not use this as a final BUILD spec until those close.

## 1. Use-case diagram

```mermaid
flowchart LR
  staff[["Front-line staff (รพ.สต.)"]]
  doctor[["Doctor/Nurse, referral hospital\n(receives alert, manages patient)"]]
  admin[["Admin"]]

  subgraph sys["MALA Risk Screening System"]
    UC1((Log in))
    UC2((Search / add patient))
    UC3((Fill screening form\n13 real items))
    UC4((Run rule engine\ndeterministic))
    UC5((View result))
    UC6((Alert hospital\napp + LINE, simultaneous))
    UC6b((Hospital manages patient\nterminal))
    UC7((Generate advice\nAI-assisted, no-alert case))
    UC8((Deliver advice to patient))
    UC9((Confirm / approve result))
    UC10((Send data to hospital\nfor analysis — every case))
    UC11((Manage user access RBAC))
    UC12((View audit log))
    UC13((Chatbot consult\nstaff or patient — TBD which))
  end

  staff --> UC1
  staff --> UC2
  staff --> UC3
  UC3 --> UC4
  UC4 --> UC5
  UC5 -. "dose mismatch OR risk score ≥2" .-> UC6
  UC5 -. "neither triggers" .-> UC7
  UC6 --> doctor
  doctor --> UC6b
  UC6 -. "records that it alerted" .-> UC9
  UC7 --> UC8
  UC8 --> UC9
  UC9 -. include .-> UC10
  UC3 -. include .-> UC12
  UC9 -. include .-> UC12
  staff -.-> UC13
  admin --> UC11
  admin --> UC12
```

## 2. ER diagram

```mermaid
erDiagram
  USER ||--o{ SCREENING_RECORD : creates
  USER {
    string user_id PK
    string name
    string role "staff | doctor | admin"
    string facility
  }
  PATIENT ||--o{ SCREENING_RECORD : has
  PATIENT {
    string patient_id PK
    string name
    string hn
    date dob
    string sex
    string facility
  }
  SCREENING_RECORD ||--|| RULE_RESULT : produces
  SCREENING_RECORD {
    string screening_id PK
    string patient_id FK
    string created_by FK
    datetime created_at
    float egfr
    float weight_kg
    float height_cm
    float metformin_dose_mg
    string alcohol_level "none | occasional | regular | heavy"
    boolean vomiting_diarrhea
    boolean reduced_intake
    boolean nsaid_use
    boolean herbal_supplement_use
    datetime analysis_sent_at "every case — sent to hospital"
  }
  RULE_RESULT {
    string result_id PK
    string screening_id FK
    boolean dose_appropriate "CPG check: eGFR vs Metformin dose"
    int bmi_computed "from weight/height"
    int risk_score "eGFR<60=1 + BMI<23=2 + heavy alcohol=2"
    boolean risk_alert "true if dose fails OR risk_score >= 2"
    boolean sick_day_flag "true if any of: vomit/diarrhea, reduced intake, NSAIDs, herbs"
  }
  RULE_RESULT ||--o| ALERT : triggers
  ALERT {
    string alert_id PK
    string result_id FK
    string hospital_id FK
    datetime sent_at
    string channel "app + LINE, both, always"
    string status "hospital manages patient — no advice sent back"
    datetime acknowledged_at
  }
  RULE_RESULT ||--o| ADVICE : generates
  ADVICE {
    string advice_id PK
    string result_id FK
    string advice_text "AI-generated Sick Day Rules etc."
    boolean ai_generated
    datetime delivered_at
    string delivered_by FK
  }
  SCREENING_RECORD ||--o| APPROVAL : signed_by
  APPROVAL {
    string approval_id PK
    string screening_id FK
    string approved_by FK
    datetime approved_at
  }
  USER ||--o{ AUDIT_LOG : generates
  AUDIT_LOG {
    string log_id PK
    string user_id FK
    string action
    string target_record
    datetime timestamp
  }
  HOSPITAL {
    string hospital_id PK
    string name
    string line_group_id "the LINE group that receives alerts"
  }
  ALERT }o--|| HOSPITAL : sent_to
```

## 3. Sequence diagram — binary alert model

```mermaid
sequenceDiagram
  actor Staff as Front-line staff
  participant App as MALA Screening App
  participant Rules as Rule engine (deterministic)
  actor Doctor as Hospital team (LINE group + in-app)

  Staff->>App: Fill in the 13-item screening form
  App->>Rules: Run dose check + risk score + Sick Day Rule flags
  Rules-->>App: dose_appropriate, risk_score, sick_day_flag
  App->>App: Log audit (rule engine ran)

  alt dose check fails OR risk_score >= 2
    App->>Doctor: Alert — in-app notification AND LINE group, both, at once
    Note over Doctor: Hospital manages the patient directly.<br/>No advice is sent back for staff to carry out.
    App-->>Staff: Notify: hospital alerted — role ends here
  else neither triggers
    App->>App: Generate advice (AI-assisted) from active Sick Day Rule flags
    App-->>Staff: Show the advice
    Staff->>App: Deliver advice to patient (no doctor, no waiting)
  end

  Staff->>App: Confirm / approve to close the case (e-signature)
  App->>App: Log the approval + audit
  App->>Doctor: Send screening data (every case) for hospital analysis
```

## 4. Architecture diagram

```mermaid
flowchart TB
  subgraph Client["Client side (Browser - computer/smartphone)"]
    UI[Web App - MALA Screening]
  end

  subgraph Server["Hosting: รพ.สต. server (฿0 budget)"]
    API[Backend API]
    Rules[Rule engine\ndeterministic - dose/eGFR, risk score, Sick Day flags]
    AI[AI/LLM helper\nadvice text + optional chatbot - NOT the risk decision]
    DB[(Database - Patient, Screening, Rule result, Alert, Advice, Audit)]
  end

  subgraph Hospital["Referral hospital side"]
    LineGrp[LINE group\nMALA alert - ~12 members]
    HospitalUI[In-app notification\nhospital team]
    HospDB[(Hospital DB - analysis data, every case)]
  end

  UI -->|HTTPS| API
  API --> Rules
  Rules -->|risk_alert = true| API
  API -->|"alert, simultaneous"| LineGrp
  API -->|"alert, simultaneous"| HospitalUI
  API -->|"no-alert: draft advice"| AI
  AI -->|advice text| API
  API --> DB
  API -->|"send every case, always"| HospDB

  API -.enforce.-> RBAC[RBAC / Auth Layer]
  API -.write.-> AuditLog[Audit Log - CCA §26, kept ≥90 days]
```

**Note:** the rule engine box is deliberately drawn separate from the AI/LLM box — the alert decision itself is plain deterministic code per `../../intent.md`'s "Risk calculation approach," never a model call. AI is scoped to advice-text generation and the (still-undecided) chatbot only. Not shown: AdminDashboard, HOSxP integration — stretch, out of MVP. See `.docs/01-requirements/backlog.md` for the Stretch section.

## Note
This version is based on `thresholds/` (DOC-02), arrived Sep 8, 2026. Two things are known to be unreconciled inside that same source material — the outline spreadsheet's point-tally scoring vs. the demo deck's single 0–100 Risk Score, and whether Part 3.0's chatbot is staff- or patient-facing — see the open questions in `../../intent.md`. Do not treat this as a final BUILD spec until those close, and until the clinical criteria are formally endorsed (the outline itself is titled "draft").
