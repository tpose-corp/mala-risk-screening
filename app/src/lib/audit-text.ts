// Turns stored audit rows (codes and IDs only, see rule.md) into sentences a person can read:
// who did what, to which record, on which device, and how. Plain functions, unit-tested.
import { ROLE_LABEL } from "./format";

// Computer Crime Act §26 (rule.md): traffic/access logs are kept for at least 90 days.
// This app never deletes audit rows at all (the database blocks it), so every row is kept
// at least this long. If a retention job is ever added, it must not delete anything younger
// than this, and must check first whether a longer legal hold applies.
export const AUDIT_RETENTION_DAYS = 90;

export type Category = "auth" | "patient" | "screening" | "hospital" | "admin" | "db";

export const CATEGORY_LABEL: Record<Category, string> = {
  auth: "เข้าและออกจากระบบ",
  patient: "ข้อมูลผู้ป่วย",
  screening: "การคัดกรอง",
  hospital: "โรงพยาบาลแม่ข่าย",
  admin: "บันทึกการใช้งาน",
  db: "แก้ไขข้อมูลนอกหน้าเว็บ",
};

// warn = something failed, was refused, or changed a record outside the app; worth noticing.
const ACTIONS: Record<string, { label: string; category: Category; warn?: boolean }> = {
  "login.success": { label: "เข้าสู่ระบบ", category: "auth" },
  "login.failed": { label: "เข้าสู่ระบบไม่สำเร็จ", category: "auth", warn: true },
  logout: { label: "ออกจากระบบ", category: "auth" },
  "access.denied": { label: "เปิดหน้าที่ไม่มีสิทธิ์ ระบบไม่ให้เข้า", category: "auth", warn: true },
  "record.denied": { label: "เปิดข้อมูลของหน่วยบริการอื่น ระบบไม่ให้เข้า", category: "auth", warn: true },
  "patient.list.view": { label: "เปิดรายชื่อผู้ป่วย", category: "patient" },
  "patient.view": { label: "เปิดแบบคัดกรองของผู้ป่วย", category: "patient" },
  "patient.create": { label: "เพิ่มผู้ป่วยใหม่", category: "patient" },
  "screening.create": { label: "บันทึกผลคัดกรอง", category: "screening" },
  "screening.view": { label: "เปิดดูผลคัดกรอง", category: "screening" },
  "alert.raised": { label: "ระบบส่งแจ้งเตือนไปที่ รพ.", category: "screening" },
  "advice.given": { label: "ยืนยันว่าแจ้งคำแนะนำผู้ป่วยแล้ว", category: "screening" },
  "screening.confirm": { label: "ยืนยันปิดเคส (ลงลายมือชื่ออิเล็กทรอนิกส์)", category: "screening" },
  "screening.confirm.rejected": { label: "ยืนยันเคสที่ปิดไปแล้ว ระบบไม่บันทึกซ้ำ", category: "screening", warn: true },
  "hospital.inbox.view": { label: "เปิดกล่องแจ้งเตือน", category: "hospital" },
  "hospital.case.view": { label: "เปิดดูรายละเอียดเคส", category: "hospital" },
  "hospital.cases.view": { label: "เปิดข้อมูลทุกเคส", category: "hospital" },
  "hospital.patient.history.view": { label: "เปิดประวัติผู้ป่วย", category: "hospital" },
  "hospital.export.csv": { label: "ดาวน์โหลดไฟล์ CSV", category: "hospital" },
  "hospital.export.denied": { label: "ดาวน์โหลดไฟล์ CSV โดยไม่มีสิทธิ์ ระบบไม่ให้ดาวน์โหลด", category: "hospital", warn: true },
  "alert.acknowledge": { label: "รับเรื่องเคสแจ้งเตือน", category: "hospital" },
  "audit.view": { label: "เปิดบันทึกการใช้งาน", category: "admin" },
  "audit.export": { label: "ดาวน์โหลดบันทึกการใช้งาน", category: "admin" },
  "audit.view.denied": { label: "เปิดบันทึกการใช้งานโดยไม่มีสิทธิ์ ระบบไม่ให้เข้า", category: "admin", warn: true },
  // Written by database triggers (migration audit_db_changes), not by the app.
  "db.user.create": { label: "สร้างบัญชีผู้ใช้", category: "db" },
  "db.user.update": { label: "แก้ไขบัญชีผู้ใช้", category: "db", warn: true },
  "db.user.delete": { label: "ลบบัญชีผู้ใช้", category: "db", warn: true },
  "db.patient.update": { label: "แก้ไขข้อมูลผู้ป่วย", category: "db", warn: true },
  "db.patient.delete": { label: "ลบข้อมูลผู้ป่วย", category: "db", warn: true },
  "db.screening.update": { label: "แก้ไขผลคัดกรอง", category: "db", warn: true },
  "db.screening.delete": { label: "ลบผลคัดกรอง", category: "db", warn: true },
};

export function describeAction(code: string) {
  return ACTIONS[code] ?? { label: code, category: "admin" as Category };
}

export function actionsIn(category: string): string[] {
  return Object.entries(ACTIONS).filter(([, a]) => a.category === category).map(([code]) => code);
}

export const WARN_ACTIONS = Object.entries(ACTIONS).filter(([, a]) => a.warn).map(([code]) => code);

export const isDbChange = (action: string) => action.startsWith("db.");

export function describeTarget(entity: string | null, id: number | null): string {
  if (!entity || id === null) return "";
  if (entity === "Screening") return `เคสคัดกรอง #${id}`;
  if (entity === "Patient") return `ผู้ป่วย #${id}`;
  if (entity === "User") return `บัญชีผู้ใช้ #${id}`;
  return `${entity} #${id}`;
}

const PERIOD_TH: Record<string, string> = { today: "วันนี้", "7d": "7 วัน", "30d": "30 วัน" };
const RESULT_TH: Record<string, string> = { alert: "แจ้งเตือน", noalert: "ไม่แจ้งเตือน" };
const FIELD_TH: Record<string, string> = {
  username: "ชื่อผู้ใช้", displayName: "ชื่อที่แสดง", role: "ตำแหน่ง", facility: "หน่วยบริการ", password: "รหัสผ่าน",
  name: "ชื่อ", dob: "วันเกิด", sex: "เพศ", hn: "HN", createdById: "ผู้เพิ่ม",
  patientId: "ผู้ป่วย", screenerId: "ผู้คัดกรอง", weightKg: "น้ำหนัก", heightCm: "ส่วนสูง", egfr: "eGFR", doseMgDay: "ขนาดยา",
  alcohol: "การดื่ม", drinksAlcohol: "การดื่ม", bingeDrinking: "การดื่ม", regularHeavyDrinking: "การดื่ม",
  vomiting: "อาเจียน/ท้องเสีย", lowIntake: "ทานได้น้อย", nsaid: "ยาแก้ปวด", herbal: "สมุนไพร", ruleVersion: "เวอร์ชันเกณฑ์",
  bmi: "BMI", maxDoseMgDay: "ขนาดยาสูงสุด", doseCheck: "ผลตรวจขนาดยา", scoreEgfr: "คะแนน", scoreBmi: "คะแนน", scoreAlcohol: "คะแนน",
  riskScore: "คะแนน", isAlert: "ผลแจ้งเตือน", alertRaisedAt: "เวลาแจ้งเตือน", createdAt: "วันที่สร้าง",
  confirmedAt: "การยืนยันปิดเคส", confirmedById: "ผู้ยืนยัน", confirmNote: "บันทึกตอนยืนยัน",
};
const role = (r: string) => ROLE_LABEL[r] ?? r;

// "rows=5" → "แสดง 5 รายการ"; "rows=61 filters=?fac=...&period=30d" → "61 แถว กรองตาม รพ.สต.ดอยลาน, 30 วัน"
export function describeDetail(action: string, detail: string | null): string {
  if (!detail) return "";
  if (detail === "already confirmed") return "";
  if (detail === "account=unknown") return "ชื่อผู้ใช้ที่พิมพ์ไม่มีในระบบ";
  if (detail === "account=exists") return "รหัสผ่านไม่ถูกต้อง";
  if (detail === "area=hospital") return "หน้าของโรงพยาบาลแม่ข่าย";
  if (detail === "area=facility") return "หน้าของ รพ.สต.";
  if (detail === "export") return "ดาวน์โหลด CSV";
  const parts: string[] = [];
  const filters = detail.match(/filters=(\S+)/)?.[1];
  const kv = Object.fromEntries([...detail.replace(/filters=\S+/, "").matchAll(/(\w+)=(\S+)/g)].map((m) => [m[1], m[2]]));
  if (kv.rows !== undefined) parts.push(action.endsWith("export") || action.endsWith("csv") ? `${kv.rows} แถว` : `แสดง ${kv.rows} รายการ`);
  if (kv.total !== undefined) parts.push(`ทั้งหมด ${kv.total} รายการ`);
  if (kv.page !== undefined) parts.push(`หน้า ${kv.page}`);
  if (kv.patientId !== undefined) parts.push(`ของผู้ป่วย #${kv.patientId}`);
  if (kv.screenings !== undefined) parts.push(`คัดกรองมาแล้ว ${kv.screenings} ครั้ง`);
  if (kv.ruleVersion !== undefined) parts.push(`เกณฑ์ ${kv.ruleVersion}`);
  if (kv.username !== undefined) parts.push(`ชื่อผู้ใช้ ${kv.username}`);
  if (kv.role !== undefined) {
    const [from, to] = kv.role.split(">");
    parts.push(to ? `ตำแหน่ง ${role(from)} เป็น ${role(to)}` : `ตำแหน่ง ${role(from)}`);
  }
  if (kv.changed !== undefined) {
    const fields = [...new Set(kv.changed.split(",").map((f) => FIELD_TH[f] ?? f))].filter((f) => !(kv.role && f === "ตำแหน่ง"));
    if (fields.length) parts.push(`เปลี่ยน${fields.join(", ")}`);
  }
  if (filters && filters !== "none") {
    const u = new URLSearchParams(filters.replace(/^\?/, ""));
    const f = [u.get("q") && "ค้นหาด้วยคำค้น", u.get("fac"), u.get("result") && RESULT_TH[u.get("result")!], u.get("period") && PERIOD_TH[u.get("period")!],
      // audit log download filters
      u.get("who") && `ผู้ใช้ ${u.get("who")}`, u.get("cat") && CATEGORY_LABEL[u.get("cat") as Category],
      u.get("from") && `ตั้งแต่ ${u.get("from")}`, u.get("to") && `ถึง ${u.get("to")}`,
      u.get("warn") && "เฉพาะที่ไม่สำเร็จ"]
      .filter(Boolean);
    if (f.length) parts.push(`กรองตาม ${f.join(", ")}`);
  } else if (filters === "none") {
    parts.push("ทั้งหมด");
  }
  return parts.length ? parts.join(" ") : detail;
}

// "Mozilla/5.0 (Windows NT 10.0; ...) Chrome/131 ..." → "Chrome บน Windows"
export function deviceOf(ua: string | null): string | null {
  if (!ua) return null;
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : null;
  const os = /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : null;
  if (browser && os) return `${browser} บน ${os}`;
  return browser ?? os ?? "ไม่ทราบอุปกรณ์";
}

// How far back the stored log reaches, against the 90-day minimum.
export function retentionStatus(oldest: Date | null, now = new Date()) {
  if (!oldest) return { days: 0, full: false };
  const days = Math.floor((now.getTime() - oldest.getTime()) / 86_400_000);
  return { days, full: days >= AUDIT_RETENTION_DAYS };
}

// Collapse runs of the same person doing exactly the same thing to the same record (e.g. the
// inbox auto-refreshing every 10 s) into one line. Rows must be newest first. Rows that failed,
// were refused, or changed data outside the app are never merged, and the detail must match too,
// so nothing worth noticing can hide inside a "×N". Nothing is deleted; display only.
export function collapse<T extends { userId: number | null; username: string | null; action: string; entity: string | null; entityId: number | null; detail?: string | null; at: Date }>(rows: T[]) {
  const out: { row: T; count: number; firstAt: Date }[] = [];
  for (const row of rows) {
    const last = out[out.length - 1];
    if (last && !describeAction(row.action).warn && last.row.userId === row.userId && last.row.username === row.username
      && last.row.action === row.action && last.row.entity === row.entity && last.row.entityId === row.entityId
      && (last.row.detail ?? null) === (row.detail ?? null)) {
      last.count++;
      last.firstAt = row.at;
    } else {
      out.push({ row, count: 1, firstAt: row.at });
    }
  }
  return out;
}

type AuditUser = { id: number; username: string; displayName: string; role: string; facility: string };
type AuditRow = { userId: number | null; username: string | null; action: string; entity: string | null; entityId: number | null; detail: string | null; device: string | null };

// One row as people read it, shared by the page and the CSV download so both always agree.
export function describeRow(r: AuditRow, users: AuditUser[]) {
  const a = describeAction(r.action);
  const base = { what: a.label, warn: !!a.warn, target: describeTarget(r.entity, r.entityId), detail: describeDetail(r.action, r.detail), device: r.device ?? "" };
  if (isDbChange(r.action)) {
    return { ...base, who: "ไม่ผ่านหน้าเว็บ", whoNote: "แก้ที่ฐานข้อมูลโดยตรงหรือสคริปต์ตั้งค่าระบบ", facility: "" };
  }
  if (r.userId !== null) {
    const u = users.find((x) => x.id === r.userId);
    if (u) return { ...base, who: u.displayName, whoNote: ROLE_LABEL[u.role] ?? u.role, facility: u.facility };
    // The account was removed later; the log keeps the name it had at the time.
    return { ...base, who: `บัญชี ${r.username ?? `#${r.userId}`}`, whoNote: "บัญชีนี้ถูกลบแล้ว", facility: "" };
  }
  const target = r.username ? users.find((x) => x.username === r.username) : undefined;
  return { ...base, who: "ไม่ทราบตัวตน", whoNote: r.username ? `พยายามเข้าบัญชี ${target?.displayName ?? r.username}` : "", facility: "" };
}
