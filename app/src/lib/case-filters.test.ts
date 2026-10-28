// URL filters for the hospital case lists. Run with: npm test
import { describe, expect, it } from "vitest";
import { hasFilters, queryFor, readFilters, whereFor } from "./case-filters";

describe("readFilters", () => {
  it("defaults", () => {
    expect(readFilters({})).toEqual({ q: "", fac: "", period: "all", result: "all" });
  });
  it("reads valid values and trims the search", () => {
    expect(readFilters({ q: "  สมชาย ", fac: "รพ.สต.นางแล", period: "30d", result: "alert" }))
      .toEqual({ q: "สมชาย", fac: "รพ.สต.นางแล", period: "30d", result: "alert" });
  });
  it("ignores junk values", () => {
    expect(readFilters({ period: "1y", result: "maybe", q: ["a", "b"] })).toEqual({ q: "", fac: "", period: "all", result: "all" });
  });
});

describe("whereFor", () => {
  it("no filters → only the base condition and an empty patient filter", () => {
    expect(whereFor(readFilters({}), "createdAt", { isAlert: true })).toEqual({ isAlert: true, patient: {} });
  });
  it("result + facility + search", () => {
    const w = whereFor(readFilters({ result: "noalert", fac: "รพ.สต.ดอยลาน", q: "70-1" }), "createdAt");
    expect(w).toMatchObject({ isAlert: false, patient: { facility: "รพ.สต.ดอยลาน", OR: [{ name: { contains: "70-1" } }, { hn: { contains: "70-1" } }] } });
  });
  it("period applies to the chosen date field", () => {
    const w = whereFor(readFilters({ period: "7d" }), "acknowledgedAt") as Record<string, Record<string, unknown>>;
    expect(w.acknowledgedAt.gte).toBeInstanceOf(Date);
    expect(w.createdAt).toBeUndefined();
  });
  it("period on createdAt has no 'not: null' (Prisma rejects it on a required column)", () => {
    const w = whereFor(readFilters({ period: "30d" }), "createdAt") as Record<string, Record<string, unknown>>;
    expect(Object.keys(w.createdAt)).toEqual(["gte"]);
  });
});

describe("queryFor / hasFilters", () => {
  it("writes only non-default values, plus extras", () => {
    expect(queryFor(readFilters({ fac: "รพ.สต.นางแล", period: "30d" }), { page: 2 })).toBe(
      "?fac=%E0%B8%A3%E0%B8%9E.%E0%B8%AA%E0%B8%95.%E0%B8%99%E0%B8%B2%E0%B8%87%E0%B9%81%E0%B8%A5&period=30d&page=2",
    );
    expect(queryFor(readFilters({}))).toBe("");
  });
  it("hasFilters", () => {
    expect(hasFilters(readFilters({}))).toBe(false);
    expect(hasFilters(readFilters({ result: "alert" }))).toBe(true);
  });
});
