// System settings the hospital admin changes from /admin/settings instead of asking a developer.
// Stored as key/value rows in the Setting table; anything missing falls back to the default here.
import "server-only";
import { db } from "./db";

export type Settings = {
  pcuEnabled: boolean; // รพ.สต. staff may use the system
  clinicianEnabled: boolean; // doctors / nurses may use the system
  closedMessage: string; // shown to users while their role is switched off
  adminContact: string; // who to call to fix a confirmed record (shown in the "cannot edit" popup)
};

export const DEFAULT_SETTINGS: Settings = {
  pcuEnabled: true,
  clinicianEnabled: true,
  closedMessage: "ระบบปิดปรับปรุงชั่วคราว กรุณาติดต่อผู้ดูแลระบบ โรงพยาบาลเชียงรายประชานุเคราะห์",
  adminContact: "ผู้ดูแลระบบ รพ.เชียงรายประชานุเคราะห์ (ศูนย์ข้อมูลยา)",
};

export async function getSettings(): Promise<Settings> {
  const rows = await db.setting.findMany();
  const s: Settings = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    if (r.key === "pcuEnabled" || r.key === "clinicianEnabled") s[r.key] = r.value === "true";
    else if (r.key === "closedMessage" || r.key === "adminContact") s[r.key] = r.value;
  }
  return s;
}
