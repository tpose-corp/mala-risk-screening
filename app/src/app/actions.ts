"use server";
// Server Actions = functions that run on the server when a <form> is submitted.
// "use server" at the top makes every exported function here callable from a form.

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { asActor } from "@/lib/actor";
import { createSession, deleteSession, getCurrentUser, homeOf, touchSession } from "@/lib/session";

export type LoginState = { error?: string } | undefined;

const LoginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

const MAX_FAILS = 5;
const LOCK_MINUTES = 15;

// PBI-01 — log in. Every success AND failure is written to the audit log (rule.md, CCA §26).
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" };

  const { username, password } = parsed.data;
  const user = await db.user.findUnique({ where: { username } });

  // Brute-force guard (OWASP A07): 5 wrong passwords for one account within 15 minutes locks that
  // account for 15 minutes. Counted from the audit log, so it also works across devices.
  if (user) {
    const since = new Date(Date.now() - LOCK_MINUTES * 60_000);
    const fails = await db.auditLog.count({ where: { username, action: "login.failed", at: { gte: since } } });
    if (fails >= MAX_FAILS) {
      await audit({ username, action: "login.locked", detail: `fails=${fails}` });
      return { error: `ใส่รหัสผ่านผิดเกิน ${MAX_FAILS} ครั้ง บัญชีนี้ถูกพักไว้ชั่วคราว กรุณาลองใหม่อีกครั้งใน ${LOCK_MINUTES} นาที หรือติดต่อผู้ดูแลระบบ` };
    }
  }
  const ok = user ? await bcrypt.compare(password, user.passwordHash) : false;

  if (!user || !ok) {
    // Never log the password (rule.md, CCA §26). What was typed is kept only when it is a real
    // account name: people sometimes type their password into the username box by mistake.
    await audit(user ? { username, action: "login.failed", detail: "account=exists" } : { action: "login.failed", detail: "account=unknown" });
    return { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
  }

  // A deactivated account cannot log in (the admin "removes" staff this way, never by deleting).
  if (!user.active) {
    await audit({ user, action: "login.inactive" });
    return { error: "บัญชีนี้ถูกปิดการใช้งาน กรุณาติดต่อผู้ดูแลระบบ รพ." };
  }

  await createSession(user.id);
  await asActor(user.id, (tx) => tx.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }));
  await audit({ user, action: "login.success" });
  redirect(user.mustChangePassword ? "/account/password" : homeOf(user.role));
}

// The user is active on the page (typing, clicking): push the idle deadline forward.
// Background refreshes (the inbox every 10 s) do NOT call this, so an unattended screen still times out.
export async function keepAlive(): Promise<{ ok: boolean }> {
  return { ok: await touchSession() };
}

// Called by the idle timer in the browser when time is up: end the session and say why.
export async function logoutIdle() {
  const user = await getCurrentUser();
  if (user) await audit({ user, action: "logout.idle" });
  await deleteSession();
  redirect("/login?reason=idle");
}

export async function logout() {
  const user = await getCurrentUser();
  if (user) await audit({ user, action: "logout" });
  await deleteSession();
  redirect("/login");
}
