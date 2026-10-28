// MALA rule engine (PBI-06): plain deterministic arithmetic, never an AI/LLM call.
//
// Source: `thresholds/MALA outline prg.xlsx`, sheet "draft" (hospital draft, Sep 8, 2026).
// Each Part below mirrors one row group of that sheet: Criteria → Management → Action.
// Do NOT add or change a threshold here unless the hospital's document says so.

export const RULE_VERSION = "outline-draft-2026-09-08";

export type ScreeningInput = {
  weightKg: number;
  heightCm: number;
  egfr: number;
  doseMgDay: number;
  // checklist item 9 (MALA_Screening_Checklist.docx)
  drinksAlcohol: boolean; // 9.1
  bingeDrinking: boolean; // 9.2.1 ดื่มหนักในช่วงเวลาอันสั้น
  regularHeavyDrinking: boolean; // 9.2.2 ดื่มเป็นประจำ/ดื่มหนักต่อเนื่อง
  vomiting: boolean; // item 10
  lowIntake: boolean; // item 11
  nsaid: boolean; // item 12
  herbal: boolean; // item 13
};

export type DoseCheck = "ok" | "exceeds" | "contraindicated";

// Why the screener must give Sick Day Rules advice (outline column F "ระบบแจ้งผู้คัดกรองให้แนะนำเรื่อง Sick Day Rules").
export type SickDayReason = "riskGroup" | "vomiting" | "lowIntake" | "nsaid" | "herbal";

export type ScreeningResult = {
  ruleVersion: string;
  bmi: number;
  maxDoseMgDay: number; // 0 means Metformin is contraindicated
  doseCheck: DoseCheck;
  heavyAlcohol: boolean;
  scoreEgfr: number;
  scoreBmi: number;
  scoreAlcohol: number;
  riskScore: number;
  riskGroup: boolean; // Part 2: score ≥ 2 = "ผู้ป่วยมีความเสี่ยงต่อการเกิดภาวะ MALA"
  isAlert: boolean;
  sickDayReasons: SickDayReason[];
  adviseQuitAlcohol: boolean; // Part 2 management "Advice เลิกเหล้า"
  trackHerbalUse: boolean; // Part 4 action: store for tracking health-product use in the area
};

// Part 1 (CPG): eGFR ≥ 45 → ≤ 2000 mg, 30–44 → ≤ 1000 mg, < 30 → ห้ามใช้ยา
export function maxDoseForEgfr(egfr: number): number {
  if (egfr < 30) return 0;
  if (egfr < 45) return 1000;
  return 2000;
}

export function bmiOf(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

// "ดื่มหนัก" = yes to 9.2.1 or 9.2.2. The outline's "report" sheet feeds its alcohol column from
// both items ("ข้อ 9.2.1/9.2.2"); counting either one is our reading of that, to confirm with the hospital.
export function isHeavyDrinker(i: Pick<ScreeningInput, "drinksAlcohol" | "bingeDrinking" | "regularHeavyDrinking">) {
  return i.drinksAlcohol && (i.bingeDrinking || i.regularHeavyDrinking);
}

export const RISK_SCORE_ALERT_THRESHOLD = 2;

// Used both by evaluate() and by pages that only have the stored record.
export function sickDayReasonsOf(s: {
  riskScore: number;
  vomiting: boolean;
  lowIntake: boolean;
  nsaid: boolean;
  herbal: boolean;
}): SickDayReason[] {
  const r: SickDayReason[] = [];
  if (s.riskScore >= RISK_SCORE_ALERT_THRESHOLD) r.push("riskGroup"); // Part 2
  if (s.vomiting) r.push("vomiting"); // Part 3
  if (s.lowIntake) r.push("lowIntake"); // Part 3
  if (s.nsaid) r.push("nsaid"); // Part 4
  if (s.herbal) r.push("herbal"); // Part 4 (Management cell is merged with NSAIDs → same advice)
  return r;
}

export function evaluate(input: ScreeningInput): ScreeningResult {
  const bmi = bmiOf(input.weightKg, input.heightCm);

  // Part 1: dose vs eGFR
  const maxDoseMgDay = maxDoseForEgfr(input.egfr);
  const doseCheck: DoseCheck =
    maxDoseMgDay === 0 ? "contraindicated" : input.doseMgDay <= maxDoseMgDay ? "ok" : "exceeds";

  // Part 2: eGFR < 60 = 1, BMI < 23 = 2, ดื่มหนัก = 2; score ≥ 2 = MALA risk group
  const heavyAlcohol = isHeavyDrinker(input);
  const scoreEgfr = input.egfr < 60 ? 1 : 0;
  const scoreBmi = bmi < 23 ? 2 : 0;
  const scoreAlcohol = heavyAlcohol ? 2 : 0;
  const riskScore = scoreEgfr + scoreBmi + scoreAlcohol;
  const riskGroup = riskScore >= RISK_SCORE_ALERT_THRESHOLD;

  return {
    ruleVersion: RULE_VERSION,
    bmi,
    maxDoseMgDay,
    doseCheck,
    heavyAlcohol,
    scoreEgfr,
    scoreBmi,
    scoreAlcohol,
    riskScore,
    riskGroup,
    // Part 1 action: auto-alert the responsible doctor. Part 2 → alert as in the demo deck
    // ("ความเสี่ยงเกินเกณฑ์ ระบบแจ้งเตือน (Alert)").
    isAlert: doseCheck !== "ok" || riskGroup,
    sickDayReasons: sickDayReasonsOf({ riskScore, ...input }),
    adviseQuitAlcohol: riskGroup && heavyAlcohol,
    trackHerbalUse: input.herbal,
  };
}
