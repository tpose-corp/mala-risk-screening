# Diagrams: MALA Risk Screening

**v4, 18 Nov 2026.** Redrawn from the v2 code (`app/prisma/schema.prisma`, `app/src/`) after the
hospital session on 17 Nov 2026 (`test/sessions/S01-2026-11-17-hospital-uat.md`).

> **What changed from v3 (8 Sep 2026):** three roles instead of one staff role; patients keyed by
> national ID with admin verification; screenings locked after confirmation with an amendment
> history; criteria stored as versions the admin can change; two alert kinds; the AI advice box
> and the LINE channel are removed because they were not built. v3 is in the git history
> (commit `fe4451b`). The draw.io file `mala-diagrams.drawio` still shows v3.

## 1. Use-case diagram

```mermaid
flowchart LR
  pcu[["รพ.สต. staff (pcu)\nown unit only"]]
  cli[["Hospital doctor / nurse (clinician)\nall units, read-only, no export"]]
  adm[["Hospital admin\nback office"]]

  subgraph sys["MALA Risk Screening"]
    L((Log in, change temporary password))
    P1((Find patient in own unit))
    P2((Add patient by national ID\nstatus pending))
    S1((Fill 13-item form))
    S2((Rule engine\ndeterministic))
    S3((See result and Sick Day advice))
    S4((Edit screening\nuntil confirmed))
    S5((Confirm and close))
    H1((Alert inbox\ntab 1 over-dose, tab 2 general risk))
    H2((Acknowledge and write follow-up))
    H3((View cases, patient history,\nNSAID and herbal per area))
    A1((Verify patient, add HN))
    A2((Amend confirmed screening\nwith reason))
    A3((Manage accounts and units))
    A4((Change criteria version))
    A5((Switch system on or off per role))
    A6((Upload manuals))
    A7((Export CSV, view audit log))
  end

  pcu --> L
  pcu --> P1
  pcu --> P2
  pcu --> S1
  S1 -. include .-> S2
  S2 --> S3
  pcu --> S4
  pcu --> S5
  cli --> L
  cli --> H1
  cli --> H2
  cli --> H3
  adm --> L
  adm --> H1
  adm --> H3
  adm --> A1
  adm --> A2
  adm --> A3
  adm --> A4
  adm --> A5
  adm --> A6
  adm --> A7
  P2 -. "ID already at another unit: refused" .-> P2
```

## 2. ER diagram

Ten tables. Every write is also recorded in `AuditLog` (not drawn as a relation; it keeps IDs only).

```mermaid
erDiagram
  FACILITY ||--o{ USER : "pcu staff work at"
  FACILITY ||--o{ PATIENT : "home unit of"
  FACILITY ||--o{ SCREENING : "done at"
  USER ||--o{ SESSION : has
  USER ||--o{ PATIENT : "creates / verifies"
  USER ||--o{ SCREENING : "screens / confirms / acknowledges / follows up"
  USER ||--o{ AMENDMENT : makes
  USER ||--o{ RULESET : "saves"
  USER ||--o{ MANUAL : uploads
  PATIENT ||--o{ SCREENING : has
  PATIENT ||--o{ AMENDMENT : "history of"

  FACILITY {
    int id PK
    string code "optional unit code"
    string name UK
    bool active
  }
  USER {
    int id PK
    string username UK
    string passwordHash "bcrypt"
    string role "admin | clinician | pcu"
    string facility FK "pcu only"
    string licenseNo
    bool active
    bool mustChangePassword
    datetime lastLoginAt
  }
  SESSION {
    string id PK "sha256 of the cookie token"
    int userId FK
    datetime expiresAt
  }
  PATIENT {
    int id PK
    string cardId UK "13-digit national ID"
    string hn UK "added by admin"
    string name
    string dob "Thai date"
    string sex
    string facility FK "home unit"
    string status "pending | verified"
    bool active
    datetime registeredAt
  }
  SCREENING {
    int id PK
    int patientId FK
    string facility FK
    int screenerId FK
    float weightKg
    float heightCm
    float egfr
    string egfrDate
    int doseMgDay
    bool bingeDrinking
    bool regularHeavyDrinking
    bool vomiting
    bool lowIntake
    bool nsaid
    string nsaidNote
    bool herbal
    string herbalNote
    string ruleVersion
    string doseCheck "ok | exceeds | contraindicated"
    int riskScore
    bool isAlert
    string alertKind "dose | risk"
    datetime acknowledgedAt
    string followUpNote
    datetime confirmedAt
    int confirmedById FK
  }
  AMENDMENT {
    int id PK
    string entity "Patient | Screening"
    int entityId
    string field
    string oldValue
    string newValue
    string reason
    int byId FK
    datetime at
  }
  RULESET {
    int id PK
    string version UK
    json params "thresholds"
    string approvedBy "doctor or pharmacist"
    string reason
  }
  SETTING {
    string key PK
    string value "on/off per role, messages"
  }
  MANUAL {
    int id PK
    string title
    bytes data "PDF"
    string audience "pcu | clinician | admin"
  }
  AUDITLOG {
    int id PK
    datetime at
    int userId
    string action
    string entity
    int entityId
    string detail "IDs only, no names or lab values"
  }
```

## 3. Sequence diagram: screen, alert, lock

```mermaid
sequenceDiagram
  actor Staff as รพ.สต. staff
  participant App as MALA app (Next.js)
  participant Rules as rules.ts (deterministic)
  participant DB as PostgreSQL
  actor Clin as Hospital clinician
  actor Admin as Hospital admin

  Staff->>App: Add patient (national ID)
  App->>DB: Is this ID registered?
  alt ID belongs to another unit
    App-->>Staff: Popup: go to own unit or the hospital
  else new ID
    App->>DB: Save patient, status pending
  end
  Staff->>App: Fill 13-item form
  App->>DB: Read current criteria version
  App->>Rules: evaluate(input, criteria, version)
  Rules-->>App: dose check, risk score, alert kind, Sick Day reasons
  App->>DB: Save screening + audit row
  alt alert (dose first, then risk)
    App-->>Clin: Appears in inbox tab "over-dose" or "general risk"
    Clin->>App: Acknowledge, write follow-up
    App->>DB: Save who and when + audit row
  end
  Staff->>App: Edit if needed, then confirm
  App->>DB: Save confirmer, time, rule version (locked)
  Staff->>App: Try to edit after confirm
  App-->>Staff: Popup: locked, call the admin
  Admin->>App: Amend field with reason
  App->>DB: Save Amendment (old, new, reason) + audit row
  Admin->>App: Verify patient, add HN
```

## 4. Architecture diagram

```mermaid
flowchart TB
  subgraph Browser["Browser (computer or phone)"]
    UI[Pages for pcu, clinician, admin]
  end

  subgraph Vercel["Vercel, region sin1 (free tier)"]
    subgraph Next["Next.js 16 app (one modular monolith)"]
      Pages[Server components and server actions]
      Auth[session.ts\nhttpOnly cookie, hashed token, role checks]
      Rules[rules.ts\nplain code, no AI]
      Crit[criteria.ts / settings.ts\nversions and switches from DB]
      Audit[audit.ts\nIDs only]
    end
  end

  subgraph Neon["Neon PostgreSQL, Singapore (free tier)"]
    Tables[(10 tables)]
    Trig[Triggers: audit log append-only,\nlog changes made outside the app]
  end

  UI -->|HTTPS| Pages
  Pages --> Auth
  Pages --> Rules
  Pages --> Crit
  Pages --> Audit
  Pages -->|Prisma 7, pooled| Tables
  Audit --> Tables
  Tables --- Trig
```

The same app runs on the hospital's own server with any PostgreSQL (see
`../final/deployment.md`). Not shown because not built: LINE alerts, AI advice, chatbot,
HIS / HOSxP link.
