"use server";
// Save the screening numbers as a new criteria version (/admin/criteria). The page checks the same
// rules first and jumps to the wrong box; this is the server's own check, and on a problem it sends
// the errors back per field (the form keeps what was typed) instead of reloading the page.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { asActor } from "@/lib/actor";
import { audit } from "@/lib/audit";
import { currentCriteria } from "@/lib/criteria";
import { db } from "@/lib/db";
import { DEFAULT_PARAMS, paramFieldProblems, type RuleParams } from "@/lib/rules";
import { requireAdmin } from "@/lib/session";

const KEYS = Object.keys(DEFAULT_PARAMS) as (keyof RuleParams)[];
export type CriteriaState = { errors?: Record<string, string>; form?: string } | undefined;

const toNum = (v: FormDataEntryValue | null) => (v === null || String(v).trim() === "" ? NaN : Number(v));

export async function saveCriteria(_prev: CriteriaState, fd: FormData): Promise<CriteriaState> {
  const admin = await requireAdmin();
  const params = Object.fromEntries(KEYS.map((k) => [k, toNum(fd.get(k))])) as RuleParams;
  const approvedBy = String(fd.get("approvedBy") ?? "").trim();
  const reason = String(fd.get("reason") ?? "").trim();
  const errors: Record<string, string> = { ...paramFieldProblems(params) };
  if (!approvedBy) errors.approvedBy = "กรุณากรอกชื่อแพทย์หรือเภสัชกรผู้อนุมัติ";
  if (!reason) errors.reason = "กรุณากรอกเหตุผลหรือเอกสารอ้างอิง";
  if (Object.keys(errors).length) return { errors, form: "มีช่องที่ต้องแก้ไข" };

  const cur = await currentCriteria();
  if (KEYS.every((k) => params[k] === cur.params[k])) return { form: "ค่าทุกช่องเหมือนเกณฑ์ที่ใช้อยู่ ไม่มีอะไรต้องบันทึก" };

  const count = await db.ruleSet.count();
  const version = `v${count + 2}-${new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" })}`;
  const row = await asActor(admin.id, (tx) =>
    tx.ruleSet.create({ data: { version, params, approvedBy: approvedBy.slice(0, 120), reason: reason.slice(0, 500), createdById: admin.id } }),
  );
  await audit({ user: admin, action: "admin.criteria.update", entity: "RuleSet", entityId: row.id, detail: `ruleVersion=${version}` });
  revalidatePath("/admin/criteria");
  redirect("/admin/criteria?ok=1");
}
