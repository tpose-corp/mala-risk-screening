// "Send every case to the hospital for analysis" (MVP core 2).
// Column layout copied from `thresholds/MALA outline prg.xlsx`, sheet "report", left to right.
import { ageFromThaiDob } from "./format";

export const REPORT_COLUMNS = [
  "วันที่คัดกรอง", "HN", "ชื่อ-สกุล", "เพศ", "อายุ", "BMI", "eGFR", "ขนาดยา Metformin", "dose ไม่เหมาะสม",
  "eGFR<60", "BMI<23", "ดื่มแอลกอฮอล์", "เป็นกลุ่มเสี่ยง MALA", "ขาดน้ำ", "ขาดอาหาร", "NSAIDs",
  "สมุนไพร/อาหารเสริม", "หน่วยงานที่คัดกรอง",
];

type Row = {
  createdAt: Date; egfr: number; bmi: number; doseMgDay: number; doseCheck: string; scoreEgfr: number; scoreBmi: number;
  scoreAlcohol: number; riskScore: number; vomiting: boolean; lowIntake: boolean; nsaid: boolean; herbal: boolean;
  patient: { hn: string | null; name: string; sex: string; dob: string; facility: string };
};

const yn = (b: boolean) => (b ? "ใช่" : "ไม่ใช่");

export function reportRow(s: Row): string[] {
  return [
    s.createdAt.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" }),
    s.patient.hn ?? "",
    s.patient.name,
    s.patient.sex,
    String(ageFromThaiDob(s.patient.dob, s.createdAt) ?? ""),
    s.bmi.toFixed(1),
    String(s.egfr),
    String(s.doseMgDay),
    yn(s.doseCheck !== "ok"),
    yn(s.scoreEgfr > 0),
    yn(s.scoreBmi > 0),
    yn(s.scoreAlcohol > 0), // ข้อ 9.2.1 / 9.2.2 = ดื่มหนัก
    yn(s.riskScore >= 2),
    yn(s.vomiting), // ข้อ 10 อาเจียน/ท้องเสีย = ขาดน้ำ
    yn(s.lowIntake), // ข้อ 11 = ขาดอาหาร
    yn(s.nsaid),
    yn(s.herbal),
    s.patient.facility,
  ];
}

// CSV that Excel opens with Thai intact (UTF-8 with BOM).
export function toCsv(rows: string[][]) {
  const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}
