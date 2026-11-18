"use server";
// Change my own password (/account/password). Returns errors per box, so the page can mark and
// focus the wrong one, or { ok } so the page can show a "done" popup before it moves on.
import bcrypt from "bcryptjs";
import { asActor } from "@/lib/actor";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { passwordProblem } from "@/lib/password";
import { homeOf, requireUser } from "@/lib/session";

export type PasswordResult = { ok?: true; home?: string; errors?: Record<string, string> };

export async function changePassword(input: { current: string; next: string; again: string }): Promise<PasswordResult> {
  const user = await requireUser({ allowPasswordChange: true });
  const { current, next, again } = input;
  const errors: Record<string, string> = {};
  if (!current) errors.current = "กรุณากรอกรหัสผ่านปัจจุบัน";
  const problem = next ? passwordProblem(next) : "กรุณากรอกรหัสผ่านใหม่";
  if (problem) errors.next = problem;
  else if (next === current) errors.next = "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม";
  if (!again) errors.again = "กรุณาพิมพ์รหัสผ่านใหม่อีกครั้ง";
  else if (next !== again) errors.again = "รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน";
  if (!errors.current) {
    const row = await db.user.findUnique({ where: { id: user.id } });
    if (!row || !(await bcrypt.compare(current, row.passwordHash))) errors.current = "รหัสผ่านปัจจุบันไม่ถูกต้อง";
  }
  if (Object.keys(errors).length) {
    if (errors.current === "รหัสผ่านปัจจุบันไม่ถูกต้อง") await audit({ user, action: "account.password.failed", entity: "User", entityId: user.id });
    return { errors };
  }

  await asActor(user.id, (tx) =>
    tx.user.update({ where: { id: user.id }, data: { passwordHash: bcrypt.hashSync(next, 10), mustChangePassword: false } }),
  );
  await audit({ user, action: "account.password.change", entity: "User", entityId: user.id });
  return { ok: true, home: homeOf(user.role) };
}
