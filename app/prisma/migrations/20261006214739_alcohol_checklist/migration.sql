-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Screening" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "patientId" INTEGER NOT NULL,
    "screenerId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weightKg" REAL NOT NULL,
    "heightCm" REAL NOT NULL,
    "egfr" REAL NOT NULL,
    "doseMgDay" INTEGER NOT NULL,
    "alcohol" TEXT NOT NULL,
    "drinksAlcohol" BOOLEAN NOT NULL DEFAULT false,
    "bingeDrinking" BOOLEAN NOT NULL DEFAULT false,
    "regularHeavyDrinking" BOOLEAN NOT NULL DEFAULT false,
    "vomiting" BOOLEAN NOT NULL,
    "lowIntake" BOOLEAN NOT NULL,
    "nsaid" BOOLEAN NOT NULL,
    "herbal" BOOLEAN NOT NULL,
    "ruleVersion" TEXT NOT NULL,
    "bmi" REAL NOT NULL,
    "maxDoseMgDay" INTEGER NOT NULL,
    "doseCheck" TEXT NOT NULL,
    "scoreEgfr" INTEGER NOT NULL,
    "scoreBmi" INTEGER NOT NULL,
    "scoreAlcohol" INTEGER NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "isAlert" BOOLEAN NOT NULL,
    "alertRaisedAt" DATETIME,
    "adviceGivenAt" DATETIME,
    "confirmedAt" DATETIME,
    "confirmedById" INTEGER,
    "confirmNote" TEXT,
    CONSTRAINT "Screening_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Screening_screenerId_fkey" FOREIGN KEY ("screenerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Screening_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Screening" ("adviceGivenAt", "alcohol", "alertRaisedAt", "bmi", "confirmNote", "confirmedAt", "confirmedById", "createdAt", "doseCheck", "doseMgDay", "egfr", "heightCm", "herbal", "id", "isAlert", "lowIntake", "maxDoseMgDay", "nsaid", "patientId", "riskScore", "ruleVersion", "scoreAlcohol", "scoreBmi", "scoreEgfr", "screenerId", "vomiting", "weightKg") SELECT "adviceGivenAt", "alcohol", "alertRaisedAt", "bmi", "confirmNote", "confirmedAt", "confirmedById", "createdAt", "doseCheck", "doseMgDay", "egfr", "heightCm", "herbal", "id", "isAlert", "lowIntake", "maxDoseMgDay", "nsaid", "patientId", "riskScore", "ruleVersion", "scoreAlcohol", "scoreBmi", "scoreEgfr", "screenerId", "vomiting", "weightKg" FROM "Screening";
DROP TABLE "Screening";
ALTER TABLE "new_Screening" RENAME TO "Screening";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
