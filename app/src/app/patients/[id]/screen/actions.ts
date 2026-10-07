"use server";
// PBI-05 + PBI-06 — save the 13-item screening form and run the rule engine ON THE SERVER.
// The browser only shows a BMI preview; the real result is always computed here, so nobody can
// tamper with the outcome from the browser.

import { RedirectType, redirect } from "next/navigation";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { evaluate } from "@/lib/rules";
import { requireFacilityStaff } from "@/lib/session";
// Redirects use RedirectType.replace: the submitted form page is replaced in the browser history,
// so pressing Back cannot return to it and submit the same data twice (Server Actions push by default).

export type ScreenState = { errors?: Record<string, string[] | undefined> } | undefined;

const yesNo = z.enum(["yes", "no"], { error: "กรุณาเลือก ใช่ / ไม่ใช่" }).transform((v) => v === "yes");

// These ranges only catch typing mistakes (e.g. eGFR -5, weight 0) — they are NOT clinical criteria.
const ScreenSchema = z.object({
  weightKg: z.coerce.number({ error: "กรอกน้ำหนัก" }).gt(0, { error: "น้ำหนักต้องมากกว่า 0" }).max(300, { error: "ตรวจสอบน้ำหนักอีกครั้ง" }),
  heightCm: z.coerce.number({ error: "กรอกส่วนสูง" }).min(50, { error: "ตรวจสอบส่วนสูงอีกครั้ง" }).max(250, { error: "ตรวจสอบส่วนสูงอีกครั้ง" }),
  egfr: z.coerce.number({ error: "กรอก eGFR" }).min(0, { error: "eGFR ต้องไม่ติดลบ" }).max(200, { error: "ตรวจสอบค่า eGFR อีกครั้ง" }),
  doseMgDay: z.coerce.number({ error: "กรอกขนาดยา" }).int({ error: "กรอกเป็นจำนวนเต็ม" }).gt(0, { error: "ขนาดยาต้องมากกว่า 0" }).max(5000, { error: "ตรวจสอบขนาดยาอีกครั้ง" }),
  drinksAlcohol: yesNo, // checklist 9.1
  bingeDrinking: yesNo.optional(), // 9.2.1, only asked when 9.1 = ดื่ม
  regularHeavyDrinking: yesNo.optional(), // 9.2.2
  vomiting: yesNo,
  lowIntake: yesNo,
  nsaid: yesNo,
  herbal: yesNo,
});

export async function createScreening(patientId: number, _prev: ScreenState, formData: FormData): Promise<ScreenState> {
  const user = await requireFacilityStaff();

  const patient = await db.patient.findFirst({ where: { id: patientId, facility: user.facility } });
  if (!patient) return { errors: { form: ["ไม่พบผู้ป่วย"] } };

  // An empty input arrives as "" — turn it into undefined so the "required" message shows.
  const raw = Object.fromEntries([...formData.entries()].map(([k, v]) => [k, v === "" ? undefined : v]));
  const parsed = ScreenSchema.safeParse(raw);
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  const d = parsed.data;
  if (d.drinksAlcohol && (d.bingeDrinking === undefined || d.regularHeavyDrinking === undefined)) {
    return { errors: { alcohol: ["กรุณาตอบว่าดื่มหนักในครั้งเดียวไหม และดื่มหนักต่อเนื่องไหม"] } };
  }
  const input = {
    ...d,
    bingeDrinking: d.drinksAlcohol && !!d.bingeDrinking,
    regularHeavyDrinking: d.drinksAlcohol && !!d.regularHeavyDrinking,
  };
  const r = evaluate(input);

  const screening = await db.screening.create({
    data: {
      patientId,
      screenerId: user.id,
      ...input,
      alcohol: !input.drinksAlcohol ? "none" : r.heavyAlcohol ? "heavy" : "light",
      ruleVersion: r.ruleVersion,
      bmi: r.bmi,
      maxDoseMgDay: r.maxDoseMgDay,
      doseCheck: r.doseCheck,
      scoreEgfr: r.scoreEgfr,
      scoreBmi: r.scoreBmi,
      scoreAlcohol: r.scoreAlcohol,
      riskScore: r.riskScore,
      isAlert: r.isAlert,
      // intent.md: the alert fires the moment the result exists — it does not wait for Confirm.
      alertRaisedAt: r.isAlert ? new Date() : null,
    },
  });

  await audit({ user, action: "screening.create", entity: "Screening", entityId: screening.id, detail: `patientId=${patientId}` });
  if (r.isAlert) {
    await audit({ user, action: "alert.raised", entity: "Screening", entityId: screening.id });
  }

  redirect(`/screenings/${screening.id}`, RedirectType.replace);
}
