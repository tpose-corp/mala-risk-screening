// Runs the rule-engine cases R-01 to R-11 from .docs/04-build/test-plan.md section 6.2 against
// src/lib/rules.ts and writes the result table. Expected values are copied from the test plan,
// which the team checked by hand against the hospital's MALA outline (thresholds/).
// Run: npx tsx scripts/eval-rule-cases.ts > ../test/results/rule-cases-<date>.md
import { evaluate, type ScreeningInput } from "../src/lib/rules";

const base: ScreeningInput = {
  weightKg: 70, heightCm: 160, egfr: 75, doseMgDay: 1000,
  drinksAlcohol: false, bingeDrinking: false, regularHeavyDrinking: false,
  vomiting: false, lowIntake: false, nsaid: false, herbal: false,
};

type Expect = { dose: "ok" | "exceeds" | "contraindicated"; score: number; alert: boolean; sickDay: boolean };
const cases: { id: string; data: string; input: ScreeningInput; expect: Expect }[] = [
  { id: "R-01", data: "eGFR 75, 1500 mg, 70 kg", input: { ...base, doseMgDay: 1500 }, expect: { dose: "ok", score: 0, alert: false, sickDay: false } },
  { id: "R-02", data: "eGFR 45, 2000 mg, 70 kg", input: { ...base, egfr: 45, doseMgDay: 2000 }, expect: { dose: "ok", score: 1, alert: false, sickDay: false } },
  { id: "R-03", data: "eGFR 44, 1500 mg, 70 kg", input: { ...base, egfr: 44, doseMgDay: 1500 }, expect: { dose: "exceeds", score: 1, alert: true, sickDay: false } },
  { id: "R-04", data: "eGFR 30, 1000 mg, 70 kg", input: { ...base, egfr: 30 }, expect: { dose: "ok", score: 1, alert: false, sickDay: false } },
  { id: "R-05", data: "eGFR 29, 500 mg, 70 kg", input: { ...base, egfr: 29, doseMgDay: 500 }, expect: { dose: "contraindicated", score: 1, alert: true, sickDay: false } },
  { id: "R-06", data: "eGFR 75, 1000 mg, 55 kg", input: { ...base, weightKg: 55 }, expect: { dose: "ok", score: 2, alert: true, sickDay: true } },
  { id: "R-07", data: "eGFR 55, 1000 mg, 70 kg, regular heavy drinking", input: { ...base, egfr: 55, drinksAlcohol: true, regularHeavyDrinking: true }, expect: { dose: "ok", score: 3, alert: true, sickDay: true } },
  { id: "R-08", data: "eGFR 75, 1000 mg, 70 kg, drinks, no heavy item", input: { ...base, drinksAlcohol: true }, expect: { dose: "ok", score: 0, alert: false, sickDay: false } },
  { id: "R-09", data: "eGFR 75, 1000 mg, 70 kg, vomiting", input: { ...base, vomiting: true }, expect: { dose: "ok", score: 0, alert: false, sickDay: true } },
  { id: "R-10", data: "eGFR 75, 1000 mg, 70 kg, herbal", input: { ...base, herbal: true }, expect: { dose: "ok", score: 0, alert: false, sickDay: true } },
];

const rows: string[] = [];
let pass = 0;
for (const c of cases) {
  const r = evaluate(c.input);
  const got: Expect = { dose: r.doseCheck, score: r.riskScore, alert: r.isAlert, sickDay: r.sickDayReasons.length > 0 };
  const ok = JSON.stringify(got) === JSON.stringify(c.expect);
  if (ok) pass++;
  const fmt = (e: Expect) => `${e.dose}, score ${e.score}, ${e.alert ? "alert" : "no alert"}, ${e.sickDay ? "Sick Day advice" : "no advice"}`;
  rows.push(`| ${c.id} | ${c.data} | ${fmt(c.expect)} | ${fmt(got)} | ${ok ? "PASS" : "FAIL"} |`);
}
// R-11: R-07 twice must give identical output (deterministic, no AI)
const a = JSON.stringify(evaluate(cases[6].input));
const b = JSON.stringify(evaluate(cases[6].input));
const same = a === b;
if (same) pass++;
rows.push(`| R-11 | R-07 submitted twice | identical output | ${same ? "identical output" : "DIFFERENT"} | ${same ? "PASS" : "FAIL"} |`);

console.log(`# Rule engine evaluation, cases R-01 to R-11\n`);
console.log(`Run: ${new Date().toISOString()} · rule version ${evaluate(base).ruleVersion} · script app/scripts/eval-rule-cases.ts\n`);
console.log(`Expected values come from .docs/04-build/test-plan.md section 6.2 (checked by hand against the hospital outline).\n`);
console.log(`| ID | Test data | Expected | Actual | Result |\n|---|---|---|---|---|`);
console.log(rows.join("\n"));
console.log(`\n**${pass} of ${cases.length + 1} cases pass.**`);
