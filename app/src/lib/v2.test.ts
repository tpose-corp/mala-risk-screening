// v2 rules (hospital UAT, 17 Nov 2026): editable criteria, two alert kinds, national ID, passwords.
// Run with: npm test
import { describe, expect, it } from "vitest";
import { cardIdChecksumOk, formatCardId, maskCardId, normalizeCardId } from "./format";
import { passwordProblem, temporaryPassword } from "./password";
import { DEFAULT_PARAMS, evaluate, paramProblems, type ScreeningInput } from "./rules";

const clean: ScreeningInput = {
  weightKg: 70, heightCm: 165, egfr: 80, doseMgDay: 1000,
  drinksAlcohol: false, bingeDrinking: false, regularHeavyDrinking: false, vomiting: false, lowIntake: false, nsaid: false, herbal: false,
};

describe("alert kind: ใช้ยาเกินขนาด comes before เสี่ยงทั่วไป", () => {
  it("dose problem → dose, even when the risk score is also high", () => {
    const r = evaluate({ ...clean, egfr: 35, doseMgDay: 2000, weightKg: 50 });
    expect(r.riskGroup).toBe(true);
    expect(r.alertKind).toBe("dose");
  });
  it("contraindicated → dose", () => expect(evaluate({ ...clean, egfr: 20, doseMgDay: 500 }).alertKind).toBe("dose"));
  it("risk score only → risk", () => expect(evaluate({ ...clean, weightKg: 50 }).alertKind).toBe("risk"));
  it("nothing → no alert", () => expect(evaluate(clean).alertKind).toBeNull());
});

describe("criteria the hospital can change", () => {
  it("the defaults give the same results as before", () => {
    expect(evaluate(clean, DEFAULT_PARAMS)).toEqual(evaluate(clean));
  });
  it("a stricter BMI cut-off changes the score", () => {
    const p = { ...DEFAULT_PARAMS, bmiRiskBelow: 26 };
    expect(evaluate(clean).scoreBmi).toBe(0); // BMI 25.7
    expect(evaluate(clean, p).scoreBmi).toBe(2);
  });
  it("a new dose band moves the max dose", () => {
    const p = { ...DEFAULT_PARAMS, egfrReducedBelow: 60, maxDoseReduced: 1500 };
    expect(evaluate({ ...clean, egfr: 55, doseMgDay: 2000 }, p)).toMatchObject({ maxDoseMgDay: 1500, doseCheck: "exceeds" });
  });
  it("the version is stored with the result", () => expect(evaluate(clean, DEFAULT_PARAMS, "v2-2026-11-17").ruleVersion).toBe("v2-2026-11-17"));
  it("impossible numbers are refused", () => {
    expect(paramProblems(DEFAULT_PARAMS)).toEqual([]);
    expect(paramProblems({ ...DEFAULT_PARAMS, egfrContraindicatedBelow: 50 }).length).toBeGreaterThan(0);
    expect(paramProblems({ ...DEFAULT_PARAMS, maxDoseReduced: 3000 }).length).toBeGreaterThan(0);
    expect(paramProblems({ ...DEFAULT_PARAMS, bmiRiskScore: -1 }).length).toBeGreaterThan(0);
    expect(paramProblems({ ...DEFAULT_PARAMS, riskGroupMinScore: 0 }).length).toBeGreaterThan(0);
  });
});

describe("national ID", () => {
  it("accepts Thai digits and dashes", () => expect(normalizeCardId("๑-๒๓๔๕-67890-12-3")).toBe("1234567890123"));
  it("check digit: a valid made-up ID passes, a changed last digit fails", () => {
    const body = "110170020315";
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += Number(body[i]) * (13 - i);
    const d = (11 - (sum % 11)) % 10;
    expect(cardIdChecksumOk(body + d)).toBe(true);
    expect(cardIdChecksumOk(body + ((d + 1) % 10))).toBe(false);
  });
  it("the hospital's synthetic test IDs fail the check on purpose", () => expect(cardIdChecksumOk("7000000000014")).toBe(false));
  it("format and mask", () => {
    expect(formatCardId("1234567890123")).toBe("1-2345-67890-12-3");
    expect(maskCardId("1234567890123")).toBe("x-xxxx-xxxxx-12-3");
  });
});

describe("passwords", () => {
  it("rules", () => {
    expect(passwordProblem("short1")).not.toBeNull();
    expect(passwordProblem("onlyletters")).not.toBeNull();
    expect(passwordProblem("12345678")).not.toBeNull();
    expect(passwordProblem("mala2569ok")).toBeNull();
  });
  it("temporary passwords pass the rules", () => {
    for (let i = 0; i < 20; i++) expect(passwordProblem(temporaryPassword())).toBeNull();
  });
});
