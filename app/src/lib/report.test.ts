// CSV export in the hospital's "report" sheet layout. Run with: npm test
import { describe, expect, it } from "vitest";
import { REPORT_COLUMNS, reportRow, toCsv } from "./report";

const row = {
  createdAt: new Date("2026-10-07T09:00:00+07:00"),
  egfr: 38, bmi: 20.83, doseMgDay: 2000, doseCheck: "exceeds", scoreEgfr: 1, scoreBmi: 2, scoreAlcohol: 0, riskScore: 3,
  vomiting: true, lowIntake: false, nsaid: false, herbal: true,
  patient: { hn: "67-014822", name: "นาง สมหญิง จันทร์เพ็ญ", sex: "หญิง", dob: "14/02/2501", facility: "รพ.สต.บ้านดู่" },
};

describe("report", () => {
  it("has the 18 columns of the report sheet, in order", () => {
    expect(REPORT_COLUMNS).toHaveLength(18);
    expect(REPORT_COLUMNS[0]).toBe("วันที่คัดกรอง");
    expect(REPORT_COLUMNS[17]).toBe("หน่วยงานที่คัดกรอง");
  });

  it("maps one screening to one row matching the columns", () => {
    const r = reportRow(row);
    expect(r).toHaveLength(REPORT_COLUMNS.length);
    const byCol = Object.fromEntries(REPORT_COLUMNS.map((c, i) => [c, r[i]]));
    expect(byCol).toMatchObject({
      HN: "67-014822", อายุ: "68", BMI: "20.8", eGFR: "38", "dose ไม่เหมาะสม": "ใช่", "eGFR<60": "ใช่", "BMI<23": "ใช่",
      ดื่มแอลกอฮอล์: "ไม่ใช่", "เป็นกลุ่มเสี่ยง MALA": "ใช่", ขาดน้ำ: "ใช่", ขาดอาหาร: "ไม่ใช่", "สมุนไพร/อาหารเสริม": "ใช่",
    });
  });

  it("CSV starts with a BOM (so Excel shows Thai) and quotes cells with commas or quotes", () => {
    const csv = toCsv([["a", 'say "hi"', "x,y"]]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1)).toBe('a,"say ""hi""","x,y"\r\n');
  });
});
