// Thai date/time helpers (Bangkok time) and shared labels.
const TZ = "Asia/Bangkok";

// "7 ต.ค. 2569 09:14"
export function thaiDateTime(d: Date) {
  return d.toLocaleString("th-TH", { timeZone: TZ, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
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

// A person's name: Thai or English letters, spaces, and "." (for titles like "น.ส."). No digits.
const NAME_RE = /^[฀-๿a-zA-Z.\s]+$/;
export function nameProblem(name: string): string | null {
  const v = name.trim();
  if (v === "") return null; // "required" is handled separately
  if (/[\d๐-๙]/.test(v)) return "ชื่อต้องไม่มีตัวเลข"; // 0–9 and Thai digits ๐–๙
  if (!NAME_RE.test(v)) return "ชื่อใช้ได้เฉพาะตัวอักษรไทยหรืออังกฤษ";
  if (v.replace(/[.\s]/g, "").length < 2) return "กรุณากรอกชื่อ–นามสกุล";
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
  nurse: "พยาบาลวิชาชีพ",
  pharmacist: "เภสัชกร",
  doctor: "แพทย์",
  admin: "ผู้ดูแลระบบ",
};
