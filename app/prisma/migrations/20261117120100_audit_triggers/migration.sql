-- Audit protection (Computer Crime Act §26, rule.md). Hand-written: Prisma cannot express triggers.
--
-- 1) AuditLog is append-only for everyone, the admin and the database owner's app included.
-- 2) Any change to a sensitive table that did NOT come through the app is written to AuditLog as
--    "db.<table>.<op>" (e.g. someone editing the database directly). The app marks its own writes
--    with `set_config('mala.actor', <user id>, true)` inside a transaction (src/lib/actor.ts) and
--    audits them itself, with the user's name, so they are skipped here.
--    `detail` holds column NAMES only, never values (no patient data in the log).

CREATE FUNCTION audit_log_block() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only';
END $$;

CREATE TRIGGER "AuditLog_no_update" BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION audit_log_block();
CREATE TRIGGER "AuditLog_no_truncate" BEFORE TRUNCATE ON "AuditLog"
  FOR EACH STATEMENT EXECUTE FUNCTION audit_log_block();

CREATE FUNCTION audit_db_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  actor text := current_setting('mala.actor', true);
  row_id int;
  changed text;
BEGIN
  IF actor IS NOT NULL AND actor <> '' THEN
    RETURN COALESCE(NEW, OLD); -- written by the app, which audits it itself
  END IF;

  IF TG_OP = 'DELETE' THEN
    row_id := (to_jsonb(OLD) ->> 'id')::int;
  ELSE
    row_id := (to_jsonb(NEW) ->> 'id')::int;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    SELECT string_agg(n.key, ',' ORDER BY n.key) INTO changed
    FROM jsonb_each(to_jsonb(NEW)) n
    JOIN jsonb_each(to_jsonb(OLD)) o USING (key)
    WHERE n.value IS DISTINCT FROM o.value AND n.key NOT IN ('updatedAt', 'lastLoginAt');
    IF changed IS NULL THEN
      RETURN NEW; -- nothing that matters changed
    END IF;
    changed := 'changed=' || changed;
  END IF;

  INSERT INTO "AuditLog" ("at", "action", "entity", "entityId", "detail")
  VALUES (now(), 'db.' || lower(TG_TABLE_NAME) || '.' || lower(TG_OP), TG_TABLE_NAME, row_id, changed);
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER "User_audit" AFTER INSERT OR UPDATE OR DELETE ON "User"
  FOR EACH ROW EXECUTE FUNCTION audit_db_change();
CREATE TRIGGER "Patient_audit" AFTER UPDATE OR DELETE ON "Patient"
  FOR EACH ROW EXECUTE FUNCTION audit_db_change();
CREATE TRIGGER "Screening_audit" AFTER UPDATE OR DELETE ON "Screening"
  FOR EACH ROW EXECUTE FUNCTION audit_db_change();
CREATE TRIGGER "Amendment_audit" AFTER UPDATE OR DELETE ON "Amendment"
  FOR EACH ROW EXECUTE FUNCTION audit_db_change();
CREATE TRIGGER "RuleSet_audit" AFTER INSERT OR UPDATE OR DELETE ON "RuleSet"
  FOR EACH ROW EXECUTE FUNCTION audit_db_change();
CREATE TRIGGER "Facility_audit" AFTER INSERT OR UPDATE OR DELETE ON "Facility"
  FOR EACH ROW EXECUTE FUNCTION audit_db_change();
