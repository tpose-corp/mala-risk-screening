"use server";
// Hospital doctor presses "รับเรื่องแล้ว" on an alert. Stored once (who + when) and audited,
// so the รพ.สต. side can see the hospital has taken over.

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { requireHospital } from "@/lib/session";

export async function acknowledgeAlert(screeningId: number) {
  const user = await requireHospital();
  const { count } = await db.screening.updateMany({
    where: { id: screeningId, isAlert: true, acknowledgedAt: null },
    data: { acknowledgedAt: new Date(), acknowledgedById: user.id },
  });
  if (count > 0) await audit({ user, action: "alert.acknowledge", entity: "Screening", entityId: screeningId });
  revalidatePath("/hospital");
  revalidatePath(`/hospital/cases/${screeningId}`);
}
