"use server";
// Hospital admin actions on a patient (17 Nov 2026):
//   verify     check the identity of a patient a รพ.สต. added, fill in the HN
//   update     change any field, with a reason; old and new values go to the Amendment history
//   deactivate "remove" a patient without deleting anything
//   amend a confirmed screening (the only way to change one after the รพ.สต. confirmed it)
// The audit log gets only the field NAMES; the values live in Amendment, which only the admin reads.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { asActor } from "@/lib/actor";
import { audit } from "@/lib/audit";
import { criteriaFor } from "@/lib/criteria";
import { db } from "@/lib/db";
import { formatPhone, hnProblem, isValidThaiDob, nameProblem, normalizeCardId, phoneDigits, phoneProblem } from "@/lib/format";
import { evaluate } from "@/lib/rules";
import { safeBack } from "@/lib/back-link";
import { requireAdmin } from "@/lib/session";

// Keep the list the admin came from (?back=) through every save, so "กลับ" still works after it.
const back = (id: number, q: string, fd: FormData) => {
  const b = safeBack(fd.get("back"), "/admin/patients");
  redirect(`/admin/patients/${id}?${q}${b ? `&back=${encodeURIComponent(b)}` : ""}`);
};
const reasonOf = (fd: FormData) => String(fd.get("reason") ?? "").trim().slice(0, 300);

export async function verifyPatient(id: number, fd: FormData) {
  const admin = await requireAdmin();
  const hn = String(fd.get("hn") ?? "").trim();
  // "v…" codes: the page shows these at the identity-check box, not in the edit form
  if (!hn || hnProblem(hn)) back(id, "err=vhn", fd);
  const clash = await db.patient.findFirst({ where: { hn, NOT: { id } } });
  if (clash) back(id, "err=vhndup", fd);
  const p = await db.patient.findUnique({ where: { id } });
  if (!p) return;
  await asActor(admin.id, async (tx) => {
    if (p.hn !== hn) {
      await tx.amendment.create({ data: { byId: admin.id, entity: "Patient", entityId: id, patientId: id, field: "hn", oldValue: p.hn, newValue: hn, reason: "ยืนยันตัวตนผู้ป่วย" } });
    }
    await tx.patient.update({ where: { id }, data: { hn, status: "verified", verifiedAt: new Date(), verifiedById: admin.id } });
  });
  await audit({ user: admin, action: "admin.patient.verify", entity: "Patient", entityId: id });
  revalidatePath("/admin/patients");
  back(id, "ok=verified", fd);
}

const FIELDS = ["name", "dob", "sex", "phone", "cardId", "hn", "facility"] as const;

export async function updatePatient(id: number, fd: FormData) {
  const admin = await requireAdmin();
  const reason = reasonOf(fd);
  if (!reason) back(id, "err=reason", fd);
  const p = await db.patient.findUnique({ where: { id } });
  if (!p) return;

  const next = {
    name: String(fd.get("name") ?? "").trim(),
    dob: String(fd.get("dob") ?? "").trim(),
    sex: String(fd.get("sex") ?? ""),
    phone: String(fd.get("phone") ?? "").trim() || null,
    cardId: normalizeCardId(String(fd.get("cardId") ?? "")),
    hn: String(fd.get("hn") ?? "").trim() || null,
    facility: String(fd.get("facility") ?? "") || null,
  };
  if (!next.name || nameProblem(next.name)) back(id, "err=name", fd);
  if (!isValidThaiDob(next.dob)) back(id, "err=dob", fd);
  if (next.sex !== "หญิง" && next.sex !== "ชาย") back(id, "err=sex", fd);
  if (!/^\d{13}$/.test(next.cardId)) back(id, "err=card", fd);
  if (next.hn && hnProblem(next.hn)) back(id, "err=hn", fd);
  // phone: a real Thai number, stored with dashes; the same digits typed differently is no change
  if (next.phone && phoneDigits(next.phone) === phoneDigits(p.phone ?? "")) next.phone = p.phone;
  else if (next.phone) {
    if (phoneProblem(next.phone)) back(id, "err=phone", fd);
    next.phone = formatPhone(next.phone);
  }
  if (await db.patient.findFirst({ where: { cardId: next.cardId, NOT: { id } } })) back(id, "err=carddup", fd);
  if (next.hn && (await db.patient.findFirst({ where: { hn: next.hn, NOT: { id } } }))) back(id, "err=hndup", fd);

  const changed = FIELDS.filter((f) => (p[f] ?? null) !== (next[f] ?? null));
  if (changed.length === 0) back(id, "ok=nochange", fd);
  await asActor(admin.id, async (tx) => {
    await tx.amendment.createMany({
      data: changed.map((f) => ({ byId: admin.id, entity: "Patient", entityId: id, patientId: id, field: f, oldValue: p[f] ?? null, newValue: next[f] ?? null, reason })),
    });
    await tx.patient.update({ where: { id }, data: next });
  });
  await audit({ user: admin, action: "admin.patient.update", entity: "Patient", entityId: id, detail: `changed=${changed.join(",")}` });
  revalidatePath(`/admin/patients/${id}`);
  back(id, "ok=saved", fd);
}

export async function setPatientActive(id: number, active: boolean, fd: FormData) {
  const admin = await requireAdmin();
  const reason = reasonOf(fd);
  if (!reason) back(id, "err=reason", fd);
  await asActor(admin.id, async (tx) => {
    await tx.amendment.create({ data: { byId: admin.id, entity: "Patient", entityId: id, patientId: id, field: "active", oldValue: String(!active), newValue: String(active), reason } });
    await tx.patient.update({ where: { id }, data: { active } });
  });
  await audit({ user: admin, action: active ? "admin.patient.activate" : "admin.patient.deactivate", entity: "Patient", entityId: id });
  back(id, "ok=saved", fd);
}

// Fix a screening's measured inputs after it was confirmed. The result is recomputed with the
// SAME criteria version it was first scored with, so only the corrected input changes the result.
const NUM = ["weightKg", "heightCm", "egfr", "doseMgDay"] as const;
const BOOL = ["drinksAlcohol", "bingeDrinking", "regularHeavyDrinking", "vomiting", "lowIntake", "nsaid", "herbal"] as const;

export async function amendScreening(patientId: number, screeningId: number, fd: FormData) {
  const admin = await requireAdmin();
  const reason = reasonOf(fd);
  if (!reason) back(patientId, `err=reason&s=${screeningId}`, fd);
  const s = await db.screening.findFirst({ where: { id: screeningId, patientId } });
  if (!s) return;

  const nums = Object.fromEntries(NUM.map((k) => [k, Number(fd.get(k))])) as Record<(typeof NUM)[number], number>;
  if (!(nums.weightKg > 0 && nums.weightKg <= 300 && nums.heightCm >= 50 && nums.heightCm <= 250 && nums.egfr >= 0 && nums.egfr <= 200 && nums.doseMgDay > 0 && nums.doseMgDay <= 5000)) {
    back(patientId, `err=values&s=${screeningId}`, fd);
  }
  const bools = Object.fromEntries(BOOL.map((k) => [k, fd.get(k) === "yes"])) as Record<(typeof BOOL)[number], boolean>;
  if (!bools.drinksAlcohol) { bools.bingeDrinking = false; bools.regularHeavyDrinking = false; }
  const notes = {
    nsaidNote: bools.nsaid ? String(fd.get("nsaidNote") ?? "").trim().slice(0, 300) || null : null,
    herbalNote: bools.herbal ? String(fd.get("herbalNote") ?? "").trim().slice(0, 300) || null : null,
  };
  const input = { ...nums, doseMgDay: Math.round(nums.doseMgDay), ...bools };
  const r = evaluate(input, await criteriaFor(s.ruleVersion), s.ruleVersion);
  const data = {
    ...input, ...notes,
    alcohol: !input.drinksAlcohol ? "none" : r.heavyAlcohol ? "heavy" : "light",
    bmi: r.bmi, maxDoseMgDay: r.maxDoseMgDay, doseCheck: r.doseCheck, scoreEgfr: r.scoreEgfr, scoreBmi: r.scoreBmi,
    scoreAlcohol: r.scoreAlcohol, riskScore: r.riskScore, riskGroup: r.riskGroup, isAlert: r.isAlert, alertKind: r.alertKind,
    alertRaisedAt: r.isAlert ? s.alertRaisedAt ?? new Date() : s.alertRaisedAt,
  };
  // Only inputs are recorded as amendments; the recomputed result follows from them.
  const tracked = [...NUM, ...BOOL, "nsaidNote", "herbalNote", "isAlert", "alertKind", "riskScore"] as const;
  const changed = tracked.filter((k) => String(s[k] ?? "") !== String(data[k] ?? ""));
  if (changed.length === 0) back(patientId, "ok=nochange", fd);
  await asActor(admin.id, async (tx) => {
    await tx.amendment.createMany({
      data: changed.map((k) => ({ byId: admin.id, entity: "Screening", entityId: s.id, patientId, field: k, oldValue: String(s[k] ?? ""), newValue: String(data[k] ?? ""), reason })),
    });
    await tx.screening.update({ where: { id: s.id }, data });
  });
  await audit({ user: admin, action: "admin.screening.update", entity: "Screening", entityId: s.id, detail: `changed=${changed.join(",")}` });
  back(patientId, "ok=saved", fd);
}
