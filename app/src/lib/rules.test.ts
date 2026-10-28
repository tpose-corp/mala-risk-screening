// Unit tests for the rule engine — one test per row of `.docs/04-build/test-plan.md` → PBI-06.
// All values are synthetic. Run with: npm test
import { describe, expect, it } from "vitest";
import { evaluate, type ScreeningInput } from "./rules";

// A "clean" patient: eGFR 65, BMI ≈ 24.2, no alcohol, no triggers → nothing fires.
const clean: ScreeningInput = {
  weightKg: 62,
  heightCm: 160,
  egfr: 65,
  doseMgDay: 1000,
  drinksAlcohol: false,
  bingeDrinking: false,
  regularHeavyDrinking: false,
  vomiting: false,
  lowIntake: false,
  nsaid: false,
  herbal: false,
};
// Height 160 cm: weight 56 kg → BMI ≈ 21.9 (<23)
const lowBmiWeight = 56;
const heavy = { drinksAlcohol: true, bingeDrinking: true, regularHeavyDrinking: false };

describe("PBI-06 rule engine (test-plan.md)", () => {
  it("#1 dose vs eGFR: pass — eGFR 50, 1500 mg", () => {
    expect(evaluate({ ...clean, egfr: 50, doseMgDay: 1500 }).doseCheck).toBe("ok");
  });

  it("#2 dose vs eGFR: boundary — eGFR 45, 2000 mg is allowed (inclusive)", () => {
    expect(evaluate({ ...clean, egfr: 45, doseMgDay: 2000 }).doseCheck).toBe("ok");
  });

  it("#3 dose vs eGFR: fail in 30–44 band — eGFR 35, 1500 mg", () => {
    const r = evaluate({ ...clean, egfr: 35, doseMgDay: 1500 });
    expect(r.doseCheck).toBe("exceeds");
    expect(r.maxDoseMgDay).toBe(1000);
    expect(r.isAlert).toBe(true);
  });

  it("#4 dose vs eGFR: contraindicated — eGFR 25, any dose", () => {
    const r = evaluate({ ...clean, egfr: 25, doseMgDay: 500 });
    expect(r.doseCheck).toBe("contraindicated");
    expect(r.isAlert).toBe(true);
  });

  it("#5 risk score: 0 — eGFR 65, BMI 24, no heavy alcohol", () => {
    const r = evaluate(clean);
    expect(r.riskScore).toBe(0);
    expect(r.isAlert).toBe(false);
  });

  it("#6 risk score: exactly at threshold — eGFR 55 (1) + BMI 22 (2) → alert", () => {
    const r = evaluate({ ...clean, egfr: 55, weightKg: lowBmiWeight });
    expect(r.riskScore).toBe(3); // 1 + 2: already ≥ 2
    expect(r.isAlert).toBe(true);
  });

  it("#6b threshold boundary — BMI <23 alone = 2 points → alert", () => {
    const r = evaluate({ ...clean, weightKg: lowBmiWeight });
    expect(r.riskScore).toBe(2);
    expect(r.isAlert).toBe(true);
  });

  it("#6c below threshold — eGFR 55 alone = 1 point → no alert", () => {
    const r = evaluate({ ...clean, egfr: 55 });
    expect(r.riskScore).toBe(1);
    expect(r.isAlert).toBe(false);
  });

  it("#7 risk score: eGFR 55 + BMI 22 + heavy alcohol = 5 → alert", () => {
    const r = evaluate({ ...clean, egfr: 55, weightKg: lowBmiWeight, ...heavy });
    expect(r.riskScore).toBe(5);
    expect(r.isAlert).toBe(true);
  });

  it("alcohol (checklist 9): drinks but neither 9.2.1 nor 9.2.2 → 0 points", () => {
    expect(evaluate({ ...clean, drinksAlcohol: true }).scoreAlcohol).toBe(0);
  });
  it("alcohol: 9.2.1 binge OR 9.2.2 regular heavy → ดื่มหนัก = 2 points", () => {
    expect(evaluate({ ...clean, ...heavy }).scoreAlcohol).toBe(2);
    expect(evaluate({ ...clean, drinksAlcohol: true, regularHeavyDrinking: true }).scoreAlcohol).toBe(2);
  });
  it("alcohol: 9.2.x answers are ignored when 9.1 = ไม่ดื่ม", () => {
    expect(evaluate({ ...clean, bingeDrinking: true }).scoreAlcohol).toBe(0);
  });
  it("Part 2 management: heavy drinker in risk group → advise quitting alcohol", () => {
    const r = evaluate({ ...clean, ...heavy });
    expect(r.riskGroup).toBe(true);
    expect(r.adviseQuitAlcohol).toBe(true);
  });

  it("#8 Sick Day flags: vomiting only → advice, independent of score", () => {
    const r = evaluate({ ...clean, vomiting: true });
    expect(r.sickDayReasons).toEqual(["vomiting"]);
    expect(r.isAlert).toBe(false);
  });

  it("#9 Sick Day flags: none → no advice", () => {
    expect(evaluate(clean).sickDayReasons).toEqual([]);
  });

  it("Part 4: herbal use → Sick Day advice (merged Management cell) AND tracked, not an alert", () => {
    const r = evaluate({ ...clean, herbal: true });
    expect(r.trackHerbalUse).toBe(true);
    expect(r.sickDayReasons).toEqual(["herbal"]);
    expect(r.isAlert).toBe(false);
  });

  it("Part 2: risk group → screener must also give Sick Day advice", () => {
    expect(evaluate({ ...clean, weightKg: lowBmiWeight }).sickDayReasons).toEqual(["riskGroup"]);
  });

  it("Part 1 only (dose too high, score below 2) → alert, but no Sick Day advice in the outline", () => {
    const r = evaluate({ ...clean, egfr: 40, doseMgDay: 2000, weightKg: 70 });
    expect(r.isAlert).toBe(true);
    expect(r.riskScore).toBe(1);
    expect(r.sickDayReasons).toEqual([]);
  });

  it("#10 dose fail + score fail together → still one alert", () => {
    const r = evaluate({ ...clean, egfr: 35, doseMgDay: 1500, weightKg: lowBmiWeight });
    expect(r.doseCheck).toBe("exceeds");
    expect(r.riskScore).toBe(3);
    expect(r.isAlert).toBe(true);
  });

  it("#11 deterministic — same input twice gives identical output", () => {
    const input = { ...clean, egfr: 38, doseMgDay: 2000, ...heavy, vomiting: true };
    expect(evaluate(input)).toEqual(evaluate(input));
  });
});
