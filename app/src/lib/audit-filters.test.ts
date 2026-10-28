// Audit log filters (CCA §26: administrators can retrieve the logs). Run with: npm test
import { describe, expect, it } from "vitest";
import { auditQuery, auditWhere, hasAuditFilters, readAuditFilters } from "./audit-filters";

describe("readAuditFilters", () => {
  it("defaults", () => {
    expect(readAuditFilters({})).toEqual({ who: "", cat: "", from: "", to: "", warn: false });
  });
  it("ignores junk", () => {
    expect(readAuditFilters({ cat: "x", from: "2026-13-45", to: "yesterday", warn: "yes" }))
      .toEqual({ who: "", cat: "", from: "", to: "", warn: false });
  });
  it("reads valid values", () => {
    expect(readAuditFilters({ who: "somsri", cat: "db", from: "2026-09-01", to: "2026-09-30", warn: "1" }))
      .toEqual({ who: "somsri", cat: "db", from: "2026-09-01", to: "2026-09-30", warn: true });
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

describe("auditQuery / hasAuditFilters", () => {
  it("round-trips", () => {
    const f = readAuditFilters({ who: "doctor", from: "2026-10-01", warn: "1" });
    expect(auditQuery(f, { page: 2 })).toBe("?who=doctor&from=2026-10-01&warn=1&page=2");
    expect(readAuditFilters(Object.fromEntries(new URLSearchParams(auditQuery(f))))).toEqual(f);
    expect(hasAuditFilters(f)).toBe(true);
    expect(auditQuery(readAuditFilters({}))).toBe("");
  });
});
