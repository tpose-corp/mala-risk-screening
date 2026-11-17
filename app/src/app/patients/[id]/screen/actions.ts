"use server";
// PBI-05 + PBI-06 — save the screening form and run the rule engine ON THE SERVER.
// The browser only shows a BMI preview; the real result is always computed here, so nobody can
// tamper with the outcome from the browser.
//
// v2 (17 Nov 2026): the same form also EDITS a screening, but only until it is confirmed.
// After "ยืนยันและส่ง รพ." the รพ.สต. cannot change it any more; only the hospital admin can,
// with a reason (src/app/admin/patients/[id]/screenings).

import { RedirectType, redirect } from "next/navigation";
import { z } from "zod";
import { asActor } from "@/lib/actor";
import { audit } from "@/lib/audit";
import { currentCriteria } from "@/lib/criteria";
import { db } from "@/lib/db";
import { isValidThaiDob } from "@/lib/format";
import { evaluate } from "@/lib/rules";
import { requireFacilityStaff } from "@/lib/session";
import { getSettings } from "@/lib/settings";

export type ScreenState = { errors?: Record<string, string[] | undefined>; locked?: string } | undefined;

const yesNo = z.enum(["yes", "no"], { error: "กรุณาเลือก ใช่ / ไม่ใช่" }).transform((v) => v === "yes");
const note = z.string().trim().max(300, { error: "ยาวเกินไป (ไม่เกิน 300 ตัวอักษร)" }).optional();

// These ranges only catch typing mistakes (e.g. eGFR -5, weight 0). They are NOT clinical criteria.
const ScreenSchema = z.object({
  weightKg: z.coerce.number({ error: "กรอกน้ำหนัก" }).gt(0, { error: "น้ำหนักต้องมากกว่า 0" }).max(300, { error: "ตรวจสอบน้ำหนักอีกครั้ง" }),
  heightCm: z.coerce.number({ error: "กรอกส่วนสูง" }).min(50, { error: "ตรวจสอบส่วนสูงอีกครั้ง" }).max(250, { error: "ตรวจสอบส่วนสูงอีกครั้ง" }),
  egfr: z.coerce.number({ error: "กรอก eGFR" }).min(0, { error: "eGFR ต้องไม่ติดลบ" }).max(200, { error: "ตรวจสอบค่า eGFR อีกครั้ง" }),
  egfrDate: z.string().optional().refine((v) => !v || isValidThaiDob(v), { error: "วันที่ผล eGFR ไม่ถูกต้อง" }),
  doseMgDay: z.coerce.number({ error: "กรอกขนาดยา" }).int({ error: "กรอกเป็นจำนวนเต็ม" }).gt(0, { error: "ขนาดยาต้องมากกว่า 0" }).max(5000, { error: "ตรวจสอบขนาดยาอีกครั้ง" }),
  drinksAlcohol: yesNo, // checklist 9.1
  bingeDrinking: yesNo.optional(), // 9.2.1, only asked when 9.1 = ดื่ม
  regularHeavyDrinking: yesNo.optional(), // 9.2.2
  vomiting: yesNo,
  lowIntake: yesNo,
  nsaid: yesNo,
  nsaidNote: note,
  herbal: yesNo,
  herbalNote: note,
});

// screeningId = null → new screening; a number → edit that (unconfirmed) screening.
export async function saveScreening(patientId: number, screeningId: number | null, _prev: ScreenState, formData: FormData): Promise<ScreenState> {
  const user = await requireFacilityStaff();

  const patient = await db.patient.findFirst({ where: { id: patientId, facility: user.facility, active: true } });
  if (!patient) return { errors: { form: ["ไม่พบผู้ป่วย"] } };

  let existing = null;
  if (screeningId !== null) {
    existing = await db.screening.findFirst({ where: { id: screeningId, patientId, facility: user.facility } });
    if (!existing) return { errors: { form: ["ไม่พบผลประเมินนี้"] } };
    if (existing.confirmedAt) {
      await audit({ user, action: "screening.edit.locked", entity: "Screening", entityId: screeningId });
      return { locked: (await getSettings()).adminContact };
    }
  }

  // An empty input arrives as "". Turn it into undefined so the "required" message shows.
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
  // Score with the criteria in force now (an edit re-scores with today's version).
  const criteria = await currentCriteria();
  const r = evaluate(input, criteria.params, criteria.version);

  const data = {
    weightKg: input.weightKg,
    heightCm: input.heightCm,
    egfr: input.egfr,
    egfrDate: input.egfrDate || null,
    doseMgDay: input.doseMgDay,
    drinksAlcohol: input.drinksAlcohol,
    bingeDrinking: input.bingeDrinking,
    regularHeavyDrinking: input.regularHeavyDrinking,
    vomiting: input.vomiting,
    lowIntake: input.lowIntake,
    nsaid: input.nsaid,
    nsaidNote: input.nsaid ? input.nsaidNote || null : null,
    herbal: input.herbal,
    herbalNote: input.herbal ? input.herbalNote || null : null,
    alcohol: !input.drinksAlcohol ? "none" : r.heavyAlcohol ? "heavy" : "light",
    ruleVersion: r.ruleVersion,
    bmi: r.bmi,
    maxDoseMgDay: r.maxDoseMgDay,
    doseCheck: r.doseCheck,
    scoreEgfr: r.scoreEgfr,
    scoreBmi: r.scoreBmi,
    scoreAlcohol: r.scoreAlcohol,
    riskScore: r.riskScore,
    riskGroup: r.riskGroup,
    isAlert: r.isAlert,
    alertKind: r.alertKind,
  };

  if (existing) {
    // Only fields that really changed are listed in the log (names only, no values).
    const changed = (Object.keys(data) as (keyof typeof data)[]).filter((k) => String(existing[k] ?? "") !== String(data[k] ?? ""));
    const { count } = await asActor(user.id, (tx) =>
      tx.screening.updateMany({
        where: { id: existing.id, confirmedAt: null }, // someone may have confirmed it meanwhile
        data: {
          ...data,
          // intent.md: the alert fires the moment a result exists. Keep the first alert time.
          alertRaisedAt: r.isAlert ? existing.alertRaisedAt ?? new Date() : null,
          // a changed result needs the advice step again
          adviceGivenAt: changed.length ? null : existing.adviceGivenAt,
        },
      }),
    );
    if (count === 0) return { locked: (await getSettings()).adminContact };
    await audit({ user, action: "screening.update", entity: "Screening", entityId: existing.id, detail: `changed=${changed.join(",") || "none"}` });
    if (r.isAlert && !existing.isAlert) await audit({ user, action: "alert.raised", entity: "Screening", entityId: existing.id });
    redirect(`/screenings/${existing.id}`, RedirectType.replace);
  }

  const screening = await db.screening.create({
    data: {
      ...data,
      patientId,
      facility: user.facility,
      screenerId: user.id,
      alertRaisedAt: r.isAlert ? new Date() : null,
    },
  });

  await audit({ user, action: "screening.create", entity: "Screening", entityId: screening.id, detail: `patientId=${patientId}` });
  if (r.isAlert) {
    await audit({ user, action: "alert.raised", entity: "Screening", entityId: screening.id });
  }

  redirect(`/screenings/${screening.id}`, RedirectType.replace);
}
