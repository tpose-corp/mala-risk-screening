// Alert reasons shown on the hospital and รพ.สต. screens. Run with: npm test
import { describe, expect, it } from "vitest";
import { alertReasons } from "./reasons";

const base = { doseCheck: "ok", doseMgDay: 1000, maxDoseMgDay: 2000, egfr: 65, bmi: 24, riskScore: 0, scoreEgfr: 0, scoreBmi: 0, scoreAlcohol: 0 };

describe("alertReasons: every score from 2 to 5 names its factors", () => {
  it("2 points: heavy drinking only", () => {
    expect(alertReasons({ ...base, riskScore: 2, scoreAlcohol: 2 })).toEqual(["เสี่ยง MALA 2 คะแนน: ดื่มหนัก (+2)"]);
  });
  it("2 points: BMI only", () => {
    expect(alertReasons({ ...base, bmi: 21.94, riskScore: 2, scoreBmi: 2 })).toEqual(["เสี่ยง MALA 2 คะแนน: BMI 21.9 (+2)"]);
  });
  it("3 points: eGFR + BMI", () => {
    expect(alertReasons({ ...base, egfr: 33, bmi: 20.24, riskScore: 3, scoreEgfr: 1, scoreBmi: 2 }))
      .toEqual(["เสี่ยง MALA 3 คะแนน: eGFR 33 (+1), BMI 20.2 (+2)"]);
  });
  it("3 points: eGFR + heavy drinking", () => {
    expect(alertReasons({ ...base, egfr: 50, riskScore: 3, scoreEgfr: 1, scoreAlcohol: 2 }))
      .toEqual(["เสี่ยง MALA 3 คะแนน: eGFR 50 (+1), ดื่มหนัก (+2)"]);
  });
  it("4 points: BMI + heavy drinking", () => {
    expect(alertReasons({ ...base, bmi: 21, riskScore: 4, scoreBmi: 2, scoreAlcohol: 2 }))
      .toEqual(["เสี่ยง MALA 4 คะแนน: BMI 21.0 (+2), ดื่มหนัก (+2)"]);
  });
  it("5 points: all three factors", () => {
    expect(alertReasons({ ...base, egfr: 55, bmi: 21.9, riskScore: 5, scoreEgfr: 1, scoreBmi: 2, scoreAlcohol: 2 }))
      .toEqual(["เสี่ยง MALA 5 คะแนน: eGFR 55 (+1), BMI 21.9 (+2), ดื่มหนัก (+2)"]);
  });
  it("1 point is below the threshold → no reason", () => {
    expect(alertReasons({ ...base, egfr: 55, riskScore: 1, scoreEgfr: 1 })).toEqual([]);
  });
});

describe("alertReasons: dose check (Part 1)", () => {
  it("dose too high, listed before the score", () => {
    expect(alertReasons({ ...base, doseCheck: "exceeds", doseMgDay: 2000, maxDoseMgDay: 1000, egfr: 38, bmi: 20.8, riskScore: 3, scoreEgfr: 1, scoreBmi: 2 }))
      .toEqual(["ยา 2000 มก./วัน เกินเกณฑ์ 1000 (eGFR 38)", "เสี่ยง MALA 3 คะแนน: eGFR 38 (+1), BMI 20.8 (+2)"]);
  });
  it("contraindicated (eGFR < 30)", () => {
    expect(alertReasons({ ...base, doseCheck: "contraindicated", maxDoseMgDay: 0, egfr: 25 })).toEqual(["eGFR 25 ห้ามใช้ Metformin"]);
  });
  it("no alert → no reasons", () => {
    expect(alertReasons(base)).toEqual([]);
  });
});
