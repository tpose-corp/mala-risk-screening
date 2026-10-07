// Date-of-birth helpers used by the Add Patient form (PBI-04). Run with: npm test
import { describe, expect, it } from "vitest";
import { ageFromThaiDob, daysInMonth, dobProblem, hnProblem, isValidThaiDob, nameProblem, normalizeHn } from "./format";

const today = new Date(2026, 9, 7); // 7 ต.ค. 2569

describe("daysInMonth (พ.ศ.)", () => {
  it("ก.พ. in a leap year has 29 days (2567 = 2024)", () => expect(daysInMonth(2, 2567)).toBe(29));
  it("ก.พ. in a normal year has 28 days (2568 = 2025)", () => expect(daysInMonth(2, 2568)).toBe(28));
  it("เม.ย. has 30, ธ.ค. has 31", () => {
    expect(daysInMonth(4, 2500)).toBe(30);
    expect(daysInMonth(12, 2500)).toBe(31);
  });
});

describe("isValidThaiDob", () => {
  it("accepts a real past date", () => expect(isValidThaiDob("14/02/2501", today)).toBe(true));
  it("rejects 31 ก.พ.", () => expect(isValidThaiDob("31/02/2501", today)).toBe(false));
  it("rejects 29 ก.พ. in a non-leap year", () => expect(isValidThaiDob("29/02/2568", today)).toBe(false));
  it("rejects a future date", () => expect(isValidThaiDob("08/10/2569", today)).toBe(false));
  it("rejects empty / wrong format", () => {
    expect(isValidThaiDob("", today)).toBe(false);
    expect(isValidThaiDob("1/2/2501", today)).toBe(false);
  });
});

describe("dobProblem (message under the date boxes)", () => {
  it("valid past date → no problem", () => expect(dobProblem(14, 2, 2501, today)).toBeNull());
  it("month 13", () => expect(dobProblem(1, 13, 2501, today)).toBe("เดือนต้องเป็น 1–12"));
  it("31 ก.พ.", () => expect(dobProblem(31, 2, 2501, today)).toBe("ก.พ. 2501 มีแค่ 28 วัน"));
  it("future", () => expect(dobProblem(8, 10, 2569, today)).toBe("วันเกิดอยู่ในอนาคต"));
  it("year out of range", () => expect(dobProblem(1, 1, 2400, today)).toMatch(/^ปี พ\.ศ\. ต้องอยู่ระหว่าง/));
});

describe("ageFromThaiDob", () => {
  it("birthday already passed this year", () => expect(ageFromThaiDob("14/02/2501", today)).toBe(68));
  it("birthday not yet this year", () => expect(ageFromThaiDob("20/12/2501", today)).toBe(67));
  it("birthday is today", () => expect(ageFromThaiDob("07/10/2501", today)).toBe(68));
});

describe("nameProblem (Add Patient name)", () => {
  it("Thai name with title → ok", () => expect(nameProblem("นาง สมหญิง ใจดี")).toBeNull());
  it("title with dots → ok", () => expect(nameProblem("น.ส. มาลี ดีใจ")).toBeNull());
  it("English name → ok", () => expect(nameProblem("John Smith")).toBeNull());
  it("Thai digits are digits too", () => expect(nameProblem("สมชาย ๑๒")).toBe("ชื่อต้องไม่มีตัวเลข"));
  it("Arabic digits → error", () => expect(nameProblem("สมชาย 123")).toBe("ชื่อต้องไม่มีตัวเลข"));
  it("symbols → error", () => expect(nameProblem("สมชาย@#")).toBe("ชื่อใช้ได้เฉพาะตัวอักษรไทยหรืออังกฤษ"));
  it("only dots/spaces → error", () => expect(nameProblem(" . . ")).toBe("กรุณากรอกชื่อ–นามสกุล"));
});

describe("HN", () => {
  it("keeps digits and separators", () => expect(normalizeHn("67-014822")).toBe("67-014822"));
  it("turns Thai digits into 0–9", () => expect(normalizeHn("๖๗-๐๑๔๘๒๒")).toBe("67-014822"));
  it("drops Thai and English letters", () => expect(normalizeHn("กข67ab-01")).toBe("67-01"));
  it("valid HN → no problem; empty is allowed", () => {
    expect(hnProblem("67-014822")).toBeNull();
    expect(hnProblem("123/2569")).toBeNull();
    expect(hnProblem("")).toBeNull();
  });
  it("letters or a stray separator → problem", () => {
    expect(hnProblem("HN6701")).not.toBeNull();
    expect(hnProblem("67--01")).not.toBeNull();
    expect(hnProblem("-6701")).not.toBeNull();
  });
});
