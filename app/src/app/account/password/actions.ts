"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { asActor } from "@/lib/actor";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { passwordProblem } from "@/lib/password";
import { homeOf, requireUser } from "@/lib/session";

export async function changePassword(_prev: { error?: string } | undefined, formData: FormData) {
  const user = await requireUser({ allowPasswordChange: true });
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const again = String(formData.get("again") ?? "");

  const row = await db.user.findUnique({ where: { id: user.id } });
  if (!row || !(await bcrypt.compare(current, row.passwordHash))) return { error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" };
  const problem = passwordProblem(next);
  if (problem) return { error: problem };
  if (next !== again) return { error: "รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน" };
  if (next === current) return { error: "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม" };

  await asActor(user.id, (tx) =>
    tx.user.update({ where: { id: user.id }, data: { passwordHash: bcrypt.hashSync(next, 10), mustChangePassword: false } }),
  );
  await audit({ user, action: "account.password.change", entity: "User", entityId: user.id });
  redirect(homeOf(user.role));
}
