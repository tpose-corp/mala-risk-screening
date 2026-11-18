"use server";
// Save /admin/settings. The page reviews the changes first; this re-checks them. On a problem the
// errors go back per field (the form keeps what was typed) instead of reloading the page.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { asActor } from "@/lib/actor";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/session";
import { getSettings } from "@/lib/settings";

export type SettingsState = { errors?: Record<string, string>; form?: string } | undefined;

export async function saveSettings(_prev: SettingsState, fd: FormData): Promise<SettingsState> {
  const admin = await requireAdmin();
  const values: Record<string, string> = {
    pcuEnabled: String(fd.get("pcuEnabled") === "on"),
    clinicianEnabled: String(fd.get("clinicianEnabled") === "on"),
    closedMessage: String(fd.get("closedMessage") ?? "").trim().slice(0, 300),
    adminContact: String(fd.get("adminContact") ?? "").trim().slice(0, 200),
  };
  const errors: Record<string, string> = {};
  if (!values.closedMessage) errors.closedMessage = "กรุณากรอกข้อความ หรือกด \"ใช้ข้อความเริ่มต้น\"";
  if (!values.adminContact) errors.adminContact = "กรุณากรอกช่องทางติดต่อ หรือกด \"ใช้ข้อความเริ่มต้น\"";
  if (Object.keys(errors).length) return { errors };

  const before = await getSettings();
  const changed = Object.keys(values).filter((k) => String(before[k as keyof typeof before]) !== values[k]);
  if (!changed.length) return { form: "ไม่มีค่าที่เปลี่ยน ไม่มีอะไรต้องบันทึก" };
  await asActor(admin.id, async (tx) => {
    for (const key of changed) {
      const value = values[key];
      await tx.setting.upsert({ where: { key }, create: { key, value, updatedById: admin.id }, update: { value, updatedById: admin.id } });
    }
  });
  await audit({ user: admin, action: "admin.settings.update", detail: `changed=${changed.join(",")}` });
  revalidatePath("/", "layout");
  redirect("/admin/settings?ok=1");
}
