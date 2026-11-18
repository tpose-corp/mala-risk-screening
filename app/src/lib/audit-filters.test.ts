// Audit log filters (CCA §26: administrators can retrieve the logs). Run with: npm test
import { describe, expect, it } from "vitest";
import { auditQuery, auditWhere, hasAuditFilters, readAuditFilters } from "./audit-filters";

describe("readAuditFilters", () => {
  it("defaults", () => {
    expect(readAuditFilters({})).toEqual({ q: "", cat: "", from: "", to: "", warn: false });
  });
  it("ignores junk", () => {
    expect(readAuditFilters({ cat: "x", from: "2026-13-45", to: "yesterday", warn: "yes" }))
      .toEqual({ q: "", cat: "", from: "", to: "", warn: false });
  });
  it("reads valid values", () => {
    expect(readAuditFilters({ q: "somsri", cat: "db", from: "2026-09-01", to: "2026-09-30", warn: "1" }))
      .toEqual({ q: "somsri", cat: "db", from: "2026-09-01", to: "2026-09-30", warn: true });
  });
});

describe("auditWhere", () => {
  it("no filters → everything", () => expect(auditWhere(readAuditFilters({}))).toEqual({}));
  it("date range is whole days in Bangkok time, end day included", () => {
    const w = auditWhere(readAuditFilters({ from: "2026-09-01", to: "2026-09-30" })) as { AND: { at: { gte?: Date; lt?: Date } }[] };
    expect(w.AND[0].at.gte?.toISOString()).toBe("2026-08-31T17:00:00.000Z");
    expect(w.AND[1].at.lt?.toISOString()).toBe("2026-09-30T17:00:00.000Z");
  });
});

describe("search box", () => {
  const users = [{ id: 7, username: "somsri", displayName: "สมศรี ใจดี", role: "pcu", facility: "รพ.สต.บ้านดู่" }];
  type Or = { OR: Record<string, unknown>[] };
  const or = (q: string) => ((auditWhere(readAuditFilters({ q }), users) as { AND: Or[] }).AND[0]).OR;
  it("a unit name finds its staff", () => expect(or("บ้านดู่")).toContainEqual({ userId: { in: [7] } }));
  it("a Thai action word finds the action codes", () =>
    expect(or("เข้าสู่ระบบ")).toContainEqual(expect.objectContaining({ action: { in: expect.arrayContaining(["login.success", "login.failed"]) } })));
  it("a case number finds the record", () => expect(or("#2591")).toContainEqual({ entityId: 2591 }));
  it("dates picked backwards are swapped", () =>
    expect(readAuditFilters({ from: "2026-10-05", to: "2026-10-01" })).toMatchObject({ from: "2026-10-01", to: "2026-10-05" }));
});

describe("auditQuery / hasAuditFilters", () => {
  it("round-trips", () => {
    const f = readAuditFilters({ q: "doctor", from: "2026-10-01", warn: "1" });
    expect(auditQuery(f, { page: 2 })).toBe("?q=doctor&from=2026-10-01&warn=1&page=2");
    expect(readAuditFilters(Object.fromEntries(new URLSearchParams(auditQuery(f))))).toEqual(f);
    expect(hasAuditFilters(f)).toBe(true);
    expect(auditQuery(readAuditFilters({}))).toBe("");
  });
});
