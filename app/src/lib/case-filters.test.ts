// URL filters for the hospital case lists. Run with: npm test
import { describe, expect, it } from "vitest";
import { hasFilters, queryFor, readFilters, whereFor } from "./case-filters";

describe("readFilters", () => {
  it("defaults", () => {
    expect(readFilters({})).toEqual({ q: "", fac: "", period: "all", result: "all", from: "", to: "" });
  });
  it("reads valid values and trims the search", () => {
    expect(readFilters({ q: "  สมชาย ", fac: "รพ.สต.นางแล", period: "30d", result: "alert", from: "", to: "" }))
      .toEqual({ q: "สมชาย", fac: "รพ.สต.นางแล", period: "30d", result: "alert", from: "", to: "" });
  });
  it("ignores junk values", () => {
    expect(readFilters({ period: "1y", result: "maybe", q: ["a", "b"] })).toEqual({ q: "", fac: "", period: "all", result: "all", from: "", to: "" });
  });
});

describe("whereFor", () => {
  it("no filters → only the base condition and an empty patient filter", () => {
    expect(whereFor(readFilters({}), "createdAt", { isAlert: true })).toEqual({ isAlert: true, patient: {} });
  });
  it("result + facility + search", () => {
    const w = whereFor(readFilters({ result: "noalert", fac: "รพ.สต.ดอยลาน", q: "70-1" }), "createdAt");
    expect(w).toMatchObject({ isAlert: false, facility: "รพ.สต.ดอยลาน", patient: { OR: [{ name: { contains: "70-1", mode: "insensitive" } }, { hn: { contains: "70-1" } }] } });
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

describe("date range (from / to)", () => {
  it("reads a พ.ศ. range and filters the whole last day", () => {
    const f = readFilters({ from: "01/01/2568", to: "31/12/2568" });
    expect([f.from, f.to]).toEqual(["01/01/2568", "31/12/2568"]);
    const w = whereFor(f, "createdAt") as Record<string, { gte: Date; lt: Date }>;
    expect(w.createdAt.gte.toISOString()).toBe("2024-12-31T17:00:00.000Z"); // 1 Jan 2025 00:00 Bangkok
    expect(w.createdAt.lt.toISOString()).toBe("2025-12-31T17:00:00.000Z"); // up to 31 Dec, whole day
    expect(hasFilters(f)).toBe(true);
    expect(queryFor(f)).toBe("?from=01%2F01%2F2568&to=31%2F12%2F2568");
  });
  it("swaps a range picked backwards and ignores junk", () => {
    expect(readFilters({ from: "31/12/2568", to: "01/01/2568" }).from).toBe("01/01/2568");
    expect(readFilters({ from: "2568-01-01", to: "x" })).toMatchObject({ from: "", to: "" });
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
