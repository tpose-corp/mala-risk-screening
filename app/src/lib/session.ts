// Login sessions (PBI-01).
// How it works: on login we create a random token, put it in an httpOnly cookie (JavaScript in
// the browser cannot read it), and store only its SHA-256 hash in the database. On every page we
// hash the cookie again and look it up. If someone steals the database, they still can't log in.
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { audit } from "./audit";
import { db } from "./db";

const COOKIE = "mala_session";
const SESSION_HOURS = 8; // one working shift

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);
  await db.session.create({ data: { id: hash(token), userId, expiresAt } });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: hash(token) } });
  cookieStore.delete(COOKIE);
}

export type CurrentUser = {
  id: number;
  username: string;
  displayName: string;
  role: string;
  facility: string;
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
  if (!session || session.expiresAt < new Date()) return null;

  const { id, username, displayName, role, facility } = session.user;
  return { id, username, displayName, role, facility };
});

// Use at the top of every protected page / action. Not logged in → go to /login.
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// The referral hospital. Its staff see alerts and cases from every รพ.สต. in the network,
// but they don't screen patients themselves (that is the front-line staff's job).
export const HOSPITAL = "รพ.เชียงรายประชานุเคราะห์";
export const isHospital = (u: CurrentUser) => u.facility === HOSPITAL;

export async function requireHospital(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!isHospital(user)) {
    await audit({ user, action: "access.denied", detail: "area=hospital" });
    redirect("/patients");
  }
  return user;
}

export async function requireFacilityStaff(): Promise<CurrentUser> {
  const user = await requireUser();
  if (isHospital(user)) {
    await audit({ user, action: "access.denied", detail: "area=facility" });
    redirect("/hospital");
  }
  return user;
}

// Lives in format.ts so plain (non-server) helpers can use it too.
export { ROLE_LABEL } from "./format";
