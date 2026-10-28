// Standard-drink arithmetic from the checklist's table. Run with: npm test
import { describe, expect, it } from "vitest";
import { assessDrinking, stdOf } from "./alcohol";

describe("stdOf (checklist table, lower bound of ranges)", () => {
  it("2 large beers = 4", () => expect(stdOf([{ unitId: "beer-large", amount: 2 }])).toBe(4));
  it("1 กั๊ก เหล้าขาว = 6", () => expect(stdOf([{ unitId: "white-kak", amount: 1 }])).toBe(6));
  it("1 แบน วิสกี้ = 10 (table says 10–12)", () => expect(stdOf([{ unitId: "whisky-baen", amount: 1 }])).toBe(10));
  it("mixed: 1 large beer + 2 เป๊ก = 4", () =>
    expect(stdOf([{ unitId: "beer-large", amount: 1 }, { unitId: "white-shot", amount: 2 }])).toBe(4));
});

describe("assessDrinking (9.2.1 / 9.2.2)", () => {
  it("ลุง: large beer 2 bottles, almost every day (6 days) → not binge (4 ≤ 5) but heavy weekly (24 > 15)", () => {
    const r = assessDrinking([{ unitId: "beer-large", amount: 2 }], 6, "ชาย");
    expect(r).toMatchObject({ perSession: 4, perWeek: 24, binge: false, regularHeavy: true });
  });
  it("man: exactly 5 in one go is NOT more than 5", () => {
    expect(assessDrinking([{ unitId: "beer-small", amount: 5 }], 1, "ชาย").binge).toBe(false);
  });
  it("man: 1 กั๊ก เหล้าขาว (6) in one go → binge", () => {
    expect(assessDrinking([{ unitId: "white-kak", amount: 1 }], 1, "ชาย").binge).toBe(true);
  });
  it("woman: 5 cans (5 > 4) → binge", () => {
    expect(assessDrinking([{ unitId: "beer-small", amount: 5 }], 1, "หญิง").binge).toBe(true);
  });
  it("woman: 1 large beer, 5 days a week = 10 > 8 → heavy weekly", () => {
    expect(assessDrinking([{ unitId: "beer-large", amount: 1 }], 5, "หญิง").regularHeavy).toBe(true);
  });
  it("man: 1 large beer every day = 14, not more than 15 → not heavy weekly", () => {
    expect(assessDrinking([{ unitId: "beer-large", amount: 1 }], 7, "ชาย").regularHeavy).toBe(false);
  });
  it("occasional: 2 glasses of wine, less than once a week → neither", () => {
    expect(assessDrinking([{ unitId: "wine-glass", amount: 2 }], 0.5, "หญิง")).toMatchObject({ binge: false, regularHeavy: false });
  });
});
