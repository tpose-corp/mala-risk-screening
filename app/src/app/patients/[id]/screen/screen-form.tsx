"use client";
// The screening form, following `thresholds/MALA_Screening_Checklist.docx` (items 5–13; items
// 1–4 come from the patient record). Client Component because the BMI and the eGFR meter update
// as you type. The alcohol part lives in alcohol-section.tsx.

import Link from "next/link";
import { useActionState, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { EgfrMeter } from "@/components/egfr-meter";
import { LabDatePicker } from "@/components/lab-date-picker";
import { bmiOf } from "@/lib/rules";
import { submitWithoutReset } from "@/lib/submit";
import { saveScreening } from "./actions";
import { AlcoholSection } from "./alcohol-section";

export type PreviousValues = { weightKg: number; heightCm: number; egfr: number; doseMgDay: number; date: string };

// Values of the screening being edited (edit mode, before it is confirmed).
export type InitialValues = {
  weightKg: number; heightCm: number; egfr: number; egfrDate: string | null; doseMgDay: number;
  drinksAlcohol: boolean; bingeDrinking: boolean; regularHeavyDrinking: boolean;
  vomiting: boolean; lowIntake: boolean; nsaid: boolean; nsaidNote: string | null; herbal: boolean; herbalNote: string | null;
};

// Checklist items 10–13, worded as in the checklist
// Items 12 and 13 ask WHICH product when the answer is yes (17 Nov 2026): if one area keeps
// showing risk, the hospital team can go and look for the shared cause.
const TRIGGERS = [
  { name: "vomiting", q: "ในช่วงที่ผ่านมา ผู้ป่วยเคยมีอาการอาเจียนหรือท้องเสียหรือไม่?" },
  { name: "lowIntake", q: "ในช่วงที่ผ่านมา ผู้ป่วยเคยทานอาหารไม่ได้หรือทานได้น้อยลงต่อเนื่อง 1–2 วันหรือไม่?" },
  { name: "nsaid", q: "ผู้ป่วยกินยาแก้ปวด แก้อักเสบ หรือยาชุดบ้างหรือไม่?", note: "nsaidNote", noteLabel: "ระบุชื่อยา / ยาชุด และแหล่งที่ซื้อ (ถ้าทราบ)" },
  { name: "herbal", q: "ผู้ป่วยกินยาต้ม ยาหม้อ สมุนไพร หรืออาหารเสริมบ้างหรือไม่?", note: "herbalNote", noteLabel: "ระบุชื่อสมุนไพร / อาหารเสริม และแหล่งที่ได้มา (ถ้าทราบ)" },
];

export function ScreenForm({ patientId, sex, prev, screeningId = null, initial = null }: {
  patientId: number; sex: string; prev: PreviousValues | null; screeningId?: number | null; initial?: InitialValues | null;
}) {
  // .bind fixes the first arguments so the form only needs to send the fields.
  const [state, action, pending] = useActionState(saveScreening.bind(null, patientId, screeningId), undefined);
  const e = state?.errors;
  const [closedFor, setClosedFor] = useState<typeof state>(undefined);
  const locked = state?.locked && closedFor !== state ? state.locked : null;
  const yn = (b: boolean | undefined) => (b ? "yes" : "no");

  // Controlled fields: React keeps each value in state, so the BMI / eGFR meter update live.
  // Height rarely changes, so it starts from last time (as in the hospital's demo); the rest
  // must be measured today, so they start empty with last time's value shown underneath.
  const [weight, setWeight] = useState(initial ? String(initial.weightKg) : "");
  const [height, setHeight] = useState(initial ? String(initial.heightCm) : prev ? String(prev.heightCm) : "");
  const [egfr, setEgfr] = useState(initial ? String(initial.egfr) : "");
  const [dose, setDose] = useState(initial ? String(initial.doseMgDay) : "");
  const [choice, setChoice] = useState<Record<string, string>>({
    vomiting: yn(initial?.vomiting), lowIntake: yn(initial?.lowIntake), nsaid: yn(initial?.nsaid), herbal: yn(initial?.herbal),
  });
  const [notes, setNotes] = useState<Record<string, string>>({ nsaidNote: initial?.nsaidNote ?? "", herbalNote: initial?.herbalNote ?? "" });
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
            <div style={{ marginTop: 12 }}>
              <LabDatePicker name="egfrDate" label="วันที่ตรวจ eGFR" initial={initial?.egfrDate} error={e?.egfrDate?.[0]} />
            </div>
            {egfrNum !== null && !Number.isNaN(egfrNum) && <EgfrMeter value={egfrNum} />}
          </section>

          <section>
            <div className="sec-title"><span className="sec-num">2</span>การดื่มแอลกอฮอล์</div>
            <AlcoholSection sex={sex} error={e?.alcohol?.[0]}
              initial={initial ? { drinks: yn(initial.drinksAlcohol), binge: yn(initial.bingeDrinking), regular: yn(initial.regularHeavyDrinking) } : undefined} />
          </section>

          <section>
            <div className="sec-title"><span className="sec-num">3</span>อาการและปัจจัยกระตุ้น</div>
            {TRIGGERS.map((t) => (
              <div key={t.name}>
                <YesNo q={t.q} name={t.name} value={choice[t.name]} onPick={pick} />
                {t.note && choice[t.name] === "yes" && (
                  <div style={{ margin: "6px 0 10px" }}>
                    <label className="lbl" htmlFor={t.note}>{t.noteLabel}</label>
                    <input className="fld" id={t.note} name={t.note} maxLength={300} value={notes[t.note]}
                      onChange={(ev) => setNotes((n) => ({ ...n, [t.note!]: ev.target.value }))} />
                    {e?.[t.note] && <div className="err">{e[t.note]![0]}</div>}
                  </div>
                )}
              </div>
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
            <li>คะแนนความเสี่ยงจาก eGFR, BMI และการดื่มหนัก ถึงเกณฑ์ที่ รพ. กำหนดไหม</li>
            <li>อาเจียน ท้องเสีย หรือทานได้น้อยลง</li>
            <li>ยาแก้ปวด NSAIDs สมุนไพร หรืออาหารเสริม</li>
          </ul>
        </div>
        {e && <div className="err" role="alert">{e.form?.[0] ?? "กรุณาตรวจสอบข้อมูลที่ขึ้นสีแดง"}</div>}
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "กำลังประมวลผล…" : screeningId ? "บันทึกการแก้ไขและประมวลผลใหม่" : "ประมวลผลความเสี่ยง MALA"}
        </button>
        {screeningId ? (
          <Link href={`/screenings/${screeningId}`} className="btn-s">ยกเลิกการแก้ไข</Link>
        ) : (
          <Link href="/patients" className="btn-s">← กลับไปค้นหาผู้ป่วย</Link>
        )}
      </aside>
      {locked && (
        <Modal tone="warn" title="แก้ไขไม่ได้แล้ว" onClose={() => setClosedFor(state)}>
          <p>ผลประเมินนี้ยืนยันและส่งให้ รพ. แล้ว เจ้าหน้าที่ รพ.สต. จึงแก้ไขเองไม่ได้</p>
          <p>หากข้อมูลผิด กรุณาติดต่อ <b>{locked}</b> เพื่อให้ผู้ดูแลระบบแก้ไขให้ ระบบจะบันทึกประวัติการแก้ไขไว้ทุกครั้ง</p>
        </Modal>
      )}
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
