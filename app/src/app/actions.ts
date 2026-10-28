"use server";
// Server Actions = functions that run on the server when a <form> is submitted.
// "use server" at the top makes every exported function here callable from a form.

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { HOSPITAL, createSession, deleteSession, getCurrentUser } from "@/lib/session";

export type LoginState = { error?: string } | undefined;

const LoginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

// PBI-01 — log in. Every success AND failure is written to the audit log (rule.md, CCA §26).
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" };

  const { username, password } = parsed.data;
  const user = await db.user.findUnique({ where: { username } });
  const ok = user ? await bcrypt.compare(password, user.passwordHash) : false;

  if (!user || !ok) {
    // Never log the password (rule.md, CCA §26). What was typed is kept only when it is a real
    // account name: people sometimes type their password into the username box by mistake.
    await audit(user ? { username, action: "login.failed", detail: "account=exists" } : { action: "login.failed", detail: "account=unknown" });
    return { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
  }

  await createSession(user.id);
  await audit({ user, action: "login.success" });
  redirect(user.facility === HOSPITAL ? "/hospital" : "/patients");
}

export async function logout() {
  const user = await getCurrentUser();
  if (user) await audit({ user, action: "logout" });
  await deleteSession();
  redirect("/login");
}
