// What the screener must do, and what to tell the patient, for one screening result.
//
// Sources (both hospital documents in `thresholds/`, still marked draft):
// - WHAT to do: `MALA outline prg.xlsx` sheet "draft", columns Management (E) and Action (F)
// - WORDING of the patient advice: `MALA-risk screening web app with-demo-slides.pdf`, page 11
//   ("ผลประเมิน & คำแนะนำเฉพาะราย"), copied as written. Its 5th card ("นัดตรวจการทำงานของไตซ้ำ")
//   is cut off in the PDF, so it is left out until the hospital sends the full text.
// The app never writes its own clinical advice: if the hospital changes the text, change it here.

import { sickDayReasonsOf } from "./rules";

export type AdviceCard = { title: string; body?: string };

export const ADVICE = {
  quitAlcohol: {
    title: "งดแอลกอฮอล์ทุกชนิด",
    body: "การดื่มร่วมกับยา Metformin ในภาวะไตเสื่อมเพิ่มความเสี่ยงเลือดเป็นกรดจากแลคติกอย่างชัดเจน",
  },
  sickDay: {
    title: "หยุดยาชั่วคราวเมื่อร่างกายขาดน้ำ",
    body: "ท้องเสีย อาเจียน มีไข้สูง หรือกินได้น้อย ให้หยุดยาและติดต่อ รพ.สต. ทันที (sick day rule)",
  },
  warningSigns: {
    title: "สังเกตอาการเตือน",
    body: "หายใจหอบลึก ปวดเมื่อยกล้ามเนื้อมาก อ่อนเพลียผิดปกติ คลื่นไส้ ให้ไปโรงพยาบาลทันที",
  },
  waterNoNsaid: {
    title: "ดื่มน้ำเพียงพอ เลี่ยง NSAIDs",
    body: "น้ำ 6–8 แก้วต่อวันหากไม่มีข้อจำกัด และไม่ซื้อยาแก้ปวดหรือยาชุดกินเอง",
  },
} satisfies Record<string, AdviceCard>;

type StoredResult = {
  doseCheck: string;
  riskScore: number;
  drinksAlcohol: boolean;
  bingeDrinking: boolean;
  regularHeavyDrinking: boolean;
  alcohol: string;
  vomiting: boolean;
  lowIntake: boolean;
  nsaid: boolean;
  herbal: boolean;
};

const heavyAlcoholOf = (s: StoredResult) =>
  (s.drinksAlcohol && (s.bingeDrinking || s.regularHeavyDrinking)) || s.alcohol === "heavy";

// Patient advice cards for this result, in the order the demo deck shows them.
export function adviceFor(s: StoredResult): AdviceCard[] {
  const sickDay = sickDayReasonsOf(s).length > 0;
  const cards: AdviceCard[] = [];
  if (s.riskScore >= 2 && heavyAlcoholOf(s)) cards.push(ADVICE.quitAlcohol); // Part 2 "Advice เลิกเหล้า"
  if (sickDay) cards.push(ADVICE.sickDay, ADVICE.warningSigns); // Part 2/3/4 "Advice Sick Day Rules"
  if (s.nsaid) cards.push(ADVICE.waterNoNsaid); // Part 4 NSAIDs
  return cards;
}

// The checklist the screener sees: what THEY do, and what the system/doctor does.
export function tasksFor(s: StoredResult) {
  const reasons = sickDayReasonsOf(s);
  const staff: string[] = [];
  const system: string[] = [];

  if (s.doseCheck !== "ok") {
    // Part 1: Management "Consult แพทย์เพื่อปรับ dose ให้เหมาะสม", Action "ระบบแจ้งเตือนอัตโนมัติไปยังแพทย์ผู้รับผิดชอบ"
    system.push("แจ้งเตือนแพทย์ผู้รับผิดชอบ เพื่อพิจารณาปรับขนาดยาให้เหมาะสม");
  }
  if (s.riskScore >= 2) {
    // Part 2: Management "Close monitoring, Adjust dose/off Metformin", Action "ระบบเก็บข้อมูล...รอการจัดการทางคลินิก"
    system.push("บันทึกเป็นผู้ป่วยกลุ่มเสี่ยง MALA รอแพทย์ติดตามใกล้ชิดและพิจารณาปรับหรือหยุดยา");
    if (heavyAlcoholOf(s)) staff.push("แนะนำผู้ป่วยให้เลิกเหล้า");
  }
  if (reasons.length) staff.push("แนะนำ Sick Day Rules ให้ผู้ป่วย");
  if (s.herbal) system.push("บันทึกการใช้สมุนไพรหรืออาหารเสริม เพื่อติดตามการใช้ผลิตภัณฑ์สุขภาพในพื้นที่");
  staff.push("ยืนยันปิดเคส");
  return { staff, system, needsAdvice: reasons.length > 0 };
}
