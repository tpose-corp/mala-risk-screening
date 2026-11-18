"use client";
// The screening form, following `thresholds/MALA_Screening_Checklist.docx` (items 5–13; items
// 1–4 come from the patient record). Client Component because the BMI and the eGFR meter update
// as you type. The alcohol part lives in alcohol-section.tsx.

import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/modal";
import { EgfrMeter } from "@/components/egfr-meter";
import { OpenCaseGuard, UnsavedGuard } from "@/components/leave-guard";
import { bmiOf } from "@/lib/rules";
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
  // Server errors, minus the fields the user has started fixing since (each red message goes away
  // as soon as that field is changed; the next submit checks everything again).
  const [edited, setEdited] = useState<Set<string>>(() => new Set());
  const [editedFor, setEditedFor] = useState(state);
  if (editedFor !== state) { setEditedFor(state); setEdited(new Set()); }
  const ALCOHOL_INPUTS = ["drinksAlcohol", "bingeDrinking", "regularHeavyDrinking", "drinkDays"];
  const errorKeysOf = (name: string) => (ALCOHOL_INPUTS.includes(name) ? ["alcohol", "drinksAlcohol"] : [name]);
  const rawErrors = state?.errors;
  const left = rawErrors ? Object.entries(rawErrors).filter(([k, v]) => v?.length && !edited.has(k)) : [];
  const e = left.length ? (Object.fromEntries(left) as typeof rawErrors) : undefined;
  const [closedFor, setClosedFor] = useState<typeof state>(undefined);
  const locked = state?.locked && closedFor !== state ? state.locked : null;
  const yn = (b: boolean | undefined) => (b ? "yes" : "no");

  // Controlled fields: React keeps each value in state, so the BMI / eGFR meter update live.
  // Height rarely changes, so it starts from last time (as in the hospital's demo); the rest
  // must be measured today, so they start empty with last time's value shown underneath.
  const [dirty, setDirty] = useState(false); // typed but not saved: warn before leaving
  const [weight, setWeight] = useState(initial ? String(initial.weightKg) : "");
  const [height, setHeight] = useState(initial ? String(initial.heightCm) : prev ? String(prev.heightCm) : "");
  // A new screening starts with last time's eGFR and dose (like height); staff change them if newer.
  const [egfr, setEgfr] = useState(initial ? String(initial.egfr) : prev ? String(prev.egfr) : "");
  const [dose, setDose] = useState(initial ? String(initial.doseMgDay) : prev ? String(prev.doseMgDay) : "");
  // Sections 2 and 3 start with NO answer picked (a new screening), so every question has to be
  // asked and answered; editing keeps the saved answers. The server also refuses a missing answer.
  const blank = (b: boolean | undefined) => (initial ? yn(b) : "");
  const [choice, setChoice] = useState<Record<string, string>>({
    vomiting: blank(initial?.vomiting), lowIntake: blank(initial?.lowIntake), nsaid: blank(initial?.nsaid), herbal: blank(initial?.herbal),
  });
  const [drinksAnswer, setDrinksAnswer] = useState(initial ? yn(initial.drinksAlcohol) : "");
  const answered = [drinksAnswer, choice.vomiting, choice.lowIntake, choice.nsaid, choice.herbal].filter(Boolean).length;
  const [notes, setNotes] = useState<Record<string, string>>({ nsaidNote: initial?.nsaidNote ?? "", herbalNote: initial?.herbalNote ?? "" });
  const pick = (name: string, value: string) => setChoice((c) => ({ ...c, [name]: value }));

  const w = Number(weight);
  const h = Number(height);
  const bmi = w > 0 && h > 0 ? bmiOf(w, h) : null;
  const egfrNum = egfr === "" ? null : Number(egfr);
  const last = (v: number, unit = "") => (prev ? `ครั้งก่อน ${v}${unit && ` ${unit}`} (${prev.date})` : undefined);
  // While a copied value is unchanged, say so, so nobody mistakes it for a new result.
  const copied = (now: string, v: number) => !initial && prev && now === String(v);
  const copiedHint = () => `ดึงค่าจากครั้งก่อน (${prev!.date}) ถ้ามีค่าใหม่ให้แก้ไข`;

  // "ประมวลผล" first shows a one-screen summary to check, because saving also alerts the hospital
  // at once when the case meets the criteria. The popup holds the exact FormData that will be
  // sent. If a required answer is missing, the form goes straight to the server instead, so the
  // usual red messages show (nobody confirms an incomplete form).
  const [review, setReview] = useState<FormData | null>(null);
  const [sending, setSending] = useState(false);
  // Re-enable only when the server sends a NEW answer (errors); an old error state must not count.
  const [sentFor, setSentFor] = useState(state);
  if (sending && sentFor !== state) { setSentFor(state); setSending(false); }
  function incomplete(fd: FormData) {
    const blank = (k: string) => String(fd.get(k) ?? "").trim() === "";
    if (["weightKg", "heightCm", "egfr", "doseMgDay"].some(blank)) return true;
    if (["drinksAlcohol", "vomiting", "lowIntake", "nsaid", "herbal"].some((k) => !fd.get(k))) return true;
    return fd.get("drinksAlcohol") === "yes" && (!fd.get("bingeDrinking") || !fd.get("regularHeavyDrinking"));
  }
  // When the server sends errors back: scroll to the first red field, put the cursor in it and
  // make it pop (shake + red glow), so nobody has to hunt for what is wrong.
  const formRef = useRef<HTMLFormElement>(null);
  const goToFirstError = () => {
    const form = formRef.current;
    const first = form?.querySelector<HTMLElement>('[aria-invalid="true"], .err:not([role="alert"])');
    if (!first) return;
    const box = (first.closest(".q-row, .alc, .field-box") ?? first.parentElement) as HTMLElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    box.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    box.classList.remove("err-flash");
    void box.offsetWidth; // restart the animation if it is already there
    box.classList.add("err-flash");
    box.querySelector<HTMLElement>("input:not([type=hidden]), select")?.focus({ preventScroll: true });
  };
  useEffect(() => { if (state?.errors) goToFirstError(); }, [state]);
  const errorCount = e ? Object.keys(e).filter((k) => k !== "form" && e[k]?.length).length : 0;

  function send(fd: FormData) {
    setSentFor(state);
    setSending(true);
    setDirty(false);
    startTransition(() => action(fd));
  }
  function onSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (pending || sending) return; // Enter pressed again while sending
    const fd = new FormData(ev.currentTarget);
    if (incomplete(fd)) return send(fd);
    setReview(fd);
  }
  function confirmSend() {
    if (!review || sending) return; // one click only
    const fd = review;
    setReview(null);
    send(fd);
  }

  return (
    <form ref={formRef} method="post" onSubmit={onSubmit} className="split" onInput={(ev) => {
      setDirty(true);
      const name = (ev.target as HTMLInputElement).name;
      const keys = name ? errorKeysOf(name).filter((k) => rawErrors?.[k] && !edited.has(k)) : [];
      if (keys.length) setEdited((s0) => new Set([...s0, ...keys]));
    }}>
      {/* editing an open case: leaving keeps it open, so warn as on steps 3 to 5; a new form: warn
          only when something was typed */}
      {screeningId !== null
        ? <OpenCaseGuard screeningId={screeningId} patientId={patientId} armed={!pending} />
        : <UnsavedGuard armed={dirty && !pending} />}
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
              <Field label="eGFR ล่าสุดจาก รพ. (mL/min/1.73m²) *" name="egfr" value={egfr} onChange={setEgfr} error={e?.egfr}
                hint={prev && copied(egfr, prev.egfr) ? copiedHint() : prev ? last(prev.egfr) : "ถ้ายังไม่มีค่า eGFR จะยังคัดกรองไม่ได้"} />
              <Field label="ขนาดยา Metformin ปัจจุบัน (มก./วัน)" name="doseMgDay" value={dose} onChange={setDose} error={e?.doseMgDay} step="250" hint={prev && copied(dose, prev.doseMgDay) ? copiedHint() : last(prev?.doseMgDay ?? 0, "มก./วัน")} />
            </div>
            {/* The eGFR date field was removed (staff only enter the latest value from the hospital).
                An older screening that has a date keeps it when edited. */}
            {initial?.egfrDate && <input type="hidden" name="egfrDate" value={initial.egfrDate} />}
            {egfrNum !== null && !Number.isNaN(egfrNum) && <EgfrMeter value={egfrNum} />}
          </section>

          <section>
            <div className="sec-title"><span className="sec-num">2</span>การดื่มแอลกอฮอล์</div>
            <AlcoholSection sex={sex} error={e?.alcohol?.[0] ?? (e?.drinksAlcohol ? "กรุณาเลือก ไม่ดื่ม หรือ ดื่ม" : undefined)} onAnswer={setDrinksAnswer}
              initial={initial ? { drinks: yn(initial.drinksAlcohol), binge: yn(initial.bingeDrinking), regular: yn(initial.regularHeavyDrinking) } : undefined} />
          </section>

          <section>
            <div className="sec-title"><span className="sec-num">3</span>อาการและปัจจัยกระตุ้น</div>
            {TRIGGERS.map((t) => (
              <div key={t.name}>
                <YesNo q={t.q} name={t.name} value={choice[t.name]} onPick={pick} error={e?.[t.name]?.[0]} />
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
        {e && (
          <button type="button" className="err-jump" role="alert" onClick={goToFirstError}>
            {e.form?.[0] ?? `กรอกไม่ครบหรือไม่ถูกต้อง ${errorCount} ช่อง`} <span>ไปที่ช่องนั้น ↑</span>
          </button>
        )}
        <div className={`answered${answered === 5 ? " done" : ""}`}>
          {answered === 5 ? "✓ ตอบคำถามส่วนที่ 2 และ 3 ครบ 5 ข้อแล้ว" : `ตอบคำถามส่วนที่ 2 และ 3 แล้ว ${answered}/5 ข้อ`}
        </div>
        <button className="btn" type="submit" disabled={pending || sending}>
          {pending || sending ? "กำลังประมวลผล…" : screeningId ? "บันทึกการแก้ไขและประมวลผลใหม่" : "ประมวลผลความเสี่ยง MALA"}
        </button>
        {screeningId ? (
          <Link href={`/screenings/${screeningId}`} className="btn-s">ยกเลิกการแก้ไข</Link>
        ) : (
          <Link href="/patients" className="btn-s">← กลับไปค้นหาผู้ป่วย</Link>
        )}
      </aside>
      {review && <ReviewPopup fd={review} editing={screeningId !== null} onBack={() => setReview(null)} onConfirm={confirmSend} />}
      {locked && (
        <Modal tone="warn" title="แก้ไขไม่ได้แล้ว" onClose={() => setClosedFor(state)}>
          <p>ผลประเมินนี้ยืนยันปิดเคสแล้ว เจ้าหน้าที่ รพ.สต. จึงแก้ไขเองไม่ได้</p>
          <p>หากข้อมูลผิด กรุณาติดต่อ <b>{locked}</b> เพื่อให้ผู้ดูแลระบบแก้ไขให้ ระบบจะบันทึกประวัติการแก้ไขไว้ทุกครั้ง</p>
        </Modal>
      )}
    </form>
  );
}

// The "check before saving" popup: everything entered, in 6 short rows.
function ReviewPopup({ fd, editing, onBack, onConfirm }: { fd: FormData; editing: boolean; onBack: () => void; onConfirm: () => void }) {
  const v = (k: string) => String(fd.get(k) ?? "").trim();
  const yes = (k: string) => fd.get(k) === "yes";
  const w = Number(v("weightKg")), h = Number(v("heightCm"));
  const alcohol = !yes("drinksAlcohol")
    ? "ไม่ดื่ม"
    : `ดื่ม (หนักในครั้งเดียว: ${yes("bingeDrinking") ? "ใช่" : "ไม่ใช่"}, หนักต่อเนื่อง: ${yes("regularHeavyDrinking") ? "ใช่" : "ไม่ใช่"})`;
  const symptoms = [yes("vomiting") && "อาเจียนหรือท้องเสีย", yes("lowIntake") && "ทานได้น้อยลง"].filter(Boolean).join(", ");
  const products = [
    yes("nsaid") && `ยาแก้ปวด/ยาชุด${v("nsaidNote") ? ` (${v("nsaidNote")})` : ""}`,
    yes("herbal") && `สมุนไพร/อาหารเสริม${v("herbalNote") ? ` (${v("herbalNote")})` : ""}`,
  ].filter(Boolean).join(", ");
  return (
    <Modal title={editing ? "ตรวจสอบก่อนบันทึกการแก้ไข" : "ตรวจสอบก่อนประมวลผล"} onClose={onBack} closeLabel="กลับไปแก้ไข"
      actions={<button type="button" className="ui-btn primary" onClick={onConfirm}>ยืนยันและประมวลผล</button>}>
      <p>เมื่อกดยืนยัน ระบบจะบันทึกผลทันที และถ้าเข้าเกณฑ์จะแจ้ง รพ. ทันที กรุณาตรวจข้อมูลให้ถูกต้อง</p>
      <dl className="ui-review">
        <dt>น้ำหนัก / ส่วนสูง</dt><dd>{v("weightKg")} กก. / {v("heightCm")} ซม. {w > 0 && h > 0 && <span className="muted-inline">(BMI {bmiOf(w, h).toFixed(1)})</span>}</dd>
        <dt>eGFR ล่าสุดจาก รพ.</dt><dd>{v("egfr")}</dd>
        <dt>ขนาดยา Metformin</dt><dd>{v("doseMgDay")} มก./วัน</dd>
        <dt>แอลกอฮอล์</dt><dd>{alcohol}</dd>
        <dt>อาการ</dt><dd className={symptoms ? undefined : "muted-inline"}>{symptoms || "ไม่พบ"}</dd>
        <dt>ยา / สมุนไพร</dt><dd className={products ? undefined : "muted-inline"}>{products || "ไม่พบ"}</dd>
      </dl>
      <p className="ui-hint">แก้ไขได้ภายหลังจนกว่าจะยืนยันปิดเคส</p>
    </Modal>
  );
}

// One checklist question with two answers. The radio `name` is what the server reads.
function YesNo(props: {
  q: string;
  name: string;
  value: string;
  onPick: (name: string, value: string) => void;
  error?: string;
}) {
  const [noLabel, yesLabel] = ["ไม่ใช่", "ใช่"];
  const bad = !!props.error && !props.value;
  return (
    <div className={`kv q-row${bad ? " q-bad" : ""}`}>
      <span className="k">{props.q}{bad && <small className="err q-err">{props.error}</small>}</span>
      <div className="seg" style={{ width: 150, flexShrink: 0 }} role="radiogroup" aria-label={props.q} aria-invalid={bad || undefined}>
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
    <div className="field-box">
      <label className="lbl" htmlFor={props.name}>{props.label}</label>
      <input
        className={`fld${props.error ? " bad" : ""}`}
        aria-invalid={props.error ? true : undefined}
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
