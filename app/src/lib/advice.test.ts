// What the screener must do, per `MALA outline prg.xlsx` columns Management / Action. Run: npm test
import { describe, expect, it } from "vitest";
import { ADVICE, adviceFor, tasksFor } from "./advice";

const base = {
  doseCheck: "ok",
  riskScore: 0,
  drinksAlcohol: false,
  bingeDrinking: false,
  regularHeavyDrinking: false,
  alcohol: "none",
  vomiting: false,
  lowIntake: false,
  nsaid: false,
  herbal: false,
};

describe("tasksFor / adviceFor", () => {
  it("clean case → only confirm, no advice", () => {
    const t = tasksFor(base);
    expect(t.staff).toEqual(["ยืนยันปิดเคส"]);
    expect(t.system).toEqual([]);
    expect(t.needsAdvice).toBe(false);
    expect(adviceFor(base)).toEqual([]);
  });

  it("Part 1 dose too high → system alerts the doctor; no patient advice", () => {
    const t = tasksFor({ ...base, doseCheck: "exceeds", riskScore: 1 });
    expect(t.system[0]).toMatch(/แจ้งเตือนแพทย์ผู้รับผิดชอบ/);
    expect(t.needsAdvice).toBe(false);
  });

  it("Part 2 risk group + heavy drinker → advise quitting alcohol + Sick Day Rules", () => {
    const s = { ...base, riskScore: 2, drinksAlcohol: true, bingeDrinking: true, alcohol: "heavy" };
    const t = tasksFor(s);
    expect(t.staff).toEqual(["แนะนำผู้ป่วยให้เลิกเหล้า", "แนะนำ Sick Day Rules ให้ผู้ป่วย", "ยืนยันปิดเคส"]);
    expect(t.system[0]).toMatch(/กลุ่มเสี่ยง MALA/);
    expect(adviceFor(s)).toEqual([ADVICE.quitAlcohol, ADVICE.sickDay, ADVICE.warningSigns]);
  });

  it("Part 3 vomiting → Sick Day advice and warning signs", () => {
    expect(adviceFor({ ...base, vomiting: true })).toEqual([ADVICE.sickDay, ADVICE.warningSigns]);
  });

  it("Part 4 NSAIDs → Sick Day advice plus the water / no-NSAID card", () => {
    expect(adviceFor({ ...base, nsaid: true })).toEqual([ADVICE.sickDay, ADVICE.warningSigns, ADVICE.waterNoNsaid]);
  });

  it("Part 4 herbal → Sick Day advice and the system records it for area tracking", () => {
    const t = tasksFor({ ...base, herbal: true });
    expect(t.needsAdvice).toBe(true);
    expect(t.system.some((x) => x.includes("สมุนไพร"))).toBe(true);
  });

  it("old records that stored alcohol as 'heavy' still get the quit-alcohol advice", () => {
    expect(adviceFor({ ...base, riskScore: 2, alcohol: "heavy" })[0]).toBe(ADVICE.quitAlcohol);
  });
});
