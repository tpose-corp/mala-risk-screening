"use server";
// PBI-04 v2 — a รพ.สต. adds a patient. The 13-digit national ID is required and is the one key
// that stops the same person being registered twice across units (17 Nov 2026):
//   new ID                       → create as "pending" (the hospital admin verifies it and adds the HN), screen now
//   ID already at THIS unit      → don't duplicate, go to that patient
//   ID already at ANOTHER unit   → refuse, tell staff to send the patient to their own unit or the hospital
//   ID known but no home unit    → this unit becomes the home unit
// The refusal shows only the other unit's name, nothing else about the patient (PDPA).

import { RedirectType, redirect } from "next/navigation";
import { z } from "zod";
import { asActor } from "@/lib/actor";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { isValidThaiDob, nameProblem, normalizeCardId } from "@/lib/format";
import { requireFacilityStaff } from "@/lib/session";

export type NewPatientState =
  | { errors?: Record<string, string[] | undefined>; otherUnit?: string }
  | undefined;

const NewPatientSchema = z.object({
  cardId: z
    .string()
    .transform(normalizeCardId)
    .refine((v) => /^\d{13}$/.test(v), { error: "เลขประจำตัวประชาชนต้องมี 13 หลัก" }),
  name: z
    .string()
    .trim()
    .min(2, { error: "กรุณากรอกชื่อ–นามสกุล" })
    .superRefine((v, ctx) => {
      const problem = nameProblem(v);
      if (problem) ctx.addIssue({ code: "custom", message: problem });
    }),
  sex: z.enum(["หญิง", "ชาย"], { error: "กรุณาเลือกเพศ" }),
  dob: z.string().refine((v) => isValidThaiDob(v), { error: "กรุณาเลือกวันเกิดให้ครบ (วัน / เดือน / ปี พ.ศ.)" }),
  phone: z.string().trim().max(20).optional(),
});

export async function createPatient(_prev: NewPatientState, formData: FormData): Promise<NewPatientState> {
  const user = await requireFacilityStaff(); // always re-check login inside an action, not only on the page

  const parsed = NewPatientSchema.safeParse({
    cardId: formData.get("cardId") ?? "",
    name: formData.get("name"),
    sex: formData.get("sex"),
    dob: formData.get("dob"),
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };
  const d = parsed.data;

  const existing = await db.patient.findUnique({ where: { cardId: d.cardId } });
  if (existing && existing.active) {
    if (existing.facility === user.facility) {
      await audit({ user, action: "patient.duplicate.found", entity: "Patient", entityId: existing.id });
      redirect(`/patients/${existing.id}/screen`, RedirectType.replace);
    }
    if (existing.facility) {
      await audit({ user, action: "patient.duplicate.blocked", entity: "Patient", entityId: existing.id });
      return { otherUnit: existing.facility };
    }
    // Known to the hospital but no home unit yet: this unit takes the patient on.
    await asActor(user.id, (tx) => tx.patient.update({ where: { id: existing.id }, data: { facility: user.facility } }));
    await audit({ user, action: "patient.claim", entity: "Patient", entityId: existing.id });
    redirect(`/patients/${existing.id}/screen`, RedirectType.replace);
  }
  if (existing) {
    // Deactivated by the admin: don't silently bring it back.
    return { errors: { cardId: ["เลขนี้ถูกปิดใช้งานในระบบ กรุณาติดต่อผู้ดูแลระบบ รพ."] } };
  }

  const patient = await db.patient.create({
    data: { ...d, phone: d.phone || null, facility: user.facility, status: "pending", createdById: user.id },
  });
  await audit({ user, action: "patient.create", entity: "Patient", entityId: patient.id });

  redirect(`/patients/${patient.id}/screen`, RedirectType.replace);
}
