"use server";
// Admin actions on the รพ.สต. / ศสม. list (/admin/facilities). Called from facilities-manager.tsx,
// which reviews every change in a popup first. Each returns { errors } per field, or { ok }.
//
// Closing a unit (it stopped, or was added by mistake / twice) is never a delete:
//   - refused while the unit has an open case (its staff must close those first)
//   - its patients' home unit moves to the unit the admin picks (one Amendment row each, with the
//     reason), or stays when the admin says so (they then show under the closed unit)
//   - its active staff accounts move to that unit too, or are switched off (signed out at once)
//   - screenings keep the unit where they were done: that is a fact of the record
// Renaming fixes a typo: accounts, patients and screenings follow (foreign key ON UPDATE CASCADE).
import { revalidatePath } from "next/cache";
import { asActor } from "@/lib/actor";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { countOpenCases } from "@/lib/open-cases";
import { requireAdmin } from "@/lib/session";

export type FacilityResult = { ok?: string; errors?: Record<string, string> };

function checkNameCode(name: string, code: string | null) {
  const errors: Record<string, string> = {};
  if (name.length < 3) errors.name = "กรุณากรอกชื่อหน่วยบริการ อย่างน้อย 3 ตัวอักษร";
  else if (name.length > 120) errors.name = "ชื่อยาวเกิน 120 ตัวอักษร";
  if (code && !/^\d{5}$/.test(code)) errors.code = "รหัสหน่วยบริการต้องเป็นตัวเลข 5 หลัก หรือเว้นว่าง";
  return errors;
}

async function clashErrors(name: string, code: string | null, exceptId?: number) {
  const errors: Record<string, string> = {};
  const not = exceptId ? { NOT: { id: exceptId } } : {};
  if (await db.facility.findFirst({ where: { name, ...not } })) errors.name = "มีหน่วยบริการชื่อนี้อยู่แล้ว";
  if (code && (await db.facility.findFirst({ where: { code, ...not } }))) errors.code = "รหัสนี้เป็นของหน่วยบริการอื่นแล้ว";
  return errors;
}

export async function createFacility(input: { name: string; code: string }): Promise<FacilityResult> {
  const admin = await requireAdmin();
  const name = input.name.trim(), code = input.code.trim() || null;
  const errors = { ...checkNameCode(name, code) };
  if (!Object.keys(errors).length) Object.assign(errors, await clashErrors(name, code));
  if (Object.keys(errors).length) return { errors };
  const f = await asActor(admin.id, (tx) => tx.facility.create({ data: { name, code } }));
  await audit({ user: admin, action: "admin.facility.create", entity: "Facility", entityId: f.id });
  revalidatePath("/admin/facilities");
  return { ok: `เพิ่ม ${name} แล้ว` };
}

export async function renameFacility(input: { id: number; name: string; code: string }): Promise<FacilityResult> {
  const admin = await requireAdmin();
  const f = await db.facility.findUnique({ where: { id: input.id } });
  if (!f) return { errors: { form: "ไม่พบหน่วยบริการนี้" } };
  const name = input.name.trim(), code = input.code.trim() || null;
  const errors = { ...checkNameCode(name, code) };
  if (!Object.keys(errors).length) Object.assign(errors, await clashErrors(name, code, f.id));
  if (Object.keys(errors).length) return { errors };
  const changed = [name !== f.name && "name", code !== f.code && "code"].filter(Boolean) as string[];
  if (!changed.length) return { errors: { form: "ชื่อและรหัสเหมือนเดิม ไม่มีอะไรต้องบันทึก" } };
  await asActor(admin.id, (tx) => tx.facility.update({ where: { id: f.id }, data: { name, code } }));
  await audit({ user: admin, action: "admin.facility.update", entity: "Facility", entityId: f.id, detail: `changed=${changed.join(",")}` });
  revalidatePath("/admin/facilities");
  return { ok: `บันทึก ${name} แล้ว` };
}

export async function closeFacility(input: {
  id: number;
  patients: "move" | "keep";
  accounts: "move" | "disable";
  target: number | null; // unit that receives the patients and/or accounts
  reason: string;
}): Promise<FacilityResult> {
  const admin = await requireAdmin();
  const f = await db.facility.findUnique({ where: { id: input.id } });
  if (!f || !f.active) return { errors: { form: "หน่วยบริการนี้ปิดไปแล้ว" } };
  const reason = input.reason.trim().slice(0, 300);
  const open = await countOpenCases(f.name);
  const patients = await db.patient.findMany({ where: { facility: f.name, active: true }, select: { id: true } });
  const users = await db.user.findMany({ where: { facility: f.name, active: true }, select: { id: true } });
  const needTarget = (input.patients === "move" && patients.length > 0) || (input.accounts === "move" && users.length > 0);
  const target = input.target ? await db.facility.findFirst({ where: { id: input.target, active: true, NOT: { id: f.id } } }) : null;

  const errors: Record<string, string> = {};
  if (open > 0) errors.form = `ยังมีเคสที่ยังไม่ยืนยันปิดเคส ${open} เคส ให้ รพ.สต. ปิดเคสให้ครบก่อนปิดหน่วย`;
  if (needTarget && !target) errors.target = "กรุณาเลือกหน่วยบริการที่จะย้ายไป";
  if (!reason) errors.reason = "กรุณากรอกเหตุผลที่ปิดหน่วย";
  if (Object.keys(errors).length) return { errors };

  const movePatients = input.patients === "move" && target ? patients : [];
  const moveUsers = input.accounts === "move" && target ? users : [];
  const disableUsers = input.accounts === "disable" ? users : [];
  await asActor(admin.id, async (tx) => {
    if (movePatients.length) {
      await tx.amendment.createMany({
        data: movePatients.map((p) => ({ byId: admin.id, entity: "Patient", entityId: p.id, patientId: p.id, field: "facility", oldValue: f.name, newValue: target!.name, reason: `ปิดหน่วย: ${reason}` })),
      });
      await tx.patient.updateMany({ where: { id: { in: movePatients.map((p) => p.id) } }, data: { facility: target!.name } });
    }
    if (moveUsers.length) await tx.user.updateMany({ where: { id: { in: moveUsers.map((u) => u.id) } }, data: { facility: target!.name } });
    if (disableUsers.length) {
      const ids = disableUsers.map((u) => u.id);
      await tx.user.updateMany({ where: { id: { in: ids } }, data: { active: false } });
      await tx.session.deleteMany({ where: { userId: { in: ids } } });
    }
    await tx.facility.update({ where: { id: f.id }, data: { active: false } });
  });
  await audit({ user: admin, action: "admin.facility.update", entity: "Facility", entityId: f.id, detail: `active=false patients=${movePatients.length} users=${moveUsers.length} disabled=${disableUsers.length}` });
  for (const p of movePatients) await audit({ user: admin, action: "admin.patient.update", entity: "Patient", entityId: p.id, detail: "changed=facility" });
  for (const u of moveUsers) await audit({ user: admin, action: "admin.user.update", entity: "User", entityId: u.id, detail: "changed=facility" });
  for (const u of disableUsers) await audit({ user: admin, action: "admin.user.deactivate", entity: "User", entityId: u.id });
  revalidatePath("/admin/facilities");
  revalidatePath("/admin/users");
  return { ok: `ปิด ${f.name} แล้ว` };
}

export async function reopenFacility(input: { id: number }): Promise<FacilityResult> {
  const admin = await requireAdmin();
  const f = await db.facility.findUnique({ where: { id: input.id } });
  if (!f) return { errors: { form: "ไม่พบหน่วยบริการนี้" } };
  if (f.active) return { ok: `${f.name} เปิดใช้งานอยู่แล้ว` };
  await asActor(admin.id, (tx) => tx.facility.update({ where: { id: f.id }, data: { active: true } }));
  await audit({ user: admin, action: "admin.facility.update", entity: "Facility", entityId: f.id, detail: "active=true" });
  revalidatePath("/admin/facilities");
  return { ok: `เปิด ${f.name} อีกครั้งแล้ว` };
}
