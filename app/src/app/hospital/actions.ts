"use server";
// Hospital side (clinician or admin). Doctors and nurses do NOT change what the รพ.สต. recorded
// (17 Nov 2026 decision): they acknowledge the alert and record what they will do with the patient.

import { revalidatePath } from "next/cache";
import { asActor } from "@/lib/actor";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { requireHospital } from "@/lib/session";

export async function acknowledgeAlert(screeningId: number) {
  const user = await requireHospital();
  const { count } = await asActor(user.id, (tx) =>
    tx.screening.updateMany({
      where: { id: screeningId, isAlert: true, acknowledgedAt: null },
      data: { acknowledgedAt: new Date(), acknowledgedById: user.id },
    }),
  );
  if (count > 0) await audit({ user, action: "alert.acknowledge", entity: "Screening", entityId: screeningId });
  revalidatePath("/hospital");
  revalidatePath(`/hospital/cases/${screeningId}`);
}

// "การดำเนินการกับผู้ป่วย": free text, kept with who and when. Replacing it keeps the old text
// in the Amendment history, so nothing a doctor wrote is ever lost.
export async function saveFollowUp(screeningId: number, formData: FormData) {
  const user = await requireHospital();
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000);
  if (!note) return;
  const s = await db.screening.findUnique({ where: { id: screeningId } });
  if (!s) return;
  await asActor(user.id, async (tx) => {
    if (s.followUpNote) {
      await tx.amendment.create({
        data: { byId: user.id, entity: "Screening", entityId: s.id, patientId: s.patientId, field: "followUpNote", oldValue: s.followUpNote, newValue: note, reason: "แพทย์/พยาบาลบันทึกการดำเนินการใหม่" },
      });
    }
    await tx.screening.update({ where: { id: s.id }, data: { followUpNote: note, followUpAt: new Date(), followUpById: user.id } });
  });
  await audit({ user, action: "followup.save", entity: "Screening", entityId: s.id });
  revalidatePath(`/hospital/cases/${s.id}`);
}
