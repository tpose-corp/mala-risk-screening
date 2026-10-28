// Turns an everyday answer ("เบียร์ขวดใหญ่ ครั้งละ 2 ขวด เกือบทุกวัน") into the checklist's
// standard-drink questions 9.2.1 / 9.2.2. Plain arithmetic, no AI.
//
// Source: `thresholds/MALA_Screening_Checklist.docx`
// - table "ตารางเปรียบเทียบปริมาณแอลกอฮอล์ (1 ดื่มมาตรฐาน = แอลกอฮอล์ 10 กรัม)"
// - 9.2.1 ดื่มหนักในช่วงเวลาอันสั้น: ชาย มากกว่า 5, หญิง มากกว่า 4 ดื่มมาตรฐาน ภายใน 2 ชั่วโมง
// - 9.2.2 ดื่มเป็นประจำ/ดื่มหนักต่อเนื่อง: ชาย มากกว่า 15, หญิง มากกว่า 8 ดื่มมาตรฐานต่อสัปดาห์
// Where the table gives a range (e.g. แบน = 11–12), the LOWER number is used, so the app never
// calls someone a heavy drinker unless the table clearly says so.

export type DrinkUnit = { id: string; group: string; label: string; std: number };

export const DRINK_UNITS: DrinkUnit[] = [
  { id: "beer-small", group: "เบียร์", label: "กระป๋องหรือขวดเล็ก (330 มล.)", std: 1 },
  { id: "beer-large", group: "เบียร์", label: "ขวดใหญ่ (620 มล.)", std: 2 },
  { id: "white-shot", group: "เหล้าขาว สุรากลั่น", label: "เป๊ก หรือฝาใหญ่ (30 มล.)", std: 1 },
  { id: "white-kak", group: "เหล้าขาว สุรากลั่น", label: "กั๊ก (180 มล.)", std: 6 },
  { id: "white-baen", group: "เหล้าขาว สุรากลั่น", label: "แบน (350 มล.)", std: 11 },
  { id: "white-klom", group: "เหล้าขาว สุรากลั่น", label: "กลม (700 มล.)", std: 23 },
  { id: "whisky-shot", group: "วิสกี้ บรั่นดี เหล้าสี", label: "เป๊ก หรือฝาใหญ่ (30 มล.)", std: 1 },
  { id: "whisky-kak", group: "วิสกี้ บรั่นดี เหล้าสี", label: "กั๊ก (180 มล.)", std: 5 },
  { id: "whisky-baen", group: "วิสกี้ บรั่นดี เหล้าสี", label: "แบน (350 มล.)", std: 10 },
  { id: "wine-glass", group: "ไวน์", label: "แก้ว (100–120 มล.)", std: 1 },
  { id: "wine-bottle", group: "ไวน์", label: "ขวด (750 มล.)", std: 6 },
  { id: "local-cup", group: "สุราพื้นบ้าน สาโท กระแช่", label: "ถ้วยเล็ก หรือแก้วน้ำ (150 มล.)", std: 1 },
  { id: "local-jar", group: "สุราพื้นบ้าน สาโท กระแช่", label: "ไหเล็ก หรือกรอง (500 มล.)", std: 3 },
];

export const LIMITS = {
  ชาย: { session: 5, week: 15 },
  หญิง: { session: 4, week: 8 },
} as const;

export type DrinkRow = { unitId: string; amount: number }; // amount per drinking session

export function stdOf(rows: DrinkRow[]) {
  return rows.reduce((sum, r) => sum + (DRINK_UNITS.find((u) => u.id === r.unitId)?.std ?? 0) * (r.amount || 0), 0);
}

// daysPerWeek: 0.5 = less than once a week
export function assessDrinking(rows: DrinkRow[], daysPerWeek: number, sex: string) {
  const limit = LIMITS[sex as keyof typeof LIMITS] ?? LIMITS["หญิง"];
  const perSession = stdOf(rows);
  const perWeek = perSession * daysPerWeek;
  return {
    perSession,
    perWeek,
    limit,
    binge: perSession > limit.session, // 9.2.1
    regularHeavy: perWeek > limit.week, // 9.2.2
  };
}
