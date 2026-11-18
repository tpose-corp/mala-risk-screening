// Login sessions (PBI-01) and who-may-see-what (RBAC, rule.md least privilege).
// How it works: on login we create a random token, put it in an httpOnly cookie (JavaScript in
// the browser cannot read it), and store only its SHA-256 hash in the database. On every page we
// hash the cookie again and look it up. If someone steals the database, they still can't log in.
//
// Three roles (hospital requirement list, 17 Nov 2026):
//   admin      hospital back office, everything
//   clinician  doctor / nurse chosen by the hospital: every unit, read-only, no export
//   pcu        รพ.สต. staff: own unit only
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { audit } from "./audit";
import { db } from "./db";
import { getSettings } from "./settings";

const COOKIE = "mala_session";
const SESSION_HOURS = 8; // one working shift: the longest a login can last
export const IDLE_MINUTES = 30; // logged out after this long without any activity (OWASP A07)

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const hardEnd = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);
  // expiresAt = the idle deadline; keepAlive() moves it forward while the user is active
  const expiresAt = new Date(Date.now() + IDLE_MINUTES * 60_000);
  await db.session.create({ data: { id: hash(token), userId, expiresAt } });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: hardEnd,
  });
}

// Pushes the idle deadline forward (never past the 8-hour limit). False = already expired.
export async function touchSession(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return false;
  const s = await db.session.findUnique({ where: { id: hash(token) }, select: { id: true, createdAt: true, expiresAt: true } });
  if (!s || s.expiresAt < new Date()) return false;
  const hardEnd = s.createdAt.getTime() + SESSION_HOURS * 60 * 60 * 1000;
  const next = Math.min(hardEnd, Date.now() + IDLE_MINUTES * 60_000);
  await db.session.update({ where: { id: s.id }, data: { expiresAt: new Date(next) } });
  return next > Date.now();
}

export async function deleteSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: hash(token) } });
  cookieStore.delete(COOKIE);
}

export type Role = "admin" | "clinician" | "pcu";

export type CurrentUser = {
  id: number;
  username: string;
  displayName: string;
  role: Role;
  facility: string | null;
  mustChangePassword: boolean;
};

// `cache` = look the session up once per page render, even if several components ask.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { id: hash(token) },
    include: { user: true },
  });
  const hardEnd = session ? session.createdAt.getTime() + SESSION_HOURS * 60 * 60 * 1000 : 0;
  // idle deadline passed, 8-hour limit passed, or account switched off: not logged in
  if (!session || session.expiresAt < new Date() || hardEnd < Date.now() || !session.user.active) return null;

  const { id, username, displayName, role, facility, mustChangePassword } = session.user;
  return { id, username, displayName, role: role as Role, facility, mustChangePassword };
});

// Why there is no valid session although the browser still has one: idle too long, or the
// 8-hour limit. Used to tell the user on the login page (?reason=).
async function endedReason(): Promise<string> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return "";
  const s = await db.session.findUnique({ where: { id: hash(token) }, select: { createdAt: true, expiresAt: true } });
  if (!s) return "";
  if (s.createdAt.getTime() + SESSION_HOURS * 60 * 60 * 1000 < Date.now()) return "?reason=expired";
  return s.expiresAt < new Date() ? "?reason=idle" : "";
}

// Where each role lands after login.
export const homeOf = (role: string) => (role === "admin" ? "/admin" : role === "clinician" ? "/hospital" : "/patients");

// Use at the top of every protected page / action. Not logged in → go to /login.
// Also enforces: a temporary password must be changed first, and a role the admin switched off
// cannot use the system (admins are never switched off, so they can switch it back on).
export async function requireUser(opts: { allowPasswordChange?: boolean } = {}): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login${await endedReason()}`);
  if (user.mustChangePassword && !opts.allowPasswordChange) redirect("/account/password");
  if (user.role !== "admin") {
    const s = await getSettings();
    if ((user.role === "pcu" && !s.pcuEnabled) || (user.role === "clinician" && !s.clinicianEnabled)) {
      redirect("/closed");
    }
  }
  return user;
}

async function requireRoles(roles: Role[], area: string): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    await audit({ user, action: "access.denied", detail: `area=${area}` });
    redirect(homeOf(user.role));
  }
  return user;
}

// The referral hospital name, shown in headers and used by the seed data.
export const HOSPITAL = "รพ.เชียงรายประชานุเคราะห์";
export const isHospital = (u: CurrentUser) => u.role === "admin" || u.role === "clinician";

// Hospital pages (alert inbox, all cases, patient history): clinician + admin.
export const requireHospital = () => requireRoles(["admin", "clinician"], "hospital");
export const requireAdmin = () => requireRoles(["admin"], "admin");

// รพ.สต. pages. A pcu account always has a facility (the admin form requires it).
export async function requireFacilityStaff(): Promise<CurrentUser & { facility: string }> {
  const user = await requireRoles(["pcu"], "facility");
  if (!user.facility) redirect("/closed");
  return user as CurrentUser & { facility: string };
}

// Lives in format.ts so plain (non-server) helpers can use it too.
export { ROLE_LABEL } from "./format";
