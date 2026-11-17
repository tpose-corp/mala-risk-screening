"use server";
// Staff accounts are created ONLY by the hospital admin (no self sign-up, 17 Nov 2026).
// Sign-in = a username the admin picks + a temporary password the system generates; the person
// must set their own password at first login. Accounts are switched off, never deleted, so the
// audit trail always points at a real account.

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { asActor } from "@/lib/actor";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { temporaryPassword } from "@/lib/password";
import { requireAdmin } from "@/lib/session";

export type UserFormState = { error?: string; ok?: string; tempPassword?: string; username?: string } | undefined;

const UserSchema = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,30}$/, { error: "ชื่อผู้ใช้ใช้ได้เฉพาะ a-z 0-9 . _ - ยาว 3 ถึง 30 ตัว" }),
  displayName: z.string().trim().min(2, { error: "กรุณากรอกชื่อ–นามสกุล" }).max(100),
  role: z.enum(["admin", "clinician", "pcu"], { error: "กรุณาเลือกบทบาท" }),
  facility: z.string().trim().optional(),
  position: z.string().trim().max(60).optional(),
  licenseNo: z.string().trim().max(30).optional(),
  phone: z.string().trim().max(20).optional(),
});

function readUser(fd: FormData) {
  const get = (k: string) => (fd.get(k) ? String(fd.get(k)) : undefined);
  return UserSchema.safeParse({
    username: get("username") ?? "", displayName: get("displayName") ?? "", role: get("role"),
    facility: get("facility"), position: get("position"), licenseNo: get("licenseNo"), phone: get("phone"),
  });
}

async function facilityCheck(role: string, facility?: string) {
  if (role !== "pcu") return null; // hospital staff have no unit
  if (!facility) return "บัญชีเจ้าหน้าที่ รพ.สต. ต้องเลือกหน่วยบริการ";
  const f = await db.facility.findUnique({ where: { name: facility } });
  return f && f.active ? null : "ไม่พบหน่วยบริการนี้ หรือหน่วยบริการถูกปิดอยู่";
}

export async function createUser(_prev: UserFormState, fd: FormData): Promise<UserFormState> {
  const admin = await requireAdmin();
  const p = readUser(fd);
  if (!p.success) return { error: p.error.issues[0].message };
  const d = p.data;
  const fe = await facilityCheck(d.role, d.facility);
  if (fe) return { error: fe };
  if (await db.user.findUnique({ where: { username: d.username } })) return { error: "ชื่อผู้ใช้นี้มีอยู่แล้ว" };

  const temp = temporaryPassword();
  const u = await asActor(admin.id, (tx) =>
    tx.user.create({
      data: {
        username: d.username, displayName: d.displayName, role: d.role,
        facility: d.role === "pcu" ? d.facility! : null,
        position: d.position || null, licenseNo: d.licenseNo || null, phone: d.phone || null,
        passwordHash: bcrypt.hashSync(temp, 10), mustChangePassword: true,
      },
    }),
  );
  await audit({ user: admin, action: "admin.user.create", entity: "User", entityId: u.id, detail: `username=${u.username} role=${u.role}` });
  revalidatePath("/admin/users");
  return { ok: `สร้างบัญชี ${u.username} แล้ว`, tempPassword: temp, username: u.username };
}

export async function updateUser(userId: number, _prev: UserFormState, fd: FormData): Promise<UserFormState> {
  const admin = await requireAdmin();
  const p = readUser(fd);
  if (!p.success) return { error: p.error.issues[0].message };
  const d = p.data;
  const fe = await facilityCheck(d.role, d.facility);
  if (fe) return { error: fe };
  const before = await db.user.findUnique({ where: { id: userId } });
  if (!before) return { error: "ไม่พบบัญชี" };
  if (before.role === "admin" && d.role !== "admin" && (await activeAdmins()) <= 1) return { error: "ต้องมีผู้ดูแลระบบอย่างน้อย 1 บัญชี" };
  const clash = await db.user.findUnique({ where: { username: d.username } });
  if (clash && clash.id !== userId) return { error: "ชื่อผู้ใช้นี้มีอยู่แล้ว" };

  const data = {
    username: d.username, displayName: d.displayName, role: d.role, facility: d.role === "pcu" ? d.facility! : null,
    position: d.position || null, licenseNo: d.licenseNo || null, phone: d.phone || null,
  };
  const changed = (Object.keys(data) as (keyof typeof data)[]).filter((k) => (before[k] ?? null) !== (data[k] ?? null));
  await asActor(admin.id, (tx) => tx.user.update({ where: { id: userId }, data }));
  const roleChange = before.role !== d.role ? `role=${before.role}>${d.role} ` : "";
  await audit({ user: admin, action: "admin.user.update", entity: "User", entityId: userId, detail: `${roleChange}changed=${changed.join(",") || "none"}` });
  revalidatePath("/admin/users");
  return { ok: "บันทึกการแก้ไขแล้ว" };
}

export async function resetPassword(userId: number, prev: UserFormState): Promise<UserFormState> {
  void prev; // useActionState passes the previous result; not needed here
  const admin = await requireAdmin();
  // Resetting your own account would log you out before you could read the new password.
  if (userId === admin.id) return { error: "เปลี่ยนรหัสผ่านของบัญชีตัวเองที่เมนูชื่อผู้ใช้มุมขวาบน" };
  const u = await db.user.findUnique({ where: { id: userId } });
  if (!u) return { error: "ไม่พบบัญชี" };
  const temp = temporaryPassword();
  await asActor(admin.id, async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { passwordHash: bcrypt.hashSync(temp, 10), mustChangePassword: true } });
    await tx.session.deleteMany({ where: { userId } }); // log out everywhere
  });
  await audit({ user: admin, action: "admin.user.reset", entity: "User", entityId: userId });
  return { ok: `ตั้งรหัสผ่านชั่วคราวใหม่ให้ ${u.username} แล้ว`, tempPassword: temp, username: u.username };
}

async function activeAdmins() {
  return db.user.count({ where: { role: "admin", active: true } });
}

export async function setUserActive(userId: number, active: boolean) {
  const admin = await requireAdmin();
  if (userId === admin.id && !active) return; // cannot lock yourself out
  const u = await db.user.findUnique({ where: { id: userId } });
  if (!u) return;
  if (!active && u.role === "admin" && (await activeAdmins()) <= 1) return;
  await asActor(admin.id, async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { active } });
    if (!active) await tx.session.deleteMany({ where: { userId } });
  });
  await audit({ user: admin, action: active ? "admin.user.activate" : "admin.user.deactivate", entity: "User", entityId: userId });
  revalidatePath("/admin/users");
}
