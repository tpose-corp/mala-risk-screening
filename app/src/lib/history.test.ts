// First-vs-latest change on the patient history page. Run with: npm test
import { describe, expect, it } from "vitest";
import { changeText, trendsOf } from "./history";

const p = (iso: string, egfr: number, weightKg: number, bmi: number, doseMgDay: number, riskScore: number) =>
  ({ createdAt: new Date(iso), egfr, weightKg, bmi, doseMgDay, riskScore });

describe("trendsOf / changeText", () => {
  it("one screening → nothing to compare", () => {
    expect(trendsOf([p("2026-06-12", 62, 60, 24, 2000, 0)])).toBeNull();
  });

  it("compares the earliest with the latest, whatever order they come in", () => {
    const t = trendsOf([
      p("2026-10-07", 38, 52, 20.8, 2000, 3), // latest, listed first
      p("2026-06-12", 62, 60, 24.0, 2000, 0),
      p("2026-08-01", 50, 56, 22.4, 2000, 3),
    ])!;
    const egfr = t.find((x) => x.label === "eGFR")!;
    expect(egfr).toMatchObject({ first: 62, latest: 38, diff: -24 });
    expect(changeText(egfr)).toBe("ลดลง 24");
    expect(changeText(t.find((x) => x.label === "น้ำหนัก")!)).toBe("ลดลง 8.0");
    expect(changeText(t.find((x) => x.label === "ขนาดยา Metformin")!)).toBe("เท่าเดิม");
    expect(changeText(t.find((x) => x.label === "คะแนนความเสี่ยง")!)).toBe("เพิ่มขึ้น 3");
  });
});
