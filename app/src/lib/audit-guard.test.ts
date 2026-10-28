// CCA §26 (rule.md): the audit log must never be edited or deleted. The database blocks it
// (migration auditlog_append_only); this test also fails if app code ever tries.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return n === "generated" ? [] : files(p);
    return /\.(ts|tsx)$/.test(n) && !n.endsWith(".test.ts") ? [p] : [];
  });
}

describe("audit log is append-only in the code too", () => {
  it("no update/delete/upsert on auditLog anywhere in src", () => {
    const bad = files(join(__dirname, "..")).filter((f) =>
      /auditLog\.(update|updateMany|delete|deleteMany|upsert)\b/.test(readFileSync(f, "utf8")));
    expect(bad).toEqual([]);
  });
  it("the protecting triggers are in a migration and never dropped", () => {
    const m = join(__dirname, "..", "..", "prisma", "migrations");
    const sql = readdirSync(m)
      .filter((d) => statSync(join(m, d)).isDirectory())
      .map((d) => readFileSync(join(m, d, "migration.sql"), "utf8"))
      .join("\n");
    expect(sql).toContain('CREATE TRIGGER "AuditLog_no_update"');
    expect(sql).toContain('CREATE TRIGGER "AuditLog_no_delete"');
    expect(sql).not.toMatch(/DROP TRIGGER\s+(IF EXISTS\s+)?"?AuditLog_no_/);
  });
});
