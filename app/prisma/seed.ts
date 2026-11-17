// Demo data. ALL SYNTHETIC (rule.md: never real patients in dev/test/demo).
// National IDs follow the hospital's synthetic test file: 13 digits that deliberately FAIL the
// Thai ID check digit, so they can never match a real person.
// Run with: npx prisma db seed   (only fills an empty database; nothing is overwritten)
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { evaluate, type ScreeningInput } from "../src/lib/rules";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const UNITS = [
  { code: "07701", name: "รพ.สต.บ้านดู่" },
  { code: "07702", name: "รพ.สต.นางแล" },
  { code: "07703", name: "รพ.สต.ดอยลาน" },
  { code: "07704", name: "ศสม.เวียงเหนือ" },
];
const [BANDU, NANGLAE, DOILAN] = UNITS.map((u) => u.name);

// 7000000000nn + a check digit that is deliberately WRONG (same idea as the hospital's test file).
function fakeCardId(n: number) {
  const body = `700000000${String(n).padStart(3, "0")}`;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(body[i]) * (13 - i);
  const right = (11 - (sum % 11)) % 10;
  return body + String((right + 1) % 10);
}

const none = { drinksAlcohol: false, bingeDrinking: false, regularHeavyDrinking: false, vomiting: false, lowIntake: false, nsaid: false, herbal: false };

async function main() {
  if ((await db.user.count()) > 0) {
    console.log("Database already has data, skipped. To start clean, create an empty database first.");
    return;
  }
  const pw = await bcrypt.hash("mala1234", 10);

  for (const u of UNITS) await db.facility.create({ data: u });

  // Demo accounts have mustChangePassword = false so the demo flows straight through.
  const mk = (username: string, displayName: string, role: string, facility: string | null, position: string, licenseNo: string | null = null) =>
    db.user.create({ data: { username, passwordHash: pw, displayName, role, facility, position, licenseNo, mustChangePassword: false } });

  const admin = await mk("admin", "ผู้ดูแลระบบ ศูนย์ข้อมูลยา", "admin", null, "เภสัชกร");
  await mk("doctor", "นพ. กิตติ ใจงาม", "clinician", null, "แพทย์", "ว.00000");
  await mk("nurse", "พว. วรรณา ดูแลดี", "clinician", null, "พยาบาลวิชาชีพ", "พ.00000");
  const somsri = await mk("somsri", "สมศรี ใจดี", "pcu", BANDU, "พยาบาลวิชาชีพ");
  const manee = await mk("manee", "มณี รักษ์ดี", "pcu", NANGLAE, "พยาบาลวิชาชีพ");
  await mk("somchai", "สมชาย ตั้งใจ", "pcu", DOILAN, "นักวิชาการสาธารณสุข");

  let n = 0;
  const patient = (name: string, dob: string, sex: string, facility: string, by: number, verified: boolean, registeredAt: string) => {
    n++;
    return db.patient.create({
      data: {
        cardId: fakeCardId(n),
        hn: verified ? `90${String(100000 + n)}` : null,
        name, dob, sex, facility,
        status: verified ? "verified" : "pending",
        verifiedAt: verified ? new Date(registeredAt) : null,
        verifiedById: verified ? admin.id : null,
        registeredAt: new Date(registeredAt),
        createdAt: new Date(registeredAt),
        updatedAt: new Date(registeredAt),
        createdById: by,
      },
    });
  };

  const somying = await patient("นาง สมหญิง จันทร์เพ็ญ", "14/02/2501", "หญิง", BANDU, somsri.id, true, "2026-05-02T09:00:00+07:00");
  const thongsuk = await patient("นาง ทองสุข วงศ์ใหญ่", "03/07/2508", "หญิง", BANDU, somsri.id, true, "2026-05-02T09:10:00+07:00");
  await patient("นาย สมชาย กาวิละ", "21/11/2499", "ชาย", BANDU, somsri.id, true, "2026-05-03T10:00:00+07:00");
  await patient("นาย ประยูร สุขใจ", "08/05/2495", "ชาย", BANDU, somsri.id, true, "2026-05-03T10:20:00+07:00");
  await patient("นาง บัวลอย พรหมมา", "30/09/2504", "หญิง", BANDU, somsri.id, false, "2026-11-16T14:05:00+07:00");
  const kham = await patient("นาย คำปัน ศรีวงศ์", "02/03/2497", "ชาย", NANGLAE, manee.id, true, "2026-06-10T08:40:00+07:00");
  const jan = await patient("นาง จันทร์ดี แสงคำ", "11/12/2500", "หญิง", NANGLAE, manee.id, true, "2026-06-10T09:00:00+07:00");
  await patient("นาย บุญมา ใจเย็น", "05/06/2503", "ชาย", DOILAN, somsri.id, true, "2026-07-01T09:00:00+07:00");

  async function screening(p: { id: number; facility: string | null }, when: Date, input: ScreeningInput, by: number, done = true) {
    const r = evaluate(input);
    await db.screening.create({
      data: {
        patientId: p.id,
        facility: p.facility!,
        screenerId: by,
        createdAt: when,
        updatedAt: when,
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
        riskGroup: r.riskGroup,
        isAlert: r.isAlert,
        alertKind: r.alertKind,
        alertRaisedAt: r.isAlert ? when : null,
        adviceGivenAt: done && r.sickDayReasons.length ? when : null,
        confirmedAt: done ? when : null,
        confirmedById: done ? by : null,
      },
    });
  }
  const ago = (min: number) => new Date(Date.now() - min * 60 * 1000);

  // สมหญิง: normal in June. In the demo, screen her again with eGFR 38 / 52 kg / 2000 mg.
  await screening(somying, new Date("2026-06-12T09:30:00+07:00"), { ...none, weightKg: 60, heightCm: 158, egfr: 62, doseMgDay: 2000 }, somsri.id);
  await screening(thongsuk, new Date("2026-07-02T10:15:00+07:00"), { ...none, weightKg: 63, heightCm: 160, egfr: 70, doseMgDay: 1000 }, somsri.id);
  // นางแล: a dose alert (tab ใช้ยาเกินขนาด) and a general risk alert (tab เสี่ยงทั่วไป), both waiting.
  await screening(kham, ago(25), { ...none, weightKg: 55, heightCm: 165, egfr: 33, doseMgDay: 2000, nsaid: true, nsaidNote: "ยาชุดแก้ปวดเมื่อย จากร้านชำในหมู่บ้าน" } as ScreeningInput, manee.id);
  await screening(jan, ago(90), { ...none, weightKg: 48, heightCm: 155, egfr: 72, doseMgDay: 1000, herbal: true, herbalNote: "ยาต้มสมุนไพรหมอพื้นบ้าน" } as ScreeningInput, manee.id);

  console.log("Seeded synthetic demo data. Password mala1234 for: admin, doctor, nurse (รพ.), somsri, manee, somchai (รพ.สต.)");
}

main().finally(() => db.$disconnect());
