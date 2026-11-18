// Thai date/time helpers (Bangkok time) and shared labels.
const TZ = "Asia/Bangkok";

// "7 ต.ค. 2569 09:14 น." Every step in the app shows its date and time this way (17 Nov requirement).
export function thaiDateTime(d: Date) {
  return d.toLocaleString("th-TH", { timeZone: TZ, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " น.";
}

// "7 ต.ค. 2569"
export function thaiDate(d: Date) {
  return d.toLocaleDateString("th-TH", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" });
}

export const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
export const THAI_MONTHS_FULL = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

// Explains what's wrong with a typed date (day, month, year as typed), or null if it's a valid
// past date. Used to give a precise message under the date boxes.
export function dobProblem(day: number, month: number, yearBE: number, today = new Date()): string | null {
  const thisYearBE = today.getFullYear() + 543;
  if (month < 1 || month > 12) return "เดือนต้องเป็น 1–12";
  if (yearBE < thisYearBE - 120 || yearBE > thisYearBE) return `ปี พ.ศ. ต้องอยู่ระหว่าง ${thisYearBE - 120}–${thisYearBE}`;
  const max = daysInMonth(month, yearBE);
  if (day < 1 || day > max) return `${THAI_MONTHS[month - 1]} ${yearBE} มีแค่ ${max} วัน`;
  if (new Date(yearBE - 543, month - 1, day) > today) return "วันเกิดอยู่ในอนาคต";
  return null;
}

// Days in a month (month 1–12, year in พ.ศ.) — handles leap years, e.g. ก.พ. 2567 = 29.
export function daysInMonth(month: number, yearBE: number) {
  return new Date(yearBE - 543, month, 0).getDate();
}

// True if "dd/mm/yyyy" (พ.ศ.) is a real calendar date that is not in the future.
export function isValidThaiDob(dob: string, today = new Date()) {
  const m = dob.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return false;
  const [day, month, yearBE] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(month, yearBE)) return false;
  return new Date(yearBE - 543, month - 1, day) <= today;
}

// Age in years from a Buddhist-era DOB string "dd/mm/yyyy" (e.g. "14/02/2501"). null if unreadable.
export function ageFromThaiDob(dob: string, today = new Date()): number | null {
  const m = dob.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [day, month, yearBE] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const year = yearBE - 543;
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age--;
  return age >= 0 && age < 150 ? age : null;
}

// How long each free-text box may be. Not clinical values: chosen by the team (18 Nov 2026) from
// what Thai records normally hold, generous enough for real data. The server checks them too.
//   name 100     a full Thai name with its title is rarely over 60 characters
//   hn 15        the HN format is the hospital's own (current data: 8 to 10 digits, some with
//                "-" or "/"); 15 leaves room. To confirm with the hospital's IT (open question)
//   phone        Thai numbers (NBTC numbering plan): landline 9 digits, mobile 10, both start with 0
//   licenseNo 20 e.g. "ว.12345" (doctor) or a 10-digit nursing licence
//   position 60
export const LIMITS = { name: 100, hn: 15, phone: 12, licenseNo: 20, position: 60 } as const;

// A person's name: Thai or English letters, spaces, and "." (for titles like "น.ส."). No digits.
const NAME_RE = /^[฀-๿a-zA-Z.\s]+$/;
export function nameProblem(name: string): string | null {
  const v = name.trim();
  if (v === "") return null; // "required" is handled separately
  if (/[\d๐-๙]/.test(v)) return "ชื่อต้องไม่มีตัวเลข"; // 0–9 and Thai digits ๐–๙
  if (!NAME_RE.test(v)) return "ชื่อใช้ได้เฉพาะตัวอักษรไทยหรืออังกฤษ";
  if (v.replace(/[.\s]/g, "").length < 2) return "กรุณากรอกชื่อ–นามสกุล";
  if (v.length > LIMITS.name) return `ชื่อยาวเกิน ${LIMITS.name} ตัวอักษร`;
  return null;
}

// HN (hospital number): digits, with "-" or "/" as separators (e.g. "67-014822").
// Thai digits ๐–๙ typed on a Thai keyboard are turned into 0–9; anything else is dropped.
const THAI_DIGITS = "๐๑๒๓๔๕๖๗๘๙";
export function normalizeHn(raw: string): string {
  return raw
    .replace(/[๐-๙]/g, (d) => String(THAI_DIGITS.indexOf(d)))
    .replace(/[^0-9/-]/g, "");
}
export function hnProblem(hn: string): string | null {
  const v = hn.trim();
  if (v === "") return null; // HN is optional
  if (!/^[0-9]+([/-][0-9]+)*$/.test(v)) return "HN ใช้ได้เฉพาะตัวเลข คั่นด้วย - หรือ / ได้";
  if (v.length > LIMITS.hn) return `HN ยาวเกิน ${LIMITS.hn} ตัวอักษร`;
  return null;
}

// Phone: typed any way ("081 234 5678", "๐๘๑-๒๓๔-๕๖๗๘"), kept as digits, shown with dashes.
export const phoneDigits = (raw: string) => raw.replace(/[๐-๙]/g, (d) => String(THAI_DIGITS.indexOf(d))).replace(/\D/g, "");
export function phoneProblem(phone: string): string | null {
  const d = phoneDigits(phone);
  if (phone.trim() === "") return null; // optional
  if (/[^0-9๐-๙\s()-]/.test(phone)) return "เบอร์โทรใช้ได้เฉพาะตัวเลข";
  if (!d.startsWith("0")) return "เบอร์โทรต้องขึ้นต้นด้วย 0";
  if (d.length < 9) return `เบอร์โทรสั้นไป (มี ${d.length} หลัก) เบอร์บ้าน 9 หลัก มือถือ 10 หลัก`;
  if (d.length > 10) return `เบอร์โทรยาวไป (มี ${d.length} หลัก) เบอร์บ้าน 9 หลัก มือถือ 10 หลัก`;
  return null;
}
// "0812345678" → "081-234-5678", "021234567" → "02-123-4567", "053123456" → "053-123-456"
export function formatPhone(phone: string): string {
  const d = phoneDigits(phone);
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 9) return d.startsWith("02") ? `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}` : `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return phone.trim();
}
// while typing: keep only digits (max 10) and add the dashes
export const typePhone = (raw: string) => {
  const d = phoneDigits(raw).slice(0, 10);
  return d.length >= 9 ? formatPhone(d) : d.length > 6 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : d.length > 3 ? `${d.slice(0, 3)}-${d.slice(3)}` : d;
};

// Professional licence no.: letters (e.g. "ว."), digits, ".", "-", spaces.
export function licenseNoProblem(v: string): string | null {
  const t = v.trim();
  if (t === "") return null;
  if (!/^[฀-๿a-zA-Z0-9.\-\s]+$/.test(t)) return "ใช้ได้เฉพาะตัวอักษร ตัวเลข จุด และขีด";
  if (t.length > LIMITS.licenseNo) return `ยาวเกิน ${LIMITS.licenseNo} ตัวอักษร`;
  return null;
}

export const ALCOHOL_LABEL: Record<string, string> = {
  none: "ไม่ดื่มแอลกอฮอล์",
  light: "ดื่ม แต่ไม่ถึงเกณฑ์ดื่มหนัก",
  occasional: "ดื่มเป็นครั้งคราว (≤1 ครั้ง/สัปดาห์)",
  regular: "ดื่มประจำ (≥3 ครั้ง/สัปดาห์)",
  heavy: "ดื่มหนัก",
};

export const TRIGGER_LABEL = {
  vomiting: "อาเจียนหรือท้องเสียในช่วงที่ผ่านมา",
  lowIntake: "ทานอาหารได้น้อยลงต่อเนื่อง 1–2 วัน",
  nsaid: "กินยาแก้ปวด/แก้อักเสบ (NSAIDs) หรือยาชุด",
  herbal: "กินยาต้ม ยาหม้อ สมุนไพร หรืออาหารเสริม",
} as const;
export type TriggerKey = keyof typeof TRIGGER_LABEL;
export const TRIGGER_KEYS = Object.keys(TRIGGER_LABEL) as TriggerKey[];

export const ROLE_LABEL: Record<string, string> = {
  admin: "ผู้ดูแลระบบ (รพ.)",
  clinician: "แพทย์ / พยาบาล (รพ.)",
  pcu: "เจ้าหน้าที่ รพ.สต.",
};

// 13-digit Thai national ID (เลขประจำตัวประชาชน). Thai digits and dashes/spaces are accepted.
export function normalizeCardId(raw: string): string {
  return raw.replace(/[๐-๙]/g, (d) => String(THAI_DIGITS.indexOf(d))).replace(/\D/g, "");
}
// Standard mod-11 check on the last digit. A failed check is only a WARNING in this app:
// the hospital's synthetic test file deliberately uses IDs that fail it.
export function cardIdChecksumOk(id: string): boolean {
  if (!/^\d{13}$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(id[i]) * (13 - i);
  return (11 - (sum % 11)) % 10 === Number(id[12]);
}
// "1-2345-67890-12-3"
export function formatCardId(id: string): string {
  return /^\d{13}$/.test(id) ? `${id[0]}-${id.slice(1, 5)}-${id.slice(5, 10)}-${id.slice(10, 12)}-${id[12]}` : id;
}
// รพ.สต. staff see only the last 4 digits (PDPA data minimisation).
export function maskCardId(id: string): string {
  return /^\d{13}$/.test(id) ? `x-xxxx-xxxxx-${id.slice(10, 12)}-${id[12]}` : "xxxxxxxxxxxxx";
}
