// Filters for the audit log page and its CSV download (rule.md, CCA §26: administrators must be
// able to retrieve the logs for compliance). They live in the URL, so a filtered view can be
// reloaded, paged, shared, and downloaded exactly as shown.
//   ?who=somsri  &cat=auth  &from=2026-09-01&to=2026-09-30  &warn=1
import type { Prisma } from "@/generated/prisma/client";
import { CATEGORY_LABEL, WARN_ACTIONS, actionsIn } from "./audit-text";

export type AuditFilters = { who: string; cat: string; from: string; to: string; warn: boolean };

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v.trim() : "");
const isDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

export function readAuditFilters(sp: Params): AuditFilters {
  const cat = one(sp.cat);
  return {
    who: one(sp.who),
    cat: cat in CATEGORY_LABEL ? cat : "",
    from: isDay(one(sp.from)) ? one(sp.from) : "",
    to: isDay(one(sp.to)) ? one(sp.to) : "",
    warn: one(sp.warn) === "1",
  };
}

export const hasAuditFilters = (f: AuditFilters) => !!(f.who || f.cat || f.from || f.to || f.warn);

// Dates are whole days in Bangkok time; "to" includes the whole of that day.
const bkk = (day: string) => new Date(`${day}T00:00:00+07:00`);

export function auditWhere(f: AuditFilters): Prisma.AuditLogWhereInput {
  const and: Prisma.AuditLogWhereInput[] = [];
  if (f.who) and.push({ username: f.who });
  if (f.cat) and.push({ action: { in: actionsIn(f.cat) } });
  if (f.warn) and.push({ action: { in: WARN_ACTIONS } });
  if (f.from) and.push({ at: { gte: bkk(f.from) } });
  if (f.to) and.push({ at: { lt: new Date(bkk(f.to).getTime() + 86_400_000) } });
  return and.length ? { AND: and } : {};
}

export function auditQuery(f: AuditFilters, extra: Record<string, string | number> = {}) {
  const u = new URLSearchParams();
  if (f.who) u.set("who", f.who);
  if (f.cat) u.set("cat", f.cat);
  if (f.from) u.set("from", f.from);
  if (f.to) u.set("to", f.to);
  if (f.warn) u.set("warn", "1");
  for (const [k, v] of Object.entries(extra)) u.set(k, String(v));
  const s = u.toString();
  return s ? `?${s}` : "";
}
