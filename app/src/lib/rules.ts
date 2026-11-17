// MALA rule engine (PBI-06): plain deterministic arithmetic, never an AI/LLM call.
//
// Source: `thresholds/MALA outline prg.xlsx`, sheet "draft" (hospital draft, Sep 8, 2026).
// Each Part below mirrors one row group of that sheet: Criteria → Management → Action.
// Do NOT add or change a default here unless the hospital's document says so. The hospital
// changes the numbers itself from /admin/criteria (stored as RuleSet versions).

export const RULE_VERSION = "outline-draft-2026-09-08";

// The numbers the hospital can change from the admin page (/admin/criteria). WHICH factors are
// scored is fixed here in code; HOW MUCH each one counts is data. The defaults below are the
// hospital outline's values. A new factor (e.g. another lab value) still needs a developer.
export type RuleParams = {
  egfrContraindicatedBelow: number; // eGFR < this → ห้ามใช้ยา
  egfrReducedBelow: number; // eGFR < this → reduced max dose
  maxDoseReduced: number; // mg/day allowed when eGFR is in the reduced band
  maxDoseNormal: number; // mg/day allowed otherwise
  egfrRiskBelow: number; // eGFR < this scores …
  egfrRiskScore: number; // … this many points
  bmiRiskBelow: number; // BMI < this scores …
  bmiRiskScore: number; // … this many points
  heavyAlcoholScore: number; // ดื่มหนัก scores this many points
  riskGroupMinScore: number; // total ≥ this = กลุ่มเสี่ยง MALA
};

export const DEFAULT_PARAMS: RuleParams = {
  egfrContraindicatedBelow: 30,
  egfrReducedBelow: 45,
  maxDoseReduced: 1000,
  maxDoseNormal: 2000,
  egfrRiskBelow: 60,
  egfrRiskScore: 1,
  bmiRiskBelow: 23,
  bmiRiskScore: 2,
  heavyAlcoholScore: 2,
  riskGroupMinScore: 2,
};

// Thai labels + where each default comes from, for the admin criteria page.
export const PARAM_INFO: Record<keyof RuleParams, { label: string; unit: string; part: string }> = {
  egfrContraindicatedBelow: { label: "eGFR ต่ำกว่าค่านี้ ห้ามใช้ Metformin", unit: "mL/min/1.73m²", part: "ส่วนที่ 1 ขนาดยาตาม eGFR (CPG)" },
  egfrReducedBelow: { label: "eGFR ต่ำกว่าค่านี้ ให้ใช้ขนาดยาสูงสุดแบบลดขนาด", unit: "mL/min/1.73m²", part: "ส่วนที่ 1 ขนาดยาตาม eGFR (CPG)" },
  maxDoseReduced: { label: "ขนาดยาสูงสุดเมื่ออยู่ในช่วงลดขนาด", unit: "มก./วัน", part: "ส่วนที่ 1 ขนาดยาตาม eGFR (CPG)" },
  maxDoseNormal: { label: "ขนาดยาสูงสุดในกรณีทั่วไป", unit: "มก./วัน", part: "ส่วนที่ 1 ขนาดยาตาม eGFR (CPG)" },
  egfrRiskBelow: { label: "eGFR ต่ำกว่าค่านี้ นับเป็นปัจจัยเสี่ยง", unit: "mL/min/1.73m²", part: "ส่วนที่ 2 คะแนนความเสี่ยง" },
  egfrRiskScore: { label: "คะแนนของปัจจัย eGFR", unit: "คะแนน", part: "ส่วนที่ 2 คะแนนความเสี่ยง" },
  bmiRiskBelow: { label: "BMI ต่ำกว่าค่านี้ นับเป็นปัจจัยเสี่ยง", unit: "kg/m²", part: "ส่วนที่ 2 คะแนนความเสี่ยง" },
  bmiRiskScore: { label: "คะแนนของปัจจัย BMI", unit: "คะแนน", part: "ส่วนที่ 2 คะแนนความเสี่ยง" },
  heavyAlcoholScore: { label: "คะแนนของการดื่มหนัก", unit: "คะแนน", part: "ส่วนที่ 2 คะแนนความเสี่ยง" },
  riskGroupMinScore: { label: "คะแนนรวมตั้งแต่ค่านี้ขึ้นไป ถือเป็นกลุ่มเสี่ยง MALA", unit: "คะแนน", part: "ส่วนที่ 2 คะแนนความเสี่ยง" },
};

// Catches typing mistakes and impossible orderings. Returns Thai messages; empty = OK.
export function paramProblems(p: RuleParams): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(p) as [keyof RuleParams, number][]) {
    if (!Number.isFinite(v) || v < 0) out.push(`${PARAM_INFO[k].label}: ต้องเป็นตัวเลขไม่ติดลบ`);
  }
  if (p.egfrContraindicatedBelow > p.egfrReducedBelow) out.push("ค่า eGFR ห้ามใช้ยา ต้องไม่สูงกว่าค่า eGFR ลดขนาดยา");
  if (p.maxDoseReduced > p.maxDoseNormal) out.push("ขนาดยาช่วงลดขนาด ต้องไม่มากกว่าขนาดยาทั่วไป");
  if (p.egfrContraindicatedBelow > 200 || p.egfrReducedBelow > 200 || p.egfrRiskBelow > 200) out.push("ค่า eGFR ต้องไม่เกิน 200");
  if (p.bmiRiskBelow > 60) out.push("ค่า BMI ต้องไม่เกิน 60");
  if (p.maxDoseNormal > 5000) out.push("ขนาดยาต้องไม่เกิน 5000 มก./วัน");
  if (p.riskGroupMinScore === 0) out.push("คะแนนเกณฑ์กลุ่มเสี่ยงต้องมากกว่า 0");
  return out;
}

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
  alertKind: "dose" | "risk" | null;
  sickDayReasons: SickDayReason[];
  adviseQuitAlcohol: boolean; // Part 2 management "Advice เลิกเหล้า"
  trackHerbalUse: boolean; // Part 4 action: store for tracking health-product use in the area
};

// Part 1 (CPG): eGFR ≥ 45 → ≤ 2000 mg, 30–44 → ≤ 1000 mg, < 30 → ห้ามใช้ยา
export function maxDoseForEgfr(egfr: number, p: RuleParams = DEFAULT_PARAMS): number {
  if (egfr < p.egfrContraindicatedBelow) return 0;
  if (egfr < p.egfrReducedBelow) return p.maxDoseReduced;
  return p.maxDoseNormal;
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

// Used both by evaluate() and by pages that only have the stored record.
export function sickDayReasonsOf(s: {
  riskGroup: boolean;
  vomiting: boolean;
  lowIntake: boolean;
  nsaid: boolean;
  herbal: boolean;
}): SickDayReason[] {
  const r: SickDayReason[] = [];
  if (s.riskGroup) r.push("riskGroup"); // Part 2
  if (s.vomiting) r.push("vomiting"); // Part 3
  if (s.lowIntake) r.push("lowIntake"); // Part 3
  if (s.nsaid) r.push("nsaid"); // Part 4
  if (s.herbal) r.push("herbal"); // Part 4 (Management cell is merged with NSAIDs → same advice)
  return r;
}

export function evaluate(input: ScreeningInput, p: RuleParams = DEFAULT_PARAMS, ruleVersion = RULE_VERSION): ScreeningResult {
  const bmi = bmiOf(input.weightKg, input.heightCm);

  // Part 1: dose vs eGFR
  const maxDoseMgDay = maxDoseForEgfr(input.egfr, p);
  const doseCheck: DoseCheck =
    maxDoseMgDay === 0 ? "contraindicated" : input.doseMgDay <= maxDoseMgDay ? "ok" : "exceeds";

  // Part 2 (defaults): eGFR < 60 = 1, BMI < 23 = 2, ดื่มหนัก = 2; score ≥ 2 = MALA risk group
  const heavyAlcohol = isHeavyDrinker(input);
  const scoreEgfr = input.egfr < p.egfrRiskBelow ? p.egfrRiskScore : 0;
  const scoreBmi = bmi < p.bmiRiskBelow ? p.bmiRiskScore : 0;
  const scoreAlcohol = heavyAlcohol ? p.heavyAlcoholScore : 0;
  const riskScore = scoreEgfr + scoreBmi + scoreAlcohol;
  const riskGroup = riskScore >= p.riskGroupMinScore;

  return {
    ruleVersion,
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
    // Two alert tabs for the hospital (17 Nov): ใช้ยาเกินขนาด comes first, a dose problem wins.
    alertKind: doseCheck !== "ok" ? "dose" : riskGroup ? "risk" : null,
    sickDayReasons: sickDayReasonsOf({ riskGroup, ...input }),
    adviseQuitAlcohol: riskGroup && heavyAlcohol,
    trackHerbalUse: input.herbal,
  };
}
