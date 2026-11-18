// Filters for the hospital's long case lists ("รับเรื่องแล้ว" tab, "ข้อมูลทุกเคส", CSV export).
// They live in the URL (?q=&fac=&period=&result=&page=), so reload, paging and shared links keep
// them, and the CSV download can reuse exactly what is on screen.
import type { Prisma } from "@/generated/prisma/client";
import { readRange } from "./date-range";
import { PERIODS, periodStart } from "./paging";

export type Result = "all" | "alert" | "noalert";
// from / to = "dd/mm/yyyy" (พ.ศ.), the date picker; when set they win over the older `period`
export type CaseFilters = { q: string; fac: string; period: string; result: Result; from: string; to: string };

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

export function readFilters(sp: Params): CaseFilters {
  const period = one(sp.period);
  const result = one(sp.result);
  const range = readRange(sp);
  return {
    from: range.from,
    to: range.to,
    q: one(sp.q).trim(),
    fac: one(sp.fac),
    period: PERIODS.some((p) => p.id === period) ? period : "all",
    result: result === "alert" || result === "noalert" ? result : "all",
  };
}

export const hasFilters = (f: CaseFilters) => !!(f.q || f.fac || f.period !== "all" || f.result !== "all" || f.from || f.to);

// Prisma WHERE for one list. `dateField` is the time the period filter applies to.
export function whereFor(f: CaseFilters, dateField: "createdAt" | "acknowledgedAt", base: Prisma.ScreeningWhereInput = {}): Prisma.ScreeningWhereInput {
  const since = periodStart(f.period);
  const range = readRange({ from: f.from, to: f.to }).where;
  return {
    ...base,
    // "gte" alone: it already leaves out empty dates, and "not: null" is rejected on createdAt
    // (a required column). Overrides any base condition on the same field, which is fine here.
    ...(range ? { [dateField]: range } : since ? { [dateField]: { gte: since } } : {}),
    ...(f.result === "alert" ? { isAlert: true } : f.result === "noalert" ? { isAlert: false } : {}),
    // the unit where the screening was done
    ...(f.fac ? { facility: f.fac } : {}),
    patient: {
      ...(f.q ? { OR: [{ name: { contains: f.q, mode: "insensitive" } }, { hn: { contains: f.q } }] } : {}),
    },
  };
}

// Query string for links (paging, CSV). Only non-default values are written.
export function queryFor(f: CaseFilters, extra: Record<string, string | number> = {}) {
  const u = new URLSearchParams();
  if (f.q) u.set("q", f.q);
  if (f.fac) u.set("fac", f.fac);
  if (f.period !== "all") u.set("period", f.period);
  if (f.from) u.set("from", f.from);
  if (f.to) u.set("to", f.to);
  if (f.result !== "all") u.set("result", f.result);
  for (const [k, v] of Object.entries(extra)) u.set(k, String(v));
  const s = u.toString();
  return s ? `?${s}` : "";
}
