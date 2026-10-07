// Change between a patient's first and latest screening, for the hospital's patient history page.
// Plain function, no database, so it can be unit-tested.

type Point = { createdAt: Date; egfr: number; weightKg: number; bmi: number; doseMgDay: number; riskScore: number };

export type Trend = { label: string; unit: string; first: number; latest: number; diff: number; decimals: number };

const FIELDS: { key: keyof Omit<Point, "createdAt">; label: string; unit: string; decimals: number }[] = [
  { key: "egfr", label: "eGFR", unit: "", decimals: 0 },
  { key: "weightKg", label: "น้ำหนัก", unit: "กก.", decimals: 1 },
  { key: "bmi", label: "BMI", unit: "", decimals: 1 },
  { key: "doseMgDay", label: "ขนาดยา Metformin", unit: "มก./วัน", decimals: 0 },
  { key: "riskScore", label: "คะแนนความเสี่ยง", unit: "คะแนน", decimals: 0 },
];

// Returns null when there is only one screening (nothing to compare yet).
export function trendsOf(points: Point[]): Trend[] | null {
  if (points.length < 2) return null;
  const sorted = [...points].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const first = sorted[0];
  const latest = sorted[sorted.length - 1];
  return FIELDS.map((f) => ({
    label: f.label,
    unit: f.unit,
    decimals: f.decimals,
    first: first[f.key],
    latest: latest[f.key],
    diff: latest[f.key] - first[f.key],
  }));
}

// "ลดลง 24" / "เพิ่มขึ้น 1.5" / "เท่าเดิม"
export function changeText(t: Trend): string {
  const d = Math.abs(t.diff);
  if (d < (t.decimals ? 0.05 : 0.5)) return "เท่าเดิม";
  const n = t.decimals ? d.toFixed(t.decimals) : String(Math.round(d));
  return `${t.diff > 0 ? "เพิ่มขึ้น" : "ลดลง"} ${n}`;
}
