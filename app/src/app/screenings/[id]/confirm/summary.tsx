// "ข้อมูลและผลการประเมิน" on the confirm page: everything the screener is about to sign for, on
// the same sheet, so "ข้าพเจ้าขอยืนยันว่าข้อมูลและผลการประเมินนี้ถูกต้อง" is ticked with the data in view.
// Same wording as the result page and the hospital screens (src/lib/reasons.ts, src/lib/advice.ts).
import { adviceFor } from "@/lib/advice";
import { ALCOHOL_LABEL, TRIGGER_LABEL, thaiDateTime } from "@/lib/format";
import { alertReasons } from "@/lib/reasons";
import type { loadScreening } from "@/lib/screening";
import { Facts, type Fact } from "./confirm-form";

type S = Awaited<ReturnType<typeof loadScreening>>;
const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

// only="result" shows just the result block (used on step 4, where the data was already seen)
export function ScreeningSummary({ s, only }: { s: S; only?: "result" }) {
  const found = (on: boolean, label: string, note?: string | null) => (on ? `${label}${note ? ` (${note})` : ""}` : null);
  const symptoms = [found(s.vomiting, TRIGGER_LABEL.vomiting), found(s.lowIntake, TRIGGER_LABEL.lowIntake)].filter(Boolean).join(", ");
  const products = [found(s.nsaid, TRIGGER_LABEL.nsaid, s.nsaidNote), found(s.herbal, TRIGGER_LABEL.herbal, s.herbalNote)].filter(Boolean).join(", ");

  // 8 small boxes, 4 per row, so the whole sheet fits on one screen
  const data: Fact[] = [
    { k: "คัดกรองเมื่อ", v: thaiDateTime(s.createdAt) },
    { k: "น้ำหนัก / ส่วนสูง", v: `${fmt(s.weightKg)} กก. / ${fmt(s.heightCm)} ซม.` },
    { k: "BMI", v: s.bmi.toFixed(1) },
    { k: "eGFR ล่าสุดจาก รพ.", v: `${fmt(s.egfr)} mL/min/1.73m²` },
    { k: "ขนาดยา Metformin", v: `${s.doseMgDay} มก./วัน` },
    { k: "การดื่มแอลกอฮอล์", v: ALCOHOL_LABEL[s.alcohol] ?? s.alcohol },
    { k: "อาการขาดน้ำหรือขาดอาหาร", v: symptoms || "ไม่พบ", muted: !symptoms },
    { k: "ยาหรือผลิตภัณฑ์ที่ทำให้ไตบาดเจ็บ", v: products || "ไม่พบ", muted: !products },
  ];
  const tone = s.alertKind === "dose" ? "hi" : s.isAlert ? "warn" : "ok";
  const result: Fact[] = [
    { k: "ผล", v: s.alertKind === "dose" ? "ผู้ป่วยใช้ยาเกินขนาด" : s.isAlert ? "ผู้ป่วยกลุ่มเสี่ยง MALA" : "ไม่พบความเสี่ยงที่ต้องแจ้งเตือน", tone },
    { k: "ขนาดยาเทียบ eGFR", v: s.doseCheck === "ok" ? "เหมาะสม" : s.doseCheck === "contraindicated" ? "ห้ามใช้ยา" : "ไม่เหมาะสม" },
    { k: "คะแนนความเสี่ยง", v: `${s.riskScore} คะแนน${s.riskGroup ? " กลุ่มเสี่ยง" : " ไม่ถึงเกณฑ์"}` },
  ];
  const advice = adviceFor(s);
  // step 4 lists the advice in full below, so the short version is only on step 5
  if (only !== "result") result.push({ k: "คำแนะนำที่แจ้งผู้ป่วย", v: advice.length ? advice.map((a) => a.title).join(", ") : "ไม่มี", muted: !advice.length });
  const reasons = s.isAlert ? alertReasons(s) : [];
  if (reasons.length) result.push({ k: "เหตุผล", v: reasons.join(", "), wide: true });

  return (
    <>
      {only !== "result" && (
        <section className="doc-sec">
          <h2>ข้อมูลที่กรอก</h2>
          <Facts rows={data} />
        </section>
      )}
      <section className="doc-sec">
        <h2>ผลการประเมิน</h2>
        <Facts rows={result} />
      </section>
    </>
  );
}
