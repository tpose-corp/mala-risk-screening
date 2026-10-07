-- CreateIndex
CREATE INDEX "Screening_isAlert_acknowledgedAt_idx" ON "Screening"("isAlert", "acknowledgedAt");

-- CreateIndex
CREATE INDEX "Screening_isAlert_alertRaisedAt_idx" ON "Screening"("isAlert", "alertRaisedAt");

-- CreateIndex
CREATE INDEX "Screening_patientId_createdAt_idx" ON "Screening"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "Screening_createdAt_idx" ON "Screening"("createdAt");
