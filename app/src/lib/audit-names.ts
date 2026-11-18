// Looks up the names of the records a page of audit rows points at (accounts, units, criteria
// versions, manuals), so the log says "หน่วยบริการ รพ.สต.บ้านดู่" instead of "หน่วยบริการ #9".
// Only non-personal records: patients and screenings stay numbers (rule.md, PDPA).
import "server-only";
import { db } from "./db";
import type { TargetNames } from "./audit-text";

export async function auditTargetNames(rows: { entity: string | null; entityId: number | null }[]): Promise<TargetNames> {
  const ids = (entity: string) => [...new Set(rows.filter((r) => r.entity === entity && r.entityId !== null).map((r) => r.entityId!))];
  const [users, units, rules, manuals] = await Promise.all([
    ids("User").length ? db.user.findMany({ where: { id: { in: ids("User") } }, select: { id: true, username: true } }) : [],
    ids("Facility").length ? db.facility.findMany({ where: { id: { in: ids("Facility") } }, select: { id: true, name: true } }) : [],
    ids("RuleSet").length ? db.ruleSet.findMany({ where: { id: { in: ids("RuleSet") } }, select: { id: true, version: true } }) : [],
    ids("Manual").length ? db.manual.findMany({ where: { id: { in: ids("Manual") } }, select: { id: true, title: true } }) : [],
  ]);
  return Object.fromEntries([
    ...users.map((u) => [`User:${u.id}`, u.username]),
    ...units.map((f) => [`Facility:${f.id}`, f.name]),
    ...rules.map((r) => [`RuleSet:${r.id}`, r.version]),
    ...manuals.map((m) => [`Manual:${m.id}`, m.title]),
  ]);
}
