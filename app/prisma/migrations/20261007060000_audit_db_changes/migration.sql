-- Computer Crime Act §26 (rule.md): log account changes (create, role/permission change, delete)
-- and archive/delete/edit of patient and screening records, even when they are done outside the
-- web app (seed scripts, a DB tool). The web app has no screen for any of these, so without these
-- triggers such a change would leave no trace. Rows written here have no userId: the database
-- cannot know who ran the change, so the log page shows them as "not through the web app".
-- Detail holds field NAMES only, never values (no patient data, no password hashes in logs).

CREATE TRIGGER "User_audit_insert" AFTER INSERT ON "User"
BEGIN
  INSERT INTO "AuditLog" ("at", "action", "entity", "entityId", "detail")
  VALUES (strftime('%Y-%m-%dT%H:%M:%f+00:00','now'), 'db.user.create', 'User', NEW."id", 'username=' || NEW."username" || ' role=' || NEW."role");
END;

CREATE TRIGGER "User_audit_update" AFTER UPDATE ON "User"
WHEN OLD."username" IS NOT NEW."username" OR OLD."displayName" IS NOT NEW."displayName" OR OLD."role" IS NOT NEW."role" OR OLD."facility" IS NOT NEW."facility" OR OLD."passwordHash" IS NOT NEW."passwordHash"
BEGIN
  INSERT INTO "AuditLog" ("at", "action", "entity", "entityId", "detail")
  VALUES (strftime('%Y-%m-%dT%H:%M:%f+00:00','now'), 'db.user.update', 'User', NEW."id", CASE WHEN OLD."role" IS NOT NEW."role" THEN 'role=' || OLD."role" || '>' || NEW."role" || ' ' ELSE '' END || 'changed=' || rtrim(CASE WHEN OLD."username" IS NOT NEW."username" THEN 'username,' ELSE '' END || CASE WHEN OLD."displayName" IS NOT NEW."displayName" THEN 'displayName,' ELSE '' END || CASE WHEN OLD."role" IS NOT NEW."role" THEN 'role,' ELSE '' END || CASE WHEN OLD."facility" IS NOT NEW."facility" THEN 'facility,' ELSE '' END || CASE WHEN OLD."passwordHash" IS NOT NEW."passwordHash" THEN 'password,' ELSE '' END, ','));
END;

CREATE TRIGGER "User_audit_delete" AFTER DELETE ON "User"
BEGIN
  INSERT INTO "AuditLog" ("at", "action", "entity", "entityId", "detail")
  VALUES (strftime('%Y-%m-%dT%H:%M:%f+00:00','now'), 'db.user.delete', 'User', OLD."id", 'username=' || OLD."username");
END;

CREATE TRIGGER "Patient_audit_update" AFTER UPDATE ON "Patient"
WHEN OLD."name" IS NOT NEW."name" OR OLD."dob" IS NOT NEW."dob" OR OLD."sex" IS NOT NEW."sex" OR OLD."hn" IS NOT NEW."hn" OR OLD."facility" IS NOT NEW."facility" OR OLD."createdById" IS NOT NEW."createdById"
BEGIN
  INSERT INTO "AuditLog" ("at", "action", "entity", "entityId", "detail")
  VALUES (strftime('%Y-%m-%dT%H:%M:%f+00:00','now'), 'db.patient.update', 'Patient', NEW."id", 'changed=' || rtrim(CASE WHEN OLD."name" IS NOT NEW."name" THEN 'name,' ELSE '' END || CASE WHEN OLD."dob" IS NOT NEW."dob" THEN 'dob,' ELSE '' END || CASE WHEN OLD."sex" IS NOT NEW."sex" THEN 'sex,' ELSE '' END || CASE WHEN OLD."hn" IS NOT NEW."hn" THEN 'hn,' ELSE '' END || CASE WHEN OLD."facility" IS NOT NEW."facility" THEN 'facility,' ELSE '' END || CASE WHEN OLD."createdById" IS NOT NEW."createdById" THEN 'createdById,' ELSE '' END, ','));
END;

CREATE TRIGGER "Patient_audit_delete" AFTER DELETE ON "Patient"
BEGIN
  INSERT INTO "AuditLog" ("at", "action", "entity", "entityId", "detail")
  VALUES (strftime('%Y-%m-%dT%H:%M:%f+00:00','now'), 'db.patient.delete', 'Patient', OLD."id", NULL);
END;

-- The app only ever fills in adviceGivenAt / acknowledged* / confirmed* (once). Anything else
-- changing, or a signed (confirmed) record being changed, is logged.
CREATE TRIGGER "Screening_audit_update" AFTER UPDATE ON "Screening"
WHEN OLD."patientId" IS NOT NEW."patientId" OR OLD."screenerId" IS NOT NEW."screenerId" OR OLD."weightKg" IS NOT NEW."weightKg" OR OLD."heightCm" IS NOT NEW."heightCm" OR OLD."egfr" IS NOT NEW."egfr" OR OLD."doseMgDay" IS NOT NEW."doseMgDay" OR OLD."alcohol" IS NOT NEW."alcohol" OR OLD."drinksAlcohol" IS NOT NEW."drinksAlcohol" OR OLD."bingeDrinking" IS NOT NEW."bingeDrinking" OR OLD."regularHeavyDrinking" IS NOT NEW."regularHeavyDrinking" OR OLD."vomiting" IS NOT NEW."vomiting" OR OLD."lowIntake" IS NOT NEW."lowIntake" OR OLD."nsaid" IS NOT NEW."nsaid" OR OLD."herbal" IS NOT NEW."herbal" OR OLD."ruleVersion" IS NOT NEW."ruleVersion" OR OLD."bmi" IS NOT NEW."bmi" OR OLD."maxDoseMgDay" IS NOT NEW."maxDoseMgDay" OR OLD."doseCheck" IS NOT NEW."doseCheck" OR OLD."scoreEgfr" IS NOT NEW."scoreEgfr" OR OLD."scoreBmi" IS NOT NEW."scoreBmi" OR OLD."scoreAlcohol" IS NOT NEW."scoreAlcohol" OR OLD."riskScore" IS NOT NEW."riskScore" OR OLD."isAlert" IS NOT NEW."isAlert" OR OLD."alertRaisedAt" IS NOT NEW."alertRaisedAt" OR OLD."createdAt" IS NOT NEW."createdAt" OR (OLD."confirmedAt" IS NOT NULL AND (OLD."confirmedAt" IS NOT NEW."confirmedAt" OR OLD."confirmedById" IS NOT NEW."confirmedById" OR OLD."confirmNote" IS NOT NEW."confirmNote"))
BEGIN
  INSERT INTO "AuditLog" ("at", "action", "entity", "entityId", "detail")
  VALUES (strftime('%Y-%m-%dT%H:%M:%f+00:00','now'), 'db.screening.update', 'Screening', NEW."id", 'changed=' || rtrim(CASE WHEN OLD."patientId" IS NOT NEW."patientId" THEN 'patientId,' ELSE '' END || CASE WHEN OLD."screenerId" IS NOT NEW."screenerId" THEN 'screenerId,' ELSE '' END || CASE WHEN OLD."weightKg" IS NOT NEW."weightKg" THEN 'weightKg,' ELSE '' END || CASE WHEN OLD."heightCm" IS NOT NEW."heightCm" THEN 'heightCm,' ELSE '' END || CASE WHEN OLD."egfr" IS NOT NEW."egfr" THEN 'egfr,' ELSE '' END || CASE WHEN OLD."doseMgDay" IS NOT NEW."doseMgDay" THEN 'doseMgDay,' ELSE '' END || CASE WHEN OLD."alcohol" IS NOT NEW."alcohol" THEN 'alcohol,' ELSE '' END || CASE WHEN OLD."drinksAlcohol" IS NOT NEW."drinksAlcohol" THEN 'drinksAlcohol,' ELSE '' END || CASE WHEN OLD."bingeDrinking" IS NOT NEW."bingeDrinking" THEN 'bingeDrinking,' ELSE '' END || CASE WHEN OLD."regularHeavyDrinking" IS NOT NEW."regularHeavyDrinking" THEN 'regularHeavyDrinking,' ELSE '' END || CASE WHEN OLD."vomiting" IS NOT NEW."vomiting" THEN 'vomiting,' ELSE '' END || CASE WHEN OLD."lowIntake" IS NOT NEW."lowIntake" THEN 'lowIntake,' ELSE '' END || CASE WHEN OLD."nsaid" IS NOT NEW."nsaid" THEN 'nsaid,' ELSE '' END || CASE WHEN OLD."herbal" IS NOT NEW."herbal" THEN 'herbal,' ELSE '' END || CASE WHEN OLD."ruleVersion" IS NOT NEW."ruleVersion" THEN 'ruleVersion,' ELSE '' END || CASE WHEN OLD."bmi" IS NOT NEW."bmi" THEN 'bmi,' ELSE '' END || CASE WHEN OLD."maxDoseMgDay" IS NOT NEW."maxDoseMgDay" THEN 'maxDoseMgDay,' ELSE '' END || CASE WHEN OLD."doseCheck" IS NOT NEW."doseCheck" THEN 'doseCheck,' ELSE '' END || CASE WHEN OLD."scoreEgfr" IS NOT NEW."scoreEgfr" THEN 'scoreEgfr,' ELSE '' END || CASE WHEN OLD."scoreBmi" IS NOT NEW."scoreBmi" THEN 'scoreBmi,' ELSE '' END || CASE WHEN OLD."scoreAlcohol" IS NOT NEW."scoreAlcohol" THEN 'scoreAlcohol,' ELSE '' END || CASE WHEN OLD."riskScore" IS NOT NEW."riskScore" THEN 'riskScore,' ELSE '' END || CASE WHEN OLD."isAlert" IS NOT NEW."isAlert" THEN 'isAlert,' ELSE '' END || CASE WHEN OLD."alertRaisedAt" IS NOT NEW."alertRaisedAt" THEN 'alertRaisedAt,' ELSE '' END || CASE WHEN OLD."createdAt" IS NOT NEW."createdAt" THEN 'createdAt,' ELSE '' END || CASE WHEN OLD."confirmedAt" IS NOT NEW."confirmedAt" THEN 'confirmedAt,' ELSE '' END || CASE WHEN OLD."confirmedById" IS NOT NEW."confirmedById" THEN 'confirmedById,' ELSE '' END || CASE WHEN OLD."confirmNote" IS NOT NEW."confirmNote" THEN 'confirmNote,' ELSE '' END, ','));
END;

CREATE TRIGGER "Screening_audit_delete" AFTER DELETE ON "Screening"
BEGIN
  INSERT INTO "AuditLog" ("at", "action", "entity", "entityId", "detail")
  VALUES (strftime('%Y-%m-%dT%H:%M:%f+00:00','now'), 'db.screening.delete', 'Screening', OLD."id", 'patientId=' || OLD."patientId");
END;
