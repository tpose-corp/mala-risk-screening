// Filters for the audit log page and its CSV download (rule.md, CCA §26: administrators must be
// able to retrieve the logs for compliance). They live in the URL, so a filtered view can be
// reloaded, paged, shared, and downloaded exactly as shown.
//   ?q=บ้านดู่  &cat=auth  &from=2026-09-01&to=2026-09-30  &warn=1
// q is one search box: it matches the person (name, username, role, unit), what was done,
// the case or record number, the details, and the device.
import type { Prisma } from "@/generated/prisma/client";
import { ROLE_LABEL } from "./format";
import { CATEGORY_LABEL, WARN_ACTIONS, actionsIn, actionsMatching } from "./audit-text";

export type AuditFilters = { q: string; cat: string; from: string; to: string; warn: boolean };
type SearchUser = { id: number; username: string; displayName: string; role: string; facility: string | null };

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v.trim() : "");
const isDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

export function readAuditFilters(sp: Params): AuditFilters {
  const cat = one(sp.cat);
  let from = isDay(one(sp.from)) ? one(sp.from) : "";
  let to = isDay(one(sp.to)) ? one(sp.to) : "";
  if (from && to && from > to) [from, to] = [to, from]; // picked backwards: swap
  return {
    q: one(sp.q).slice(0, 100),
    cat: cat in CATEGORY_LABEL ? cat : "",
    from,
    to,
    warn: one(sp.warn) === "1",
  };
}

export const hasAuditFilters = (f: AuditFilters) => !!(f.q || f.cat || f.from || f.to || f.warn);

// Dates are whole days in Bangkok time; "to" includes the whole of that day.
const bkk = (day: string) => new Date(`${day}T00:00:00+07:00`);

function searchWhere(q: string, users: SearchUser[]): Prisma.AuditLogWhereInput {
  const t = q.toLowerCase();
  const hit = (s: string | null | undefined) => !!s && s.toLowerCase().includes(t);
  const people = users.filter((u) => hit(u.displayName) || hit(u.username) || hit(u.facility) || hit(ROLE_LABEL[u.role]));
  const contains = { contains: q, mode: "insensitive" as const };
  const or: Prisma.AuditLogWhereInput[] = [{ username: contains }, { detail: contains }, { device: contains }];
  if (people.length) {
    or.push({ userId: { in: people.map((u) => u.id) } }, { username: { in: people.map((u) => u.username) } });
  }
  const codes = actionsMatching(q);
  if (codes.length) or.push({ action: { in: codes } });
  const n = q.match(/^#?(\d{1,9})$/);
  if (n) or.push({ entityId: Number(n[1]) });
  return { OR: or };
}

export function auditWhere(f: AuditFilters, users: SearchUser[] = []): Prisma.AuditLogWhereInput {
  const and: Prisma.AuditLogWhereInput[] = [];
  if (f.q) and.push(searchWhere(f.q, users));
  if (f.cat) and.push({ action: { in: actionsIn(f.cat) } });
  if (f.warn) and.push({ action: { in: WARN_ACTIONS } });
  if (f.from) and.push({ at: { gte: bkk(f.from) } });
  if (f.to) and.push({ at: { lt: new Date(bkk(f.to).getTime() + 86_400_000) } });
  return and.length ? { AND: and } : {};
}

export function auditQuery(f: AuditFilters, extra: Record<string, string | number> = {}) {
  const u = new URLSearchParams();
  if (f.q) u.set("q", f.q);
  if (f.cat) u.set("cat", f.cat);
  if (f.from) u.set("from", f.from);
  if (f.to) u.set("to", f.to);
  if (f.warn) u.set("warn", "1");
  for (const [k, v] of Object.entries(extra)) u.set(k, String(v));
  const s = u.toString();
  return s ? `?${s}` : "";
}
