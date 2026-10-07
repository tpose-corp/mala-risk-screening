-- Team decision: do not store client IP addresses in the audit log.
ALTER TABLE "AuditLog" DROP COLUMN "ip";
