"use server";
// One manual per group of users (same idea as the printing-request system's manuals page).
// Replacing a file keeps the old one switched off, never deleted; "ลบ" also only switches off.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { MANUAL_AUDIENCES, MANUAL_MAX_MB } from "@/lib/manuals";
import { requireAdmin } from "@/lib/session";

const done = (q: string) => redirect(`/admin/manuals?${q}`);

export async function uploadManual(audience: string, fd: FormData) {
  const admin = await requireAdmin();
  if (!MANUAL_AUDIENCES.some((a) => a.key === audience)) done("err=audience");
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) done("err=missing");
  const f = file as File;
  if (!(f.type === "application/pdf" || /\.pdf$/i.test(f.name))) done("err=type");
  if (f.size > MANUAL_MAX_MB * 1024 * 1024) done("err=size");
  // the name and type come from the browser and can be faked: the file itself must start with "%PDF-"
  const head = new Uint8Array(await f.slice(0, 5).arrayBuffer());
  if (String.fromCharCode(...head) !== "%PDF-") done("err=type");
  const title = MANUAL_AUDIENCES.find((a) => a.key === audience)!.title;
  const m = await db.$transaction(async (tx) => {
    await tx.manual.updateMany({ where: { audience, active: true }, data: { active: false } });
    return tx.manual.create({
      data: { title, fileName: f.name.slice(0, 200), mime: "application/pdf", size: f.size, data: new Uint8Array(await f.arrayBuffer()), audience, uploadedById: admin.id },
    });
  });
  await audit({ user: admin, action: "admin.manual.upload", entity: "Manual", entityId: m.id });
  revalidatePath("/", "layout");
  done(`ok=uploaded&a=${audience}`);
}

export async function removeManual(audience: string) {
  const admin = await requireAdmin();
  const current = await db.manual.findFirst({ where: { audience, active: true } });
  if (current) {
    await db.manual.update({ where: { id: current.id }, data: { active: false } });
    await audit({ user: admin, action: "admin.manual.remove", entity: "Manual", entityId: current.id });
  }
  revalidatePath("/", "layout");
  done(`ok=removed&a=${audience}`);
}
