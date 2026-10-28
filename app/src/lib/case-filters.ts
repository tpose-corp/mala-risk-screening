// Filters for the hospital's long case lists ("รับเรื่องแล้ว" tab, "ข้อมูลทุกเคส", CSV export).
// They live in the URL (?q=&fac=&period=&result=&page=), so reload, paging and shared links keep
// them, and the CSV download can reuse exactly what is on screen.
import type { Prisma } from "@/generated/prisma/client";
import { PERIODS, periodStart } from "./paging";

export type Result = "all" | "alert" | "noalert";
export type CaseFilters = { q: string; fac: string; period: string; result: Result };

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

export function readFilters(sp: Params): CaseFilters {
  const period = one(sp.period);
  const result = one(sp.result);
  return {
    q: one(sp.q).trim(),
    fac: one(sp.fac),
    period: PERIODS.some((p) => p.id === period) ? period : "all",
    result: result === "alert" || result === "noalert" ? result : "all",
  };
}

export const hasFilters = (f: CaseFilters) => !!(f.q || f.fac || f.period !== "all" || f.result !== "all");

// Prisma WHERE for one list. `dateField` is the time the period filter applies to.
export function whereFor(f: CaseFilters, dateField: "createdAt" | "acknowledgedAt", base: Prisma.ScreeningWhereInput = {}): Prisma.ScreeningWhereInput {
  const since = periodStart(f.period);
  return {
    ...base,
    // "gte" alone: it already leaves out empty dates, and "not: null" is rejected on createdAt
    // (a required column). Overrides any base condition on the same field, which is fine here.
    ...(since ? { [dateField]: { gte: since } } : {}),
    ...(f.result === "alert" ? { isAlert: true } : f.result === "noalert" ? { isAlert: false } : {}),
    patient: {
      ...(f.fac ? { facility: f.fac } : {}),
      ...(f.q ? { OR: [{ name: { contains: f.q } }, { hn: { contains: f.q } }] } : {}),
    },
  };
}

// Query string for links (paging, CSV). Only non-default values are written.
export function queryFor(f: CaseFilters, extra: Record<string, string | number> = {}) {
  const u = new URLSearchParams();
  if (f.q) u.set("q", f.q);
  if (f.fac) u.set("fac", f.fac);
  if (f.period !== "all") u.set("period", f.period);
  if (f.result !== "all") u.set("result", f.result);
  for (const [k, v] of Object.entries(extra)) u.set(k, String(v));
  const s = u.toString();
  return s ? `?${s}` : "";
}
