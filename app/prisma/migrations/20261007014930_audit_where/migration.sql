-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN "device" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "ip" TEXT;

-- CreateIndex
CREATE INDEX "AuditLog_at_idx" ON "AuditLog"("at");
