-- Computer Crime Act §26 / rule.md: audit logs must be protected from modification or deletion.
-- These triggers make the AuditLog table append-only at the database level,
-- so even a bug in the app code cannot edit or erase a log entry.
CREATE TRIGGER "AuditLog_no_update" BEFORE UPDATE ON "AuditLog"
BEGIN
  SELECT RAISE(ABORT, 'AuditLog is append-only');
END;

CREATE TRIGGER "AuditLog_no_delete" BEFORE DELETE ON "AuditLog"
BEGIN
  SELECT RAISE(ABORT, 'AuditLog is append-only');
END;
