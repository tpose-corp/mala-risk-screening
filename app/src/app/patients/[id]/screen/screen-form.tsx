"use client";
// The screening form, following `thresholds/MALA_Screening_Checklist.docx` (items 5–13; items
// 1–4 come from the patient record). Client Component because the BMI and the eGFR meter update
// as you type. The alcohol part lives in alcohol-section.tsx.

import Link from "next/link";
import { useActionState, useState } from "react";
import { EgfrMeter } from "@/components/egfr-meter";
import { bmiOf } from "@/lib/rules";
import { submitWithoutReset } from "@/lib/submit";
import { createScreening } from "./actions";
import { AlcoholSection } from "./alcohol-section";

export type PreviousValues = { weightKg: number; heightCm: number; egfr: number; doseMgDay: number; date: string };

// Checklist items 10–13, worded as in the checklist
const TRIGGERS = [
  { name: "vomiting", q: "ในช่วงที่ผ่านมา ผู้ป่วยเคยมีอาการอาเจียนหรือท้องเสียหรือไม่?" },
  { name: "lowIntake", q: "ในช่วงที่ผ่านมา ผู้ป่วยเคยทานอาหารไม่ได้หรือทานได้น้อยลงต่อเนื่อง 1–2 วันหรือไม่?" },
  { name: "nsaid", q: "ผู้ป่วยกินยาแก้ปวด แก้อักเสบ หรือยาชุดบ้างหรือไม่?" },
  { name: "herbal", q: "ผู้ป่วยกินยาต้ม ยาหม้อ สมุนไพร หรืออาหารเสริมบ้างหรือไม่?" },
];

export function ScreenForm({ patientId, sex, prev }: { patientId: number; sex: string; prev: PreviousValues | null }) {
  // .bind fixes the first argument (patientId) so the form only needs to send the fields.
  const [state, action, pending] = useActionState(createScreening.bind(null, patientId), undefined);
  const e = state?.errors;

  // Controlled fields: React keeps each value in state, so the BMI / eGFR meter update live.
  // Height rarely changes, so it starts from last time (as in the hospital's demo); the rest
  // must be measured today, so they start empty with last time's value shown underneath.
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState(prev ? String(prev.heightCm) : "");
  const [egfr, setEgfr] = useState("");
  const [dose, setDose] = useState("");
  const [choice, setChoice] = useState<Record<string, string>>({
    vomiting: "no", lowIntake: "no", nsaid: "no", herbal: "no",
  });
  const pick = (name: string, value: string) => setChoice((c) => ({ ...c, [name]: value }));

  const w = Number(weight);
  const h = Number(height);
  const bmi = w > 0 && h > 0 ? bmiOf(w, h) : null;
  const egfrNum = egfr === "" ? null : Number(egfr);
  const last = (v: number, unit = "") => (prev ? `ครั้งก่อน ${v}${unit && ` ${unit}`} (${prev.date})` : undefined);

  return (
    <form onSubmit={submitWithoutReset(action)} className="split">
      <div className="main">
        <div className="card pad" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <section>
            <div className="sec-title"><span className="sec-num">1</span>ข้อมูลทางคลินิก</div>
            <div className="row">
              <Field label="น้ำหนัก (กก.)" name="weightKg" value={weight} onChange={setWeight} error={e?.weightKg} hint={last(prev?.weightKg ?? 0, "กก.")} />
              <Field label="ส่วนสูง (ซม.)" name="heightCm" value={height} onChange={setHeight} error={e?.heightCm}
                hint={last(prev?.heightCm ?? 0, "ซม.")} />
              <div>
                <span className="lbl">BMI (คำนวณให้)</span>
                <div className="fld" style={{ display: "flex", alignItems: "center", background: "var(--muted-soft)", color: "var(--ink-2)" }}>
                  {bmi ? `${bmi.toFixed(1)} kg/m²` : ""}
                </div>
              </div>
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <Field label="eGFR ล่าสุดในฐาน HIS (mL/min/1.73m²)" name="egfr" value={egfr} onChange={setEgfr} error={e?.egfr} hint={last(prev?.egfr ?? 0)} />
              <Field label="ขนาดยา Metformin ปัจจุบัน (มก./วัน)" name="doseMgDay" value={dose} onChange={setDose} error={e?.doseMgDay} step="250" hint={last(prev?.doseMgDay ?? 0, "มก./วัน")} />
            </div>
            {egfrNum !== null && !Number.isNaN(egfrNum) && <EgfrMeter value={egfrNum} />}
          </section>

          <section>
            <div className="sec-title"><span className="sec-num">2</span>การดื่มแอลกอฮอล์</div>
            <AlcoholSection sex={sex} error={e?.alcohol?.[0]} />
          </section>

          <section>
            <div className="sec-title"><span className="sec-num">3</span>อาการและปัจจัยกระตุ้น</div>
            {TRIGGERS.map((t) => (
              <YesNo key={t.name} q={t.q} name={t.name} value={choice[t.name]} onPick={pick} />
            ))}
          </section>
        </div>
      </div>

      <aside className="side">
        <div className="card soft pad">
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--acc-d)", marginBottom: 5 }}>เกี่ยวกับแบบประเมินนี้</div>
          <div style={{ fontSize: 12, lineHeight: 1.65, color: "var(--ink-2)" }}>
            ตามแบบคัดกรองและเกณฑ์ที่ รพ. ส่งมา ยังเป็นฉบับร่าง รอทีมแพทย์รับรอง
          </div>
        </div>
        <div className="card pad" style={{ fontSize: 11.5, color: "var(--ink-2)", lineHeight: 1.55 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--ink)" }}>ระบบจะตรวจ 4 ส่วน</div>
          <ul className="bullets">
            <li>ขนาดยา Metformin เหมาะกับ eGFR ตาม CPG ไหม</li>
            <li>คะแนนความเสี่ยงจาก eGFR, BMI และการดื่มหนัก ถึง 2 คะแนนไหม</li>
            <li>อาเจียน ท้องเสีย หรือทานได้น้อยลง</li>
            <li>ยาแก้ปวด NSAIDs สมุนไพร หรืออาหารเสริม</li>
          </ul>
        </div>
        {e && <div className="err" role="alert">{e.form?.[0] ?? "กรุณาตรวจสอบข้อมูลที่ขึ้นสีแดง"}</div>}
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "กำลังประมวลผล…" : "ประมวลผลความเสี่ยง MALA"}
        </button>
        <Link href="/patients" className="btn-s">← กลับไปค้นหาผู้ป่วย</Link>
      </aside>
    </form>
  );
}

// One checklist question with two answers. The radio `name` is what the server reads.
function YesNo(props: {
  q: string;
  name: string;
  value: string;
  onPick: (name: string, value: string) => void;
}) {
  const [noLabel, yesLabel] = ["ไม่ใช่", "ใช่"];
  return (
    <div className="kv q-row">
      <span className="k">{props.q}</span>
      <div className="seg" style={{ width: 150, flexShrink: 0 }} role="radiogroup" aria-label={props.q}>
        <label><input type="radio" name={props.name} value="no" checked={props.value === "no"} onChange={() => props.onPick(props.name, "no")} />{noLabel}</label>
        <label><input type="radio" name={props.name} value="yes" checked={props.value === "yes"} onChange={() => props.onPick(props.name, "yes")} />{yesLabel}</label>
      </div>
    </div>
  );
}

// A small reusable number input. Props = the values a parent passes into a component.
function Field(props: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  error?: string[];
  step?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="lbl" htmlFor={props.name}>{props.label}</label>
      <input
        className="fld"
        id={props.name}
        name={props.name}
        type="number"
        step={props.step ?? "0.1"}
        inputMode="decimal"
        value={props.value}
        onChange={(ev) => props.onChange(ev.target.value)}
      />
      {props.error ? <div className="err">{props.error[0]}</div> : props.hint && <div className="note">{props.hint}</div>}
    </div>
  );
}
