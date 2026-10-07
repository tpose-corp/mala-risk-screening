// Demo data. ALL SYNTHETIC (rule.md: never real patients in dev/test/demo).
// Run with: npx prisma db seed   (only fills an empty database; nothing is overwritten)
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { evaluate, type ScreeningInput } from "../src/lib/rules";

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" }),
});

const FACILITY = "รพ.สต.บ้านดู่";
const FACILITY_2 = "รพ.สต.นางแล";
const HOSPITAL = "รพ.เชียงรายประชานุเคราะห์"; // must match HOSPITAL in src/lib/session.ts

const none = { drinksAlcohol: false, bingeDrinking: false, regularHeavyDrinking: false, vomiting: false, lowIntake: false, nsaid: false, herbal: false };

async function main() {
  const demoPassword = await bcrypt.hash("mala1234", 10);

  const nurse = await db.user.upsert({
    where: { username: "somsri" },
    update: {},
    create: { username: "somsri", passwordHash: demoPassword, displayName: "สมศรี ใจดี", role: "nurse", facility: FACILITY },
  });
  await db.user.upsert({
    where: { username: "admin" },
    update: {},
    create: { username: "admin", passwordHash: demoPassword, displayName: "ผู้ดูแลระบบ (เดโม)", role: "admin", facility: FACILITY },
  });

  // Referral-hospital doctor: sees the alert inbox and every case (no screening).
  await db.user.upsert({
    where: { username: "doctor" },
    update: {},
    create: { username: "doctor", passwordHash: demoPassword, displayName: "นพ. กิตติ ใจงาม", role: "doctor", facility: HOSPITAL },
  });
  // A second รพ.สต., so the hospital inbox shows cases from more than one place.
  const nurse2 = await db.user.upsert({
    where: { username: "manee" },
    update: {},
    create: { username: "manee", passwordHash: demoPassword, displayName: "มณี รักษ์ดี", role: "nurse", facility: FACILITY_2 },
  });

  if ((await db.patient.count()) > 0) {
    console.log("Patients already exist, skipped. To start clean: npx prisma migrate reset");
    return;
  }

  const p = (name: string, dob: string, sex: string, hn: string | null) =>
    db.patient.create({ data: { name, dob, sex, hn, facility: FACILITY, createdById: nurse.id } });

  const somying = await p("นาง สมหญิง จันทร์เพ็ญ", "14/02/2501", "หญิง", "67-014822");
  const thongsuk = await p("นาง ทองสุข วงศ์ใหญ่", "03/07/2508", "หญิง", "67-021355");
  await p("นาย สมชาย กาวิละ", "21/11/2499", "ชาย", "67-018204");
  await p("นาย ประยูร สุขใจ", "08/05/2495", "ชาย", "67-009117");
  await p("นาง บัวลอย พรหมมา", "30/09/2504", "หญิง", null);

  // A screening done months ago, so the demo shows "ครั้งก่อน" values and the change since then.
  async function pastScreening(patientId: number, when: string, input: ScreeningInput, by = nurse.id) {
    const r = evaluate(input);
    const at = new Date(when);
    await db.screening.create({
      data: {
        patientId,
        screenerId: by,
        createdAt: at,
        ...input,
        alcohol: !input.drinksAlcohol ? "none" : r.heavyAlcohol ? "heavy" : "light",
        ruleVersion: r.ruleVersion,
        bmi: r.bmi,
        maxDoseMgDay: r.maxDoseMgDay,
        doseCheck: r.doseCheck,
        scoreEgfr: r.scoreEgfr,
        scoreBmi: r.scoreBmi,
        scoreAlcohol: r.scoreAlcohol,
        riskScore: r.riskScore,
        isAlert: r.isAlert,
        alertRaisedAt: r.isAlert ? at : null,
        adviceGivenAt: r.sickDayReasons.length ? at : null,
        confirmedAt: at,
        confirmedById: by,
      },
    });
  }
  // สมหญิง: normal in June (score 0). In the demo, screen her again with eGFR 38 / 52 kg / 2000 mg
  // to show the result turning red and the drop from last time.
  await pastScreening(somying.id, "2026-06-12T09:30:00+07:00", { ...none, weightKg: 60, heightCm: 158, egfr: 62, doseMgDay: 2000 });
  // ทองสุข: clean result in July.
  await pastScreening(thongsuk.id, "2026-07-02T10:15:00+07:00", { ...none, weightKg: 63, heightCm: 160, egfr: 70, doseMgDay: 1000 });

  // รพ.สต.นางแล: a recent alert that the hospital has not picked up yet.
  const kham = await db.patient.create({
    data: { name: "นาย คำปัน ศรีวงศ์", dob: "02/03/2497", sex: "ชาย", hn: "67-030561", facility: FACILITY_2, createdById: nurse2.id },
  });
  const recently = new Date(Date.now() - 25 * 60 * 1000); // 25 minutes before seeding, never in the future
  await pastScreening(kham.id, recently.toISOString(), { ...none, weightKg: 55, heightCm: 165, egfr: 33, doseMgDay: 2000, nsaid: true }, nurse2.id);

  console.log("Seeded synthetic demo data. Password mala1234 for: somsri, manee (รพ.สต.), doctor (รพ.), admin");
}

main().finally(() => db.$disconnect());
