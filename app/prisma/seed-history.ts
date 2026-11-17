// Five years of SYNTHETIC history (Nov 2021 to Nov 2026) for demos and testing the hospital
// pages with realistic volume. Run AFTER prisma/seed.ts on an empty database:
//   npx prisma db seed && npx tsx prisma/seed-history.ts
// Every name, ID and value is made up. National IDs use a deliberately wrong check digit (same
// idea as the hospital's synthetic test file), so none can match a real person.
//
// What it models, roughly as in a district primary-care network:
//   8 units, 1 to 2 screening staff each, about 50 to 70 diabetic patients on Metformin per unit
//   patients join over the 5 years; each is screened every 3 to 6 months (sometimes missed)
//   eGFR falls 1 to 3 a year (faster for some), weight drifts, doses step 500 to 2000 mg
//   after a dose alert the doctor usually lowers the dose by the next visit
//   alerts are acknowledged within hours to 2 days; only the last few days are still open
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import { evaluate, maxDoseForEgfr } from "../src/lib/rules";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

// ---- deterministic random (same data every run) ----
let seed = 20261117;
const rnd = () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const between = (a: number, b: number) => a + (b - a) * rnd();
const int = (a: number, b: number) => Math.floor(between(a, b + 1));
const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
const chance = (p: number) => rnd() < p;
const normal = (mean: number, sd: number) => mean + sd * Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(2 * Math.PI * rnd());

// ---- time helpers (Bangkok working hours) ----
const START = new Date("2021-11-15T00:00:00+07:00");
const NOW = new Date();
const DAY = 86_400_000;
function workTime(d: Date) {
  // move to a weekday, 08:30 to 16:00 Bangkok time
  const x = new Date(d);
  while ([0, 6].includes(new Date(x.getTime() + 7 * 3600_000).getUTCDay())) x.setTime(x.getTime() + DAY);
  const day = new Date(x.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
  const minutes = int(8 * 60 + 30, 16 * 60);
  return new Date(`${day}T${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:${String(int(0, 59)).padStart(2, "0")}+07:00`);
}
const addHours = (d: Date, h: number) => new Date(d.getTime() + h * 3600_000);

function fakeCardId(n: number) {
  const body = `70000000${String(n).padStart(4, "0")}`;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(body[i]) * (13 - i);
  return body + String(((11 - (sum % 11)) % 10 + 1) % 10);
}

// ---- reference data ----
const NEW_UNITS = [
  { code: "07705", name: "รพ.สต.ห้วยสัก", herbal: 0.22, nsaid: 0.1 },
  { code: "07706", name: "รพ.สต.แม่ยาว", herbal: 0.3, nsaid: 0.14 }, // a hill-area unit: more herbal remedies
  { code: "07707", name: "รพ.สต.ท่าสุด", herbal: 0.12, nsaid: 0.2 }, // near the market: more ยาชุด
  { code: "07708", name: "รพ.สต.บ้านป่าอ้อ", herbal: 0.15, nsaid: 0.08 },
];
const OLD_UNITS: Record<string, { herbal: number; nsaid: number }> = {
  "รพ.สต.บ้านดู่": { herbal: 0.12, nsaid: 0.1 },
  "รพ.สต.นางแล": { herbal: 0.18, nsaid: 0.16 },
  "รพ.สต.ดอยลาน": { herbal: 0.26, nsaid: 0.09 },
  "ศสม.เวียงเหนือ": { herbal: 0.08, nsaid: 0.12 },
};
const FIRST_F = ["สมพร", "บุญมี", "จันทร์เพ็ญ", "แสงดาว", "บัวคำ", "ศรีนวล", "คำแปง", "ประไพ", "อำไพ", "สุนันทา", "พิมพ์ใจ", "ดวงใจ", "มณีวรรณ", "ทองใบ", "เกษร", "จำปี", "ลำดวน", "นงเยาว์", "สายบัว", "ปราณี", "วันเพ็ญ", "อุไร", "บุญเรือน", "คำมูล"];
const FIRST_M = ["สมศักดิ์", "บุญส่ง", "ประเสริฐ", "คำปัน", "อินทร์", "สุรชัย", "ชัยวัฒน์", "บุญเลิศ", "ทองดี", "สมบูรณ์", "วิชัย", "อุดม", "จันทร์แก้ว", "ศรีวงศ์", "มานพ", "ประยุทธ", "เสาร์คำ", "บุญทา", "สุพจน์", "อนันต์"];
const LAST = ["ใจดี", "แก้วมูล", "ปัญญาวงศ์", "สุริยะ", "อินทะวงศ์", "คำมา", "ศรีบุญเรือง", "กาวิละ", "ไชยวงศ์", "ธรรมใจ", "จันทร์ทิพย์", "บุญเป็ง", "ปินตา", "ยาวิชัย", "ทาแก้ว", "มณีวงศ์", "สิทธิกุล", "วงศ์ใหญ่", "พรหมมา", "แสงคำ", "ใจเย็น", "นันทะ", "อุ่นเรือน", "เตชะ"];
const STAFF = ["วิไลวรรณ", "กนกพร", "ศิริพร", "จิราพร", "ธนพล", "สุดารัตน์", "อรอุมา", "ปิยะนุช", "ณัฐวุฒิ", "พัชรี", "รัตนา", "เยาวลักษณ์"];
const NSAID_NOTES = ["ยาชุดแก้ปวดเมื่อย ซื้อจากร้านชำ", "ไดโคลฟีแนค จากร้านยา", "ยาแก้ปวดเข่า ไอบูโพรเฟน", "ยาชุดซองสีเหลือง ร้านชำในหมู่บ้าน", "ยาแก้อักเสบจากรถเร่", "นาพรอกเซน ซื้อเอง"];
const HERBAL_NOTES = ["ยาต้มสมุนไพรหมอพื้นบ้าน", "ฟ้าทะลายโจรแคปซูล", "กระชายขาวต้ม", "ชาใบหม่อน", "ยาหม้อแก้ปวดเมื่อย", "อาหารเสริมเห็ดหลินจือ", "มะระขี้นกตากแห้ง", "ยาลูกกลอนจากวัด"];
const FOLLOW_DOSE = ["นัดพบแพทย์เพื่อปรับลดขนาดยา Metformin", "ปรับลด Metformin ตาม eGFR แจ้ง รพ.สต. แล้ว", "หยุด Metformin ชั่วคราว นัดตรวจ eGFR ซ้ำ 2 สัปดาห์", "เปลี่ยนเป็นยาเบาหวานกลุ่มอื่น นัดติดตามที่คลินิก NCD"];
const FOLLOW_RISK = ["ติดตามใกล้ชิด นัดตรวจ eGFR ซ้ำภายใน 1 เดือน", "ให้ความรู้ Sick Day Rules ทางโทรศัพท์", "ประสานเภสัชกรลงเยี่ยมบ้าน", "แนะนำงดแอลกอฮอล์ ส่งต่อคลินิกเลิกสุรา", "ติดตามน้ำหนักและการกินอาหาร นัด 3 เดือน"];
const DOSES = [500, 1000, 1500, 2000];

async function main() {
  if ((await db.patient.count()) > 20) {
    console.log("History already present, skipped.");
    return;
  }
  const pw = await bcrypt.hash("mala1234", 10);
  const admin = await db.user.findUniqueOrThrow({ where: { username: "admin" } });
  const clinicians = await db.user.findMany({ where: { role: "clinician" } });

  // units + staff
  for (const u of NEW_UNITS) await db.facility.create({ data: { code: u.code, name: u.name, createdAt: START, updatedAt: START } });
  const units = await db.facility.findMany({ orderBy: { id: "asc" } });
  const staffBy = new Map<string, { id: number }[]>();
  let s = 0;
  for (const u of units) {
    const existing = await db.user.findMany({ where: { role: "pcu", facility: u.name } });
    const list = [...existing];
    const want = u.name === "ศสม.เวียงเหนือ" ? 2 : int(1, 2);
    while (list.length < want) {
      const name = STAFF[s++ % STAFF.length];
      list.push(await db.user.create({
        data: { username: `${u.code}.${s}`, passwordHash: pw, displayName: `${name} ${pick(LAST)}`, role: "pcu", facility: u.name, position: pick(["พยาบาลวิชาชีพ", "นักวิชาการสาธารณสุข", "เจ้าพนักงานสาธารณสุข"]), mustChangePassword: false, createdAt: START, updatedAt: START },
      }));
    }
    staffBy.set(u.name, list);
  }

  const habits = (unit: string) => OLD_UNITS[unit] ?? NEW_UNITS.find((u) => u.name === unit)!;
  let cardNo = 100;
  let made = 0;
  const screenings: Prisma.ScreeningCreateManyInput[] = [];
  const amendments: { patientId: number; at: Date; field: string; oldValue: string; newValue: string; reason: string }[] = [];

  for (const unit of units) {
    const staff = staffBy.get(unit.name)!;
    const nPatients = int(48, 70);
    for (let i = 0; i < nPatients; i++) {
      // when they joined: more people in the early years (the clinic list was built up then)
      const joinedAt = workTime(new Date(START.getTime() + Math.pow(rnd(), 1.6) * (NOW.getTime() - START.getTime() - 3 * DAY)));
      const female = chance(0.6);
      const age = Math.round(Math.min(88, Math.max(38, normal(63, 10))));
      const bornBE = joinedAt.getFullYear() + 543 - age;
      const dob = `${String(int(1, 28)).padStart(2, "0")}/${String(int(1, 12)).padStart(2, "0")}/${bornBE}`;
      const name = `${female ? pick(["นาง", "นาง", "น.ส."]) : "นาย"} ${pick(female ? FIRST_F : FIRST_M)} ${pick(LAST)}`;
      const recent = NOW.getTime() - joinedAt.getTime() < 10 * DAY;
      // a few leave the list (moved away, stopped Metformin, died): deactivated, never deleted
      const stoppedAt = !recent && chance(0.04) ? new Date(joinedAt.getTime() + between(0.3, 0.9) * (NOW.getTime() - joinedAt.getTime())) : null;
      const pending = recent && chance(0.7);
      const patient = await db.patient.create({
        data: {
          cardId: fakeCardId(cardNo++), hn: pending ? null : `90${String(200000 + cardNo)}`, name, dob, sex: female ? "หญิง" : "ชาย",
          facility: unit.name, status: pending ? "pending" : "verified", active: !stoppedAt,
          verifiedAt: pending ? null : addHours(joinedAt, between(2, 72)), verifiedById: pending ? null : admin.id,
          registeredAt: joinedAt, createdAt: joinedAt, updatedAt: stoppedAt ?? joinedAt, createdById: pick(staff).id,
        },
      });
      made++;

      // the person's own course over time
      const height = Math.round(female ? normal(154, 6) : normal(165, 6));
      let weight = Math.max(40, normal(female ? 65 : 73, 9)); // type 2 diabetes: mostly overweight
      let egfr = Math.min(118, Math.max(28, normal(74, 19)));
      const decline = chance(0.15) ? between(4, 8) : between(0.8, 3);
      let dose = pick(DOSES);
      const drinker = !female && chance(0.3) ? (chance(0.35) ? "heavy" : "light") : chance(0.05) ? "light" : "none";
      const h = habits(unit.name);
      const usesHerbal = chance(h.herbal * 1.4);
      const usesNsaid = chance(h.nsaid * 1.4);
      const herbalNote = pick(HERBAL_NOTES);
      const nsaidNote = pick(NSAID_NOTES);

      let when = joinedAt;
      let first = true;
      while (when < NOW && (!stoppedAt || when < stoppedAt)) {
        if (!first) {
          const years = (when.getTime() - joinedAt.getTime()) / (365 * DAY);
          egfr = Math.max(12, egfr - decline * (when.getTime() - (screenings.at(-1)?.createdAt as Date).getTime()) / (365 * DAY) + normal(0, 3));
          weight = Math.max(36, weight + normal(0, 1.6) - (years > 3 ? 0.3 : 0));
        }
        const drinksAlcohol = drinker !== "none";
        const heavy = drinker === "heavy" && chance(0.8);
        const input = {
          weightKg: Math.round(weight * 10) / 10, heightCm: height, egfr: Math.round(egfr), doseMgDay: dose,
          drinksAlcohol, bingeDrinking: heavy && chance(0.6), regularHeavyDrinking: heavy && chance(0.7),
          vomiting: chance(0.04), lowIntake: chance(0.05), nsaid: usesNsaid && chance(0.5), herbal: usesHerbal && chance(0.6),
        };
        const r = evaluate(input);
        const isLast = when.getTime() > NOW.getTime() - 6 * DAY;
        const confirmed = !isLast || chance(0.6);
        const alertAt = r.isAlert ? when : null;
        // the hospital picks alerts up within hours to two days; only the last few days are still open
        const ackAt = r.isAlert && NOW.getTime() - when.getTime() > 2 * DAY ? addHours(when, chance(0.7) ? between(0.5, 8) : between(18, 50)) : null;
        const clinician = pick(clinicians);
        const needsAdvice = r.sickDayReasons.length > 0;
        screenings.push({
          patientId: patient.id, facility: unit.name, screenerId: pick(staff).id,
          createdAt: when, updatedAt: confirmed ? addHours(when, between(0.05, 0.4)) : when,
          ...input,
          egfrDate: (() => { const d = new Date(when.getTime() - int(3, 40) * DAY + 7 * 3600_000); return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear() + 543}`; })(),
          nsaidNote: input.nsaid ? nsaidNote : null, herbalNote: input.herbal ? herbalNote : null,
          alcohol: !drinksAlcohol ? "none" : r.heavyAlcohol ? "heavy" : "light",
          ruleVersion: r.ruleVersion, bmi: r.bmi, maxDoseMgDay: r.maxDoseMgDay, doseCheck: r.doseCheck,
          scoreEgfr: r.scoreEgfr, scoreBmi: r.scoreBmi, scoreAlcohol: r.scoreAlcohol, riskScore: r.riskScore, riskGroup: r.riskGroup,
          isAlert: r.isAlert, alertKind: r.alertKind, alertRaisedAt: alertAt,
          adviceGivenAt: confirmed && needsAdvice ? addHours(when, 0.1) : null,
          acknowledgedAt: ackAt, acknowledgedById: ackAt ? clinician.id : null,
          followUpNote: ackAt && chance(0.75) ? pick(r.alertKind === "dose" ? FOLLOW_DOSE : FOLLOW_RISK) : null,
          followUpAt: ackAt ? addHours(ackAt, between(0.1, 3)) : null,
          followUpById: ackAt ? clinician.id : null,
          confirmedAt: confirmed ? addHours(when, between(0.05, 0.4)) : null, confirmedById: confirmed ? pick(staff).id : null,
        });
        // the doctor's answer shows up at the next visit
        if (r.doseCheck !== "ok" && chance(0.65)) dose = Math.max(500, maxDoseForEgfr(egfr) || 500);
        if (r.doseCheck === "contraindicated" && chance(0.5)) break; // switched off Metformin, leaves the list
        first = false;
        when = workTime(new Date(when.getTime() + (chance(0.12) ? between(200, 330) : between(85, 185)) * DAY));
      }
      if (stoppedAt) {
        amendments.push({ patientId: patient.id, at: stoppedAt, field: "active", oldValue: "true", newValue: "false", reason: pick(["ผู้ป่วยย้ายไปรักษาต่างจังหวัด", "แพทย์หยุดยา Metformin", "ผู้ป่วยเสียชีวิต (แจ้งจาก รพ.สต.)"]) });
      }
    }
  }

  // follow-up fields only where a note exists
  for (const x of screenings) if (!x.followUpNote) { x.followUpAt = null; x.followUpById = null; }
  for (let i = 0; i < screenings.length; i += 500) await db.screening.createMany({ data: screenings.slice(i, i + 500) });
  await db.amendment.createMany({ data: amendments.map((a) => ({ ...a, byId: admin.id, entity: "Patient", entityId: a.patientId })) });

  const alerts = screenings.filter((x) => x.isAlert).length;
  const open = screenings.filter((x) => x.isAlert && !x.acknowledgedAt).length;
  console.log(`History: ${units.length} units, ${made} patients, ${screenings.length} screenings, ${alerts} alerts (${open} still open), ${amendments.length} deactivations`);
}

main().finally(() => db.$disconnect());
