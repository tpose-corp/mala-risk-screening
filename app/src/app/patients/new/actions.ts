"use server";
// PBI-04 — add a new patient. Name + date of birth are required together so two people with
// the same common Thai name aren't mixed up; HN is optional (intent.md, Sep 8).

import { RedirectType, redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { hnProblem, isValidThaiDob, nameProblem } from "@/lib/format";
import { requireFacilityStaff } from "@/lib/session";
// Redirects use RedirectType.replace: the submitted form page is replaced in the browser history,
// so pressing Back cannot return to it and submit the same data twice (Server Actions push by default).

export type NewPatientState = { errors?: Record<string, string[] | undefined> } | undefined;

const NewPatientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "กรุณากรอกชื่อ–นามสกุล" })
    .superRefine((v, ctx) => {
      const problem = nameProblem(v);
      if (problem) ctx.addIssue({ code: "custom", message: problem });
    }),
  sex: z.enum(["หญิง", "ชาย"], { error: "กรุณาเลือกเพศ" }),
  // The form sends "dd/mm/yyyy" (พ.ศ.) built from the 3 dropdowns; re-check it here anyway,
  // because anything coming from the browser can be tampered with.
  dob: z.string().refine((v) => isValidThaiDob(v), { error: "กรุณาเลือกวันเกิดให้ครบ (วัน / เดือน / ปี พ.ศ.)" }),
  hn: z
    .string()
    .trim()
    .max(20, { error: "HN ยาวเกินไป" })
    .superRefine((v, ctx) => {
      const problem = hnProblem(v);
      if (problem) ctx.addIssue({ code: "custom", message: problem });
    })
    .optional(),
});

export async function createPatient(_prev: NewPatientState, formData: FormData): Promise<NewPatientState> {
  const user = await requireFacilityStaff(); // always re-check login inside an action, not only on the page

  const parsed = NewPatientSchema.safeParse({
    name: formData.get("name"),
    sex: formData.get("sex"),
    dob: formData.get("dob"),
    hn: formData.get("hn") || undefined,
  });
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  const patient = await db.patient.create({
    data: { ...parsed.data, hn: parsed.data.hn || null, facility: user.facility, createdById: user.id },
  });
  await audit({ user, action: "patient.create", entity: "Patient", entityId: patient.id });

  redirect(`/patients/${patient.id}/screen`, RedirectType.replace);
}
