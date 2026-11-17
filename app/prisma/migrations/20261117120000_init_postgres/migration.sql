-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Facility" (
    "id" SERIAL NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "facility" TEXT,
    "position" TEXT,
    "licenseNo" TEXT,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" SERIAL NOT NULL,
    "cardId" TEXT NOT NULL,
    "hn" TEXT,
    "name" TEXT NOT NULL,
    "dob" TEXT NOT NULL,
    "sex" TEXT NOT NULL,
    "phone" TEXT,
    "facility" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Screening" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "facility" TEXT NOT NULL,
    "screenerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "heightCm" DOUBLE PRECISION NOT NULL,
    "egfr" DOUBLE PRECISION NOT NULL,
    "egfrDate" TEXT,
    "doseMgDay" INTEGER NOT NULL,
    "alcohol" TEXT NOT NULL,
    "drinksAlcohol" BOOLEAN NOT NULL DEFAULT false,
    "bingeDrinking" BOOLEAN NOT NULL DEFAULT false,
    "regularHeavyDrinking" BOOLEAN NOT NULL DEFAULT false,
    "vomiting" BOOLEAN NOT NULL,
    "lowIntake" BOOLEAN NOT NULL,
    "nsaid" BOOLEAN NOT NULL,
    "nsaidNote" TEXT,
    "herbal" BOOLEAN NOT NULL,
    "herbalNote" TEXT,
    "ruleVersion" TEXT NOT NULL,
    "bmi" DOUBLE PRECISION NOT NULL,
    "maxDoseMgDay" INTEGER NOT NULL,
    "doseCheck" TEXT NOT NULL,
    "scoreEgfr" INTEGER NOT NULL,
    "scoreBmi" INTEGER NOT NULL,
    "scoreAlcohol" INTEGER NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "riskGroup" BOOLEAN NOT NULL DEFAULT false,
    "isAlert" BOOLEAN NOT NULL,
    "alertKind" TEXT,
    "alertRaisedAt" TIMESTAMP(3),
    "adviceGivenAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedById" INTEGER,
    "followUpNote" TEXT,
    "followUpAt" TIMESTAMP(3),
    "followUpById" INTEGER,
    "confirmedAt" TIMESTAMP(3),
    "confirmedById" INTEGER,
    "confirmNote" TEXT,

    CONSTRAINT "Screening_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Amendment" (
    "id" SERIAL NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "byId" INTEGER NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "patientId" INTEGER NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "reason" TEXT NOT NULL,

    CONSTRAINT "Amendment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleSet" (
    "id" SERIAL NOT NULL,
    "version" TEXT NOT NULL,
    "params" JSONB NOT NULL,
    "approvedBy" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" INTEGER,

    CONSTRAINT "RuleSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" INTEGER,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Manual" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "audience" TEXT NOT NULL DEFAULT 'all',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedById" INTEGER NOT NULL,

    CONSTRAINT "Manual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER,
    "username" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" INTEGER,
    "detail" TEXT,
    "device" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Facility_code_key" ON "Facility"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Facility_name_key" ON "Facility"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_cardId_key" ON "Patient"("cardId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_hn_key" ON "Patient"("hn");

-- CreateIndex
CREATE INDEX "Patient_facility_idx" ON "Patient"("facility");

-- CreateIndex
CREATE INDEX "Patient_name_idx" ON "Patient"("name");

-- CreateIndex
CREATE INDEX "Screening_isAlert_acknowledgedAt_idx" ON "Screening"("isAlert", "acknowledgedAt");

-- CreateIndex
CREATE INDEX "Screening_isAlert_alertKind_alertRaisedAt_idx" ON "Screening"("isAlert", "alertKind", "alertRaisedAt");

-- CreateIndex
CREATE INDEX "Screening_patientId_createdAt_idx" ON "Screening"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "Screening_facility_createdAt_idx" ON "Screening"("facility", "createdAt");

-- CreateIndex
CREATE INDEX "Screening_createdAt_idx" ON "Screening"("createdAt");

-- CreateIndex
CREATE INDEX "Amendment_patientId_at_idx" ON "Amendment"("patientId", "at");

-- CreateIndex
CREATE INDEX "Amendment_entity_entityId_idx" ON "Amendment"("entity", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "RuleSet_version_key" ON "RuleSet"("version");

-- CreateIndex
CREATE INDEX "AuditLog_at_idx" ON "AuditLog"("at");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_facility_fkey" FOREIGN KEY ("facility") REFERENCES "Facility"("name") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_facility_fkey" FOREIGN KEY ("facility") REFERENCES "Facility"("name") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Screening" ADD CONSTRAINT "Screening_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Screening" ADD CONSTRAINT "Screening_facility_fkey" FOREIGN KEY ("facility") REFERENCES "Facility"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Screening" ADD CONSTRAINT "Screening_screenerId_fkey" FOREIGN KEY ("screenerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Screening" ADD CONSTRAINT "Screening_acknowledgedById_fkey" FOREIGN KEY ("acknowledgedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Screening" ADD CONSTRAINT "Screening_followUpById_fkey" FOREIGN KEY ("followUpById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Screening" ADD CONSTRAINT "Screening_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Amendment" ADD CONSTRAINT "Amendment_byId_fkey" FOREIGN KEY ("byId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleSet" ADD CONSTRAINT "RuleSet_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Manual" ADD CONSTRAINT "Manual_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

