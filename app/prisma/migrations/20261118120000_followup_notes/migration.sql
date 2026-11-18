-- "การดำเนินการกับผู้ป่วย" as a history: each note is its own row (who, what, when).
-- Before this, a new note replaced the old one on the Screening row.

CREATE TABLE "FollowUpNote" (
    "id" SERIAL NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "screeningId" INTEGER NOT NULL,
    "byId" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    CONSTRAINT "FollowUpNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FollowUpNote_screeningId_at_idx" ON "FollowUpNote"("screeningId", "at");

ALTER TABLE "FollowUpNote" ADD CONSTRAINT "FollowUpNote_screeningId_fkey" FOREIGN KEY ("screeningId") REFERENCES "Screening"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FollowUpNote" ADD CONSTRAINT "FollowUpNote_byId_fkey" FOREIGN KEY ("byId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Keep the notes written so far (the latest note of each case, with its writer and time).
INSERT INTO "FollowUpNote" ("at", "screeningId", "byId", "note")
SELECT "followUpAt", "id", "followUpById", "followUpNote" FROM "Screening"
WHERE "followUpNote" IS NOT NULL AND "followUpById" IS NOT NULL AND "followUpAt" IS NOT NULL;

-- Append-only, the same way as AuditLog: nobody can change or delete a note once written.
CREATE FUNCTION followup_note_block() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'FollowUpNote is append-only';
END $$;

CREATE TRIGGER "FollowUpNote_no_update" BEFORE UPDATE OR DELETE ON "FollowUpNote"
  FOR EACH ROW EXECUTE FUNCTION followup_note_block();
CREATE TRIGGER "FollowUpNote_no_truncate" BEFORE TRUNCATE ON "FollowUpNote"
  FOR EACH STATEMENT EXECUTE FUNCTION followup_note_block();
