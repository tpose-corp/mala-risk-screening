"use server";

import { RedirectType, redirect } from "next/navigation";
import { tasksFor } from "@/lib/advice";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { requireFacilityStaff } from "@/lib/session";
// Redirects use RedirectType.replace: the submitted form page is replaced in the browser history,
// so pressing Back cannot return to it and submit the same data twice (Server Actions push by default).

export type FormState = { error?: string } | undefined;

async function findForUser(screeningId: number) {
  const user = await requireFacilityStaff();
  const screening = await db.screening.findFirst({
    where: { id: screeningId, patient: { facility: user.facility } },
  });
  return { user, screening };
}

// Step 4: staff records that the advice was given to the patient (any case that needs advice).
export async function markAdviceGiven(screeningId: number, _prev: FormState, formData: FormData): Promise<FormState> {
  const { user, screening } = await findForUser(screeningId);
  if (!screening || !tasksFor(screening).needsAdvice) return { error: "ไม่พบผลประเมินนี้" };
  if (formData.get("advised") !== "on") return { error: "กรุณายืนยันว่าได้แจ้งคำแนะนำให้ผู้ป่วยแล้ว" };

  if (!screening.adviceGivenAt) {
    await db.screening.update({ where: { id: screeningId }, data: { adviceGivenAt: new Date() } });
    await audit({ user, action: "advice.given", entity: "Screening", entityId: screeningId });
  }
  redirect(`/screenings/${screeningId}/confirm`, RedirectType.replace);
}

// Step 5 · PBI-11 — confirm / e-signature (ETA §9): store WHO confirmed, WHEN, and WHICH record.
// A confirmed record cannot be confirmed again (test-plan PBI-11 #2).
export async function confirmScreening(screeningId: number, _prev: FormState, formData: FormData): Promise<FormState> {
  const { user, screening } = await findForUser(screeningId);
  if (!screening) return { error: "ไม่พบผลประเมินนี้" };
  if (tasksFor(screening).needsAdvice && !screening.adviceGivenAt) return { error: "ต้องแจ้งคำแนะนำให้ผู้ป่วยก่อนปิดเคส" };
  if (formData.get("attest") !== "on") return { error: "กรุณาติ๊กยืนยันว่าข้อมูลและผลการประเมินถูกต้อง" };

  const note = String(formData.get("note") ?? "").trim().slice(0, 1000);

  // `confirmedAt: null` in the WHERE means: only succeed if nobody confirmed it yet.
  const { count } = await db.screening.updateMany({
    where: { id: screeningId, confirmedAt: null },
    data: { confirmedAt: new Date(), confirmedById: user.id, confirmNote: note || null },
  });
  if (count === 0) {
    await audit({ user, action: "screening.confirm.rejected", entity: "Screening", entityId: screeningId, detail: "already confirmed" });
    return { error: "เคสนี้ถูกยืนยันไปแล้ว แก้ไขซ้ำไม่ได้" };
  }

  await audit({ user, action: "screening.confirm", entity: "Screening", entityId: screeningId, detail: `ruleVersion=${screening.ruleVersion}` });
  redirect(`/screenings/${screeningId}/confirm?saved=1`, RedirectType.replace); // same URL now shows the closed case; ?saved=1 opens the success popup
}
