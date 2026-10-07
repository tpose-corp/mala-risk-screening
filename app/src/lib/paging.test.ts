// Paging and date-period maths. Run with: npm test
import { describe, expect, it } from "vitest";
import { num, pageInfo, periodStart } from "./paging";

describe("pageInfo", () => {
  it("first page of 1,240", () => {
    expect(pageInfo(1240, "1")).toMatchObject({ page: 1, pages: 50, skip: 0, take: 25, from: 1, to: 25 });
  });
  it("second page", () => {
    expect(pageInfo(1240, "2")).toMatchObject({ page: 2, skip: 25, from: 26, to: 50 });
  });
  it("last page is partly filled", () => {
    expect(pageInfo(1240, "50")).toMatchObject({ page: 50, from: 1226, to: 1240 });
  });
  it("out-of-range or junk page numbers are clamped", () => {
    expect(pageInfo(1240, "999").page).toBe(50);
    expect(pageInfo(1240, "-3").page).toBe(1);
    expect(pageInfo(1240, "abc").page).toBe(1);
    expect(pageInfo(1240, undefined).page).toBe(1);
  });
  it("empty list", () => {
    expect(pageInfo(0, "1")).toMatchObject({ page: 1, pages: 1, from: 0, to: 0 });
  });
  it("10,000 cases still asks the database for just one page", () => {
    expect(pageInfo(10000, "400")).toMatchObject({ pages: 400, skip: 9975, take: 25 });
  });
});

describe("periodStart (Bangkok time)", () => {
  const now = new Date("2026-10-07T02:30:00Z"); // 09:30 in Bangkok
  it("today starts at 00:00 Bangkok", () => expect(periodStart("today", now)?.toISOString()).toBe("2026-10-06T17:00:00.000Z"));
  it("7 days back", () => expect(periodStart("7d", now)?.toISOString()).toBe("2026-09-29T17:00:00.000Z"));
  it("all → no limit", () => expect(periodStart("all", now)).toBeNull());
  it("unknown → all", () => expect(periodStart("xyz", now)).toBeNull());
});

describe("num", () => {
  it("adds thousands separators", () => expect(num(12345)).toBe("12,345"));
});
