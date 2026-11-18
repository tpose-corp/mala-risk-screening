"use server";
// Staff accounts are created ONLY by the hospital admin (no self sign-up, 17 Nov 2026).
// Sign-in = a username the admin picks + a temporary password the system generates; the person
// must set their own password at first login. Accounts are switched off, never deleted, so the
// audit trail always points at a real account.
// Called from user-forms.tsx, which reviews every change in a popup first; each action returns
// errors per field (so the popup can mark and focus the box), or the result to show.

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { asActor } from "@/lib/actor";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { temporaryPassword } from "@/lib/password";
import { LIMITS, formatPhone, licenseNoProblem, nameProblem, phoneDigits, phoneProblem } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

export type UserInput = { username: string; displayName: string; role: string; facility: string; position: string; licenseNo: string; phone: string };
export type UserResult = { ok?: string; errors?: Record<string, string>; tempPassword?: string; username?: string };

const UserSchema = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,30}$/, { error: "ใช้ได้เฉพาะ a-z 0-9 . _ - ยาว 3 ถึง 30 ตัว" }),
  displayName: z.string().trim().min(2, { error: "กรุณากรอกชื่อ–นามสกุล" }).max(LIMITS.name, { error: `ยาวเกิน ${LIMITS.name} ตัวอักษร` })
    .superRefine((v, ctx) => { const p = nameProblem(v); if (p) ctx.addIssue({ code: "custom", message: p }); }),
  role: z.enum(["admin", "clinician", "pcu"], { error: "กรุณาเลือกบทบาท" }),
  facility: z.string().trim(),
  position: z.string().trim().max(LIMITS.position, { error: `ยาวเกิน ${LIMITS.position} ตัวอักษร` }),
  licenseNo: z.string().trim().superRefine((v, ctx) => { const p = licenseNoProblem(v); if (p) ctx.addIssue({ code: "custom", message: p }); }),
  phone: z.string().trim().superRefine((v, ctx) => { const p = phoneProblem(v); if (p) ctx.addIssue({ code: "custom", message: p }); }),
});

// every problem, keyed by the box it belongs to
async function check(input: UserInput, exceptId?: number) {
  const p = UserSchema.safeParse(input);
  const errors: Record<string, string> = {};
  if (!p.success) for (const i of p.error.issues) errors[String(i.path[0])] ??= i.message;
  const d = p.success ? p.data : null;
  if (d?.role === "pcu") {
    if (!d.facility) errors.facility = "บัญชีเจ้าหน้าที่ รพ.สต. ต้องเลือกหน่วยบริการ";
    else {
      const f = await db.facility.findUnique({ where: { name: d.facility } });
      if (!f || !f.active) errors.facility = "หน่วยบริการนี้ถูกปิดแล้ว กรุณาเลือกหน่วยอื่น";
    }
  }
  if (d && !errors.username) {
    const clash = await db.user.findUnique({ where: { username: d.username } });
    if (clash && clash.id !== exceptId) errors.username = "ชื่อผู้ใช้นี้มีอยู่แล้ว";
  }
  return { d, errors };
}

const dataOf = (d: z.infer<typeof UserSchema>) => ({
  username: d.username, displayName: d.displayName, role: d.role, facility: d.role === "pcu" ? d.facility : null,
  position: d.position || null, licenseNo: d.licenseNo || null, phone: d.phone ? formatPhone(d.phone) : null,
});

export async function createUser(input: UserInput): Promise<UserResult> {
  const admin = await requireAdmin();
  const { d, errors } = await check(input);
  if (!d || Object.keys(errors).length) return { errors };
  const temp = temporaryPassword();
  const u = await asActor(admin.id, (tx) =>
    tx.user.create({ data: { ...dataOf(d), passwordHash: bcrypt.hashSync(temp, 10), mustChangePassword: true } }),
  );
  await audit({ user: admin, action: "admin.user.create", entity: "User", entityId: u.id, detail: `username=${u.username} role=${u.role}` });
  revalidatePath("/admin/users");
  return { ok: `สร้างบัญชี ${u.username} แล้ว`, tempPassword: temp, username: u.username };
}

export async function updateUser(userId: number, input: UserInput): Promise<UserResult> {
  const admin = await requireAdmin();
  const before = await db.user.findUnique({ where: { id: userId } });
  if (!before) return { errors: { form: "ไม่พบบัญชีนี้" } };
  const { d, errors } = await check(input, userId);
  if (d && before.role === "admin" && d.role !== "admin" && before.active && (await activeAdmins()) <= 1) {
    errors.role = "ต้องมีผู้ดูแลระบบที่ใช้งานได้อย่างน้อย 1 บัญชี";
  }
  if (d && userId === admin.id && d.role !== "admin") errors.role = "เปลี่ยนบทบาทของบัญชีตัวเองไม่ได้";
  if (!d || Object.keys(errors).length) return { errors };
  const data = dataOf(d);
  if (data.phone && phoneDigits(data.phone) === phoneDigits(before.phone ?? "")) data.phone = before.phone; // same number, other spelling
  const changed = (Object.keys(data) as (keyof typeof data)[]).filter((k) => (before[k] ?? null) !== (data[k] ?? null));
  if (!changed.length) return { errors: { form: "ไม่มีข้อมูลที่เปลี่ยน" } };
  await asActor(admin.id, (tx) => tx.user.update({ where: { id: userId }, data }));
  const roleChange = before.role !== d.role ? `role=${before.role}>${d.role} ` : "";
  await audit({ user: admin, action: "admin.user.update", entity: "User", entityId: userId, detail: `${roleChange}changed=${changed.join(",")}` });
  revalidatePath("/admin/users");
  return { ok: `บันทึกการแก้ไขบัญชี ${d.username} แล้ว` };
}

export async function resetPassword(userId: number): Promise<UserResult> {
  const admin = await requireAdmin();
  // Resetting your own account would log you out before you could read the new password.
  if (userId === admin.id) return { errors: { form: "เปลี่ยนรหัสผ่านของบัญชีตัวเองที่เมนูชื่อผู้ใช้มุมขวาบน" } };
  const u = await db.user.findUnique({ where: { id: userId } });
  if (!u) return { errors: { form: "ไม่พบบัญชีนี้" } };
  const temp = temporaryPassword();
  await asActor(admin.id, async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { passwordHash: bcrypt.hashSync(temp, 10), mustChangePassword: true } });
    await tx.session.deleteMany({ where: { userId } }); // log out everywhere
  });
  await audit({ user: admin, action: "admin.user.reset", entity: "User", entityId: userId });
  revalidatePath("/admin/users");
  return { ok: `ตั้งรหัสผ่านชั่วคราวใหม่ให้ ${u.username} แล้ว`, tempPassword: temp, username: u.username };
}

export async function setUserActive(userId: number, active: boolean): Promise<UserResult> {
  const admin = await requireAdmin();
  if (userId === admin.id && !active) return { errors: { form: "ปิดการใช้งานบัญชีของตัวเองไม่ได้" } };
  const u = await db.user.findUnique({ where: { id: userId } });
  if (!u) return { errors: { form: "ไม่พบบัญชีนี้" } };
  if (!active && u.role === "admin" && (await activeAdmins()) <= 1) return { errors: { form: "ต้องมีผู้ดูแลระบบที่ใช้งานได้อย่างน้อย 1 บัญชี" } };
  if (active && u.role === "pcu" && u.facility) {
    const f = await db.facility.findUnique({ where: { name: u.facility } });
    if (!f?.active) return { errors: { form: `${u.facility} ถูกปิดแล้ว ย้ายบัญชีไปหน่วยที่เปิดอยู่ก่อน แล้วจึงเปิดใช้งาน` } };
  }
  await asActor(admin.id, async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { active } });
    if (!active) await tx.session.deleteMany({ where: { userId } });
  });
  await audit({ user: admin, action: active ? "admin.user.activate" : "admin.user.deactivate", entity: "User", entityId: userId });
  revalidatePath("/admin/users");
  return { ok: active ? `เปิดการใช้งาน ${u.username} แล้ว` : `ปิดการใช้งาน ${u.username} แล้ว` };
}

async function activeAdmins() {
  return db.user.count({ where: { role: "admin", active: true } });
}
