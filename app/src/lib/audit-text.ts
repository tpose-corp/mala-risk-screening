// Turns stored audit rows (codes and IDs only, see rule.md) into sentences a person can read:
// who did what, to which record, on which device, and how. Plain functions, unit-tested.
import { ROLE_LABEL } from "./format";

// Computer Crime Act §26 (rule.md): traffic/access logs are kept for at least 90 days.
// This app never deletes audit rows at all (the database blocks it), so every row is kept
// at least this long. If a retention job is ever added, it must not delete anything younger
// than this, and must check first whether a longer legal hold applies.
export const AUDIT_RETENTION_DAYS = 90;

export type Category = "auth" | "patient" | "screening" | "hospital" | "admin" | "adminview" | "db";

export const CATEGORY_LABEL: Record<Category, string> = {
  auth: "เข้าและออกจากระบบ",
  patient: "ข้อมูลผู้ป่วย",
  screening: "การคัดกรอง",
  hospital: "โรงพยาบาลแม่ข่าย",
  admin: "งานของผู้ดูแลระบบ (เพิ่ม แก้ไข ปิด)",
  adminview: "ผู้ดูแลระบบเปิดดูหน้าและดาวน์โหลด",
  db: "แก้ไขข้อมูลนอกหน้าเว็บ",
};

// warn = something failed, was refused, or changed a record outside the app; worth noticing.
const ACTIONS: Record<string, { label: string; category: Category; warn?: boolean }> = {
  "login.success": { label: "เข้าสู่ระบบ", category: "auth" },
  "login.failed": { label: "เข้าสู่ระบบไม่สำเร็จ", category: "auth", warn: true },
  logout: { label: "ออกจากระบบ", category: "auth" },
  "logout.idle": { label: "ออกจากระบบอัตโนมัติ (ไม่มีการใช้งาน 30 นาที)", category: "auth" },
  "login.locked": { label: "บัญชีถูกพักชั่วคราว (ใส่รหัสผ่านผิดเกิน 5 ครั้ง)", category: "auth", warn: true },
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
  "audit.view": { label: "เปิดบันทึกการใช้งาน", category: "adminview" },
  "audit.export": { label: "ดาวน์โหลดบันทึกการใช้งาน", category: "adminview" },
  "audit.view.denied": { label: "เปิดบันทึกการใช้งานโดยไม่มีสิทธิ์ ระบบไม่ให้เข้า", category: "adminview", warn: true },
  // v2 (17 Nov 2026): admin back office, clinician follow-up, edit lock, criteria, settings, manuals
  "patient.duplicate.blocked": { label: "เพิ่มผู้ป่วยซ้ำกับหน่วยอื่น ระบบแนะนำให้ไปหน่วยเดิม", category: "patient", warn: true },
  "patient.duplicate.found": { label: "เพิ่มผู้ป่วยที่มีอยู่แล้ว ระบบพาไปหน้าผู้ป่วยเดิม", category: "patient" },
  "patient.claim": { label: "รับผู้ป่วยที่ยังไม่มีหน่วยประจำเข้าหน่วยตัวเอง", category: "patient" },
  "screening.update": { label: "แก้ไขผลคัดกรองก่อนยืนยัน", category: "screening" },
  "screening.edit.locked": { label: "พยายามแก้ผลคัดกรองที่ยืนยันแล้ว ระบบไม่ให้แก้", category: "screening", warn: true },
  "followup.save": { label: "บันทึกการดำเนินการของแพทย์/พยาบาล", category: "hospital" },
  "followup.add": { label: "เพิ่มบันทึกการดำเนินการของแพทย์/พยาบาล", category: "hospital" },
  "admin.dashboard.view": { label: "เปิดภาพรวมระบบ", category: "adminview" },
  "admin.user.create": { label: "สร้างบัญชีผู้ใช้", category: "admin" },
  "admin.user.update": { label: "แก้ไขบัญชีผู้ใช้", category: "admin" },
  "admin.user.reset": { label: "ตั้งรหัสผ่านชั่วคราวใหม่", category: "admin" },
  "admin.user.deactivate": { label: "ปิดการใช้งานบัญชี", category: "admin", warn: true },
  "admin.user.activate": { label: "เปิดการใช้งานบัญชี", category: "admin" },
  "admin.facility.create": { label: "เพิ่มหน่วยบริการ", category: "admin" },
  "admin.facility.update": { label: "แก้ไขหน่วยบริการ", category: "admin" },
  "admin.patient.verify": { label: "ยืนยันตัวตนผู้ป่วย", category: "admin" },
  "admin.patient.update": { label: "แก้ไขข้อมูลผู้ป่วย (มีเหตุผลกำกับ)", category: "admin" },
  "admin.patient.deactivate": { label: "ปิดใช้งานผู้ป่วย", category: "admin", warn: true },
  "admin.patient.activate": { label: "เปิดใช้งานผู้ป่วยอีกครั้ง", category: "admin" },
  "admin.screening.update": { label: "แก้ไขผลคัดกรองที่ยืนยันแล้ว (มีเหตุผลกำกับ)", category: "admin", warn: true },
  "admin.criteria.update": { label: "แก้ไขเกณฑ์การประเมิน", category: "admin", warn: true },
  "admin.settings.update": { label: "แก้ไขการตั้งค่าระบบ", category: "admin" },
  "admin.manual.upload": { label: "อัปโหลดคู่มือ", category: "admin" },
  "admin.manual.remove": { label: "ซ่อนคู่มือ", category: "admin" },
  "manual.download": { label: "เปิดคู่มือ", category: "patient" },
  "account.password.change": { label: "เปลี่ยนรหัสผ่าน", category: "auth" },
  "account.password.failed": { label: "เปลี่ยนรหัสผ่านไม่สำเร็จ (รหัสผ่านปัจจุบันไม่ถูกต้อง)", category: "auth", warn: true },
  "login.inactive": { label: "บัญชีที่ถูกปิดพยายามเข้าสู่ระบบ", category: "auth", warn: true },
  // Written by database triggers (migration audit_triggers) for changes made outside the app.
  "db.user.insert": { label: "สร้างบัญชีผู้ใช้", category: "db", warn: true },
  "db.user.update": { label: "แก้ไขบัญชีผู้ใช้", category: "db", warn: true },
  "db.user.delete": { label: "ลบบัญชีผู้ใช้", category: "db", warn: true },
  "db.patient.update": { label: "แก้ไขข้อมูลผู้ป่วย", category: "db", warn: true },
  "db.patient.delete": { label: "ลบข้อมูลผู้ป่วย", category: "db", warn: true },
  "db.screening.update": { label: "แก้ไขผลคัดกรอง", category: "db", warn: true },
  "db.screening.delete": { label: "ลบผลคัดกรอง", category: "db", warn: true },
  "db.amendment.update": { label: "แก้ไขประวัติการแก้ไข", category: "db", warn: true },
  "db.amendment.delete": { label: "ลบประวัติการแก้ไข", category: "db", warn: true },
  "db.ruleset.insert": { label: "เพิ่มเกณฑ์การประเมิน", category: "db", warn: true },
  "db.ruleset.update": { label: "แก้ไขเกณฑ์การประเมิน", category: "db", warn: true },
  "db.ruleset.delete": { label: "ลบเกณฑ์การประเมิน", category: "db", warn: true },
  "db.facility.insert": { label: "เพิ่มหน่วยบริการ", category: "db", warn: true },
  "db.facility.update": { label: "แก้ไขหน่วยบริการ", category: "db", warn: true },
  "db.facility.delete": { label: "ลบหน่วยบริการ", category: "db", warn: true },
};

export function describeAction(code: string) {
  return ACTIONS[code] ?? { label: code, category: "admin" as Category };
}

export function actionsIn(category: string): string[] {
  return Object.entries(ACTIONS).filter(([, a]) => a.category === category).map(([code]) => code);
}

// action codes whose Thai label contains the search text (for the audit log search box)
export function actionsMatching(q: string): string[] {
  const t = q.trim().toLowerCase();
  return t ? Object.entries(ACTIONS).filter(([code, a]) => a.label.toLowerCase().includes(t) || code.includes(t)).map(([code]) => code) : [];
}

export const WARN_ACTIONS = Object.entries(ACTIONS).filter(([, a]) => a.warn).map(([code]) => code);

export const isDbChange = (action: string) => action.startsWith("db.");

// names: what the page looked up for this row's record ("User:18" → "test.popup"), so the log
// says WHICH account / unit / criteria version / manual. Patients and screenings stay numbers
// only: the log never holds patient names (rule.md, PDPA).
export type TargetNames = Record<string, string>;
export function describeTarget(entity: string | null, id: number | null, names: TargetNames = {}): string {
  if (!entity || id === null) return "";
  const n = names[`${entity}:${id}`];
  if (entity === "Screening") return `เคสคัดกรอง #${id}`;
  if (entity === "Patient") return `ผู้ป่วย #${id}`;
  if (entity === "User") return n ? `บัญชีผู้ใช้ ${n}` : `บัญชีผู้ใช้ #${id}`;
  if (entity === "Facility") return n ? `หน่วยบริการ ${n}` : `หน่วยบริการ #${id}`;
  if (entity === "RuleSet") return n ? `เกณฑ์ ${n}` : `เกณฑ์ #${id}`;
  if (entity === "Manual") return n ? `คู่มือ "${n}"` : `คู่มือ #${id}`;
  return `${entity} #${id}`;
}

const PERIOD_TH: Record<string, string> = { today: "วันนี้", "7d": "7 วัน", "30d": "30 วัน" };
const RESULT_TH: Record<string, string> = { alert: "แจ้งเตือน", noalert: "ไม่แจ้งเตือน" };
const FIELD_TH: Record<string, string> = {
  username: "ชื่อผู้ใช้", displayName: "ชื่อ–นามสกุล", role: "บทบาท", facility: "หน่วยบริการ", password: "รหัสผ่าน",
  position: "ตำแหน่ง", licenseNo: "เลขใบประกอบวิชาชีพ", phone: "เบอร์โทร", cardId: "เลขประจำตัวประชาชน",
  pcuEnabled: "การเข้าใช้ของ รพ.สต.", clinicianEnabled: "การเข้าใช้ของแพทย์และพยาบาล", closedMessage: "ข้อความเมื่อปิดระบบ", adminContact: "ช่องทางติดต่อผู้ดูแลระบบ",
  name: "ชื่อ", dob: "วันเกิด", sex: "เพศ", hn: "HN", createdById: "ผู้เพิ่ม",
  patientId: "ผู้ป่วย", screenerId: "ผู้คัดกรอง", weightKg: "น้ำหนัก", heightCm: "ส่วนสูง", egfr: "eGFR", doseMgDay: "ขนาดยา",
  alcohol: "การดื่ม", drinksAlcohol: "การดื่ม", bingeDrinking: "การดื่ม", regularHeavyDrinking: "การดื่ม",
  vomiting: "อาเจียน/ท้องเสีย", lowIntake: "ทานได้น้อย", nsaid: "ยาแก้ปวด", herbal: "สมุนไพร", ruleVersion: "เวอร์ชันเกณฑ์",
  bmi: "BMI", maxDoseMgDay: "ขนาดยาสูงสุด", doseCheck: "ผลตรวจขนาดยา", scoreEgfr: "คะแนน", scoreBmi: "คะแนน", scoreAlcohol: "คะแนน",
  riskScore: "คะแนน", isAlert: "ผลแจ้งเตือน", alertRaisedAt: "เวลาแจ้งเตือน", createdAt: "วันที่สร้าง",
  confirmedAt: "การยืนยันปิดเคส", confirmedById: "ผู้ยืนยัน", confirmNote: "บันทึกตอนยืนยัน",
  code: "รหัสหน่วยบริการ", active: "สถานะเปิดหรือปิด",
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
  if (detail === "area=admin") return "หน้าผู้ดูแลระบบ";
  if (detail === "export") return "ดาวน์โหลด CSV";
  const parts: string[] = [];
  const filters = detail.match(/filters=(\S+)/)?.[1];
  const kv = Object.fromEntries([...detail.replace(/filters=\S+/, "").matchAll(/(\w+)=(\S+)/g)].map((m) => [m[1], m[2]]));
  if (kv.rows !== undefined) parts.push(action.endsWith("export") || action.endsWith("csv") ? `${kv.rows} แถว` : `แสดง ${kv.rows} รายการ`);
  if (kv.total !== undefined) parts.push(`ทั้งหมด ${kv.total} รายการ`);
  if (kv.page !== undefined) parts.push(`หน้า ${kv.page}`);
  if (kv.patientId !== undefined) parts.push(`ของผู้ป่วย #${kv.patientId}`);
  if (kv.screenings !== undefined) parts.push(`คัดกรองมาแล้ว ${kv.screenings} ครั้ง`);
  // a criteria save already names its version in the target column
  if (kv.ruleVersion !== undefined && action !== "admin.criteria.update") parts.push(`เกณฑ์ ${kv.ruleVersion}`);
  if (kv.username !== undefined) parts.push(`ชื่อผู้ใช้ ${kv.username}`);
  if (kv.role !== undefined) {
    const [from, to] = kv.role.split(">");
    parts.push(to ? `บทบาท ${role(from)} เป็น ${role(to)}` : `บทบาท ${role(from)}`);
  }
  // closing / reopening a unit (admin.facility.update): active=false patients=N users=N disabled=N
  if (kv.active === "false") parts.push("ปิดหน่วย");
  if (kv.active === "true") parts.push("เปิดหน่วยอีกครั้ง");
  if (kv.patients !== undefined && kv.patients !== "0") parts.push(`ย้ายผู้ป่วย ${kv.patients} คน`);
  if (kv.users !== undefined && kv.users !== "0") parts.push(`ย้ายบัญชี ${kv.users} บัญชี`);
  if (kv.disabled !== undefined && kv.disabled !== "0") parts.push(`ปิดบัญชี ${kv.disabled} บัญชี`);
  if (kv.changed !== undefined && kv.changed !== "none") {
    const fields = [...new Set(kv.changed.split(",").map((f) => FIELD_TH[f] ?? f))].filter((f) => !(kv.role && f === "บทบาท"));
    if (fields.length) parts.push(`เปลี่ยน${fields.join(", ")}`);
  }
  if (kv.changed === "none") parts.push("ไม่มีค่าที่เปลี่ยน");
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
  return parts.length ? parts.join(" ") : action === "admin.criteria.update" ? "" : detail;
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
// so nothing worth noticing can hide inside a "×N". Only looking at pages merges (".view"
// actions): every save, change or download keeps its own line, even when two look alike.
// Nothing is deleted; display only.
export function collapse<T extends { userId: number | null; username: string | null; action: string; entity: string | null; entityId: number | null; detail?: string | null; at: Date }>(rows: T[]) {
  const out: { row: T; count: number; firstAt: Date }[] = [];
  for (const row of rows) {
    const last = out[out.length - 1];
    if (last && !describeAction(row.action).warn && row.action.endsWith(".view") && last.row.userId === row.userId && last.row.username === row.username
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

type AuditUser = { id: number; username: string; displayName: string; role: string; facility: string | null };
type AuditRow = { userId: number | null; username: string | null; action: string; entity: string | null; entityId: number | null; detail: string | null; device: string | null };

// One row as people read it, shared by the page and the CSV download so both always agree.
export function describeRow(r: AuditRow, users: AuditUser[], names: TargetNames = {}) {
  const a = describeAction(r.action);
  const base = { what: a.label, warn: !!a.warn, target: describeTarget(r.entity, r.entityId, names), detail: describeDetail(r.action, r.detail), device: r.device ?? "" };
  if (isDbChange(r.action)) {
    return { ...base, who: "ไม่ผ่านหน้าเว็บ", whoNote: "แก้ที่ฐานข้อมูลโดยตรงหรือสคริปต์ตั้งค่าระบบ", facility: "" };
  }
  if (r.userId !== null) {
    const u = users.find((x) => x.id === r.userId);
    if (u) return { ...base, who: u.displayName, whoNote: ROLE_LABEL[u.role] ?? u.role, facility: u.facility ?? "รพ.เชียงรายประชานุเคราะห์" };
    // The account was removed later; the log keeps the name it had at the time.
    return { ...base, who: `บัญชี ${r.username ?? `#${r.userId}`}`, whoNote: "บัญชีนี้ถูกลบแล้ว", facility: "" };
  }
  const target = r.username ? users.find((x) => x.username === r.username) : undefined;
  return { ...base, who: "ไม่ทราบตัวตน", whoNote: r.username ? `พยายามเข้าบัญชี ${target?.displayName ?? r.username}` : "", facility: "" };
}
