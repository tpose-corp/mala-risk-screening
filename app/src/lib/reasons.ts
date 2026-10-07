// Why a case is an alert, short enough to read at a glance (outline Part 1 and 2).
// One wording for every screen: hospital inbox, hospital case page, รพ.สต. result page.
// Plain function, no database, so it can be unit-tested.

type AlertFacts = {
  doseCheck: string;
  doseMgDay: number;
  maxDoseMgDay: number;
  egfr: number;
  bmi: number;
  riskScore: number;
  scoreEgfr: number;
  scoreBmi: number;
  scoreAlcohol: number;
};

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

// "eGFR 33 (+1), BMI 20.2 (+2)" — every factor that scored, so a 5-point case lists all three.
export function riskFactors(s: AlertFacts): string {
  const parts: string[] = [];
  if (s.scoreEgfr > 0) parts.push(`eGFR ${fmt(s.egfr)} (+${s.scoreEgfr})`);
  if (s.scoreBmi > 0) parts.push(`BMI ${s.bmi.toFixed(1)} (+${s.scoreBmi})`);
  if (s.scoreAlcohol > 0) parts.push(`ดื่มหนัก (+${s.scoreAlcohol})`);
  return parts.join(", ");
}

export function alertReasons(s: AlertFacts): string[] {
  const r: string[] = [];
  if (s.doseCheck === "contraindicated") r.push(`eGFR ${fmt(s.egfr)} ห้ามใช้ Metformin`);
  if (s.doseCheck === "exceeds") r.push(`ยา ${s.doseMgDay} มก./วัน เกินเกณฑ์ ${s.maxDoseMgDay} (eGFR ${fmt(s.egfr)})`);
  if (s.riskScore >= 2) r.push(`เสี่ยง MALA ${s.riskScore} คะแนน: ${riskFactors(s)}`);
  return r;
}
