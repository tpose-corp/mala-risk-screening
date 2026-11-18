"use server";
// Hospital side (clinician or admin). Doctors and nurses do NOT change what the รพ.สต. recorded
// (17 Nov 2026 decision): they acknowledge the alert and record what they will do with the patient.

import { revalidatePath } from "next/cache";
import { asActor } from "@/lib/actor";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { requireHospital } from "@/lib/session";

const NOTE_MIN = 3;
const cleanNote = (v: unknown) => String(v ?? "").trim().slice(0, 1000);

// Adds one note to the case's history (FollowUpNote, append-only) and keeps the "latest note"
// columns on Screening up to date for lists. Never replaces an older note.
// `keep` is the screening's updatedAt: a hospital note is not an edit of the รพ.สต. screening data,
// so "แก้ไขล่าสุด" must not move.
async function addNote(tx: Parameters<Parameters<typeof asActor>[1]>[0], screeningId: number, userId: number, note: string, keep: Date) {
  const at = new Date();
  await tx.followUpNote.create({ data: { screeningId, byId: userId, note, at } });
  await tx.screening.update({ where: { id: screeningId }, data: { followUpNote: note, followUpAt: at, followUpById: userId, updatedAt: keep } });
}

// "รับเรื่อง" always comes with a note of what the doctor / nurse did or will do (18 Nov 2026).
// If someone else took the case first, the note is still kept in the history (nothing typed is lost).
export async function acknowledgeAlert(screeningId: number, rawNote: string): Promise<{ ok: true } | { takenBy: string } | { error: string }> {
  const user = await requireHospital();
  const note = cleanNote(rawNote);
  if (note.length < NOTE_MIN) return { error: "กรุณาบันทึกการดำเนินการกับผู้ป่วยก่อนรับเรื่อง" };
  const s = await db.screening.findUnique({ where: { id: screeningId }, select: { isAlert: true, updatedAt: true } });
  if (!s?.isAlert) return { error: "ไม่พบเคสแจ้งเตือนนี้" };
  const count = await asActor(user.id, async (tx) => {
    const r = await tx.screening.updateMany({
      where: { id: screeningId, isAlert: true, acknowledgedAt: null },
      data: { acknowledgedAt: new Date(), acknowledgedById: user.id, updatedAt: s.updatedAt },
    });
    await addNote(tx, screeningId, user.id, note, s.updatedAt);
    return r.count;
  });
  await audit({ user, action: "followup.add", entity: "Screening", entityId: screeningId });
  revalidatePath("/hospital");
  revalidatePath(`/hospital/cases/${screeningId}`);
  if (count > 0) {
    await audit({ user, action: "alert.acknowledge", entity: "Screening", entityId: screeningId });
    return { ok: true };
  }
  const t = await db.screening.findUnique({ where: { id: screeningId }, select: { acknowledgedBy: { select: { displayName: true } } } });
  return { takenBy: t?.acknowledgedBy?.displayName ?? "ผู้ใช้อื่น" };
}

// "การดำเนินการกับผู้ป่วย": one more note in the case history (who, what, when). Old notes stay.
export async function saveFollowUp(screeningId: number, formData: FormData) {
  const user = await requireHospital();
  const note = cleanNote(formData.get("note"));
  if (note.length < NOTE_MIN) return;
  const s = await db.screening.findUnique({ where: { id: screeningId }, select: { id: true, patientId: true, updatedAt: true } });
  if (!s) return;
  await asActor(user.id, (tx) => addNote(tx, s.id, user.id, note, s.updatedAt));
  await audit({ user, action: "followup.add", entity: "Screening", entityId: s.id });
  revalidatePath(`/hospital/cases/${s.id}`);
  revalidatePath(`/hospital/patients/${s.patientId}`);
}
