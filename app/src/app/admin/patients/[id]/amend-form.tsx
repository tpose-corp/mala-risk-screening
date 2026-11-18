"use client";
// "แก้ไขผลคัดกรอง" on the admin patient page, built like the patient edit card (patient-edit.tsx):
// - yes/no answers as two buttons instead of dropdowns, grouped as on the screening form
// - every changed box is marked with its old value and "คืนค่าเดิม"
// - one footer: how many boxes changed, "ยกเลิก", "ตรวจสอบและบันทึก" (only when something changed)
// - a wrong or empty box is scrolled to, focused and shaken
// - a review popup shows old → new and the reason before anything is saved
// - leaving with unsaved changes asks first (UnsavedGuard)
// It posts the same fields to the same server action (amendScreening), which checks everything again
// and re-scores with the screening's own criteria version.
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { UnsavedGuard } from "@/components/leave-guard";
import { Modal } from "@/components/ui/modal";

const NUM = ["weightKg", "heightCm", "egfr", "doseMgDay"] as const;
const BOOL = ["drinksAlcohol", "bingeDrinking", "regularHeavyDrinking", "vomiting", "lowIntake", "nsaid", "herbal"] as const;
const NOTE = ["nsaidNote", "herbalNote"] as const;
type Num = (typeof NUM)[number];
type Bool = (typeof BOOL)[number];
type Note = (typeof NOTE)[number];
type Key = Num | Bool | Note;
export type AmendValues = Record<Num, number> & Record<Bool, boolean> & Record<Note, string | null>;

const LABEL: Record<Key, string> = {
  weightKg: "น้ำหนัก (กก.)", heightCm: "ส่วนสูง (ซม.)", egfr: "eGFR (mL/min/1.73m²)", doseMgDay: "ขนาดยา Metformin (มก./วัน)",
  drinksAlcohol: "ดื่มแอลกอฮอล์", bingeDrinking: "ดื่มหนักในครั้งเดียว", regularHeavyDrinking: "ดื่มหนักต่อเนื่อง",
  vomiting: "อาเจียนหรือท้องเสีย", lowIntake: "ทานได้น้อยลง 1–2 วัน", nsaid: "ยาแก้ปวด / ยาชุด", herbal: "สมุนไพร / อาหารเสริม",
  nsaidNote: "ชื่อยาที่ระบุ", herbalNote: "สมุนไพรที่ระบุ",
};
// the same ranges the server accepts (amendScreening)
const RANGE: Record<Num, [number, number, string]> = {
  weightKg: [0.1, 300, "น้ำหนักต้องมากกว่า 0 และไม่เกิน 300 กก."],
  heightCm: [50, 250, "ส่วนสูงต้องอยู่ระหว่าง 50 ถึง 250 ซม."],
  egfr: [0, 200, "eGFR ต้องอยู่ระหว่าง 0 ถึง 200"],
  doseMgDay: [1, 5000, "ขนาดยาต้องมากกว่า 0 และไม่เกิน 5000 มก./วัน"],
};

type Form = Record<Num, string> & Record<Bool, boolean> & Record<Note, string>;
const toForm = (s: AmendValues): Form => ({
  weightKg: String(s.weightKg), heightCm: String(s.heightCm), egfr: String(s.egfr), doseMgDay: String(s.doseMgDay),
  drinksAlcohol: s.drinksAlcohol, bingeDrinking: s.bingeDrinking, regularHeavyDrinking: s.regularHeavyDrinking,
  vomiting: s.vomiting, lowIntake: s.lowIntake, nsaid: s.nsaid, herbal: s.herbal,
  nsaidNote: s.nsaidNote ?? "", herbalNote: s.herbalNote ?? "",
});
const shown = (v: string | boolean) => (typeof v === "boolean" ? (v ? "ใช่" : "ไม่ใช่") : v.trim() === "" ? "ว่าง" : v.trim());
const same = (k: Key, a: string | boolean, b: string | boolean) =>
  (NUM as readonly string[]).includes(k) ? Number(a) === Number(b) : typeof a === "string" ? a.trim() === String(b).trim() : a === b;

export function AmendScreeningForm({ screening, title, facility, ruleVersion, action, backTo, cancelHref, serverError }: {
  screening: AmendValues;
  title: string;
  facility: string;
  ruleVersion: string;
  action: (fd: FormData) => void;
  backTo: string;
  cancelHref: string;
  serverError?: string;
}) {
  const start = toForm(screening);
  const [v, setV] = useState<Form>(start);
  const [reason, setReason] = useState("");
  const [tried, setTried] = useState(false);
  const [review, setReview] = useState(false);
  const [sending, setSending] = useState(false);
  const [jump, setJump] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  // answers that no longer apply are not counted (the server clears them too)
  const effective = (f: Form): Form => ({
    ...f,
    bingeDrinking: f.drinksAlcohol && f.bingeDrinking, regularHeavyDrinking: f.drinksAlcohol && f.regularHeavyDrinking,
    nsaidNote: f.nsaid ? f.nsaidNote : "", herbalNote: f.herbal ? f.herbalNote : "",
  });
  const now = effective(v), was = effective(start);
  const keys = [...NUM, ...BOOL, ...NOTE] as Key[];
  const changed = keys.filter((k) => !same(k, now[k], was[k]));
  const dirty = changed.length > 0 || reason.trim() !== "";

  const live: Partial<Record<Key | "reason", string>> = {};
  for (const k of NUM) {
    const n = Number(v[k]);
    if (v[k].trim() === "" || !Number.isFinite(n) || n < RANGE[k][0] || n > RANGE[k][1]) live[k] = RANGE[k][2];
  }
  if (!reason.trim()) live.reason = "กรุณากรอกเหตุผลที่แก้ไข";
  const errOf = (k: Key | "reason") => (tried ? live[k] : undefined);

  // the form opens from "แก้ไขผล" further down the page: glide it into view (no jump)
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(() => document.getElementById("amend")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }), 60);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!jump) return;
    const first = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (!first) return;
    const box = (first.closest(".pe-field") ?? first) as HTMLElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    box.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    box.classList.remove("err-flash");
    void box.offsetWidth;
    box.classList.add("err-flash");
    first.focus({ preventScroll: true });
  }, [jump]);

  const set = <K extends Key>(k: K, val: Form[K]) => setV((o) => ({ ...o, [k]: val }));
  const undo = (k: Key) => set(k, start[k]);

  function check() {
    setTried(true);
    if (Object.keys(live).length) { setJump((n) => n + 1); return; }
    setReview(true);
  }
  function confirm() {
    setReview(false);
    setSending(true);
    formRef.current?.requestSubmit();
  }

  // a box with its label, old value and "คืนค่าเดิม" when changed, and its problem
  const field = (k: Key, input: ReactNode, cls = "") => {
    const err = errOf(k);
    const isChanged = changed.includes(k);
    return (
      <div className={`pe-field ${cls}${isChanged ? " changed" : ""}`}>
        <label className="lbl" htmlFor={`am-${k}`}>{LABEL[k]}</label>
        {input}
        {err && <div className="err">{err}</div>}
        {isChanged && (
          <div className="pe-was">
            <span>เดิม {shown(was[k])}</span>
            <button type="button" className="ui-link-btn" onClick={() => undo(k)}>คืนค่าเดิม</button>
          </div>
        )}
      </div>
    );
  };
  const num = (k: Num, step: string) => field(k, (
    <input className={`fld${errOf(k) ? " bad" : ""}`} id={`am-${k}`} name={k} type="number" inputMode="decimal" step={step}
      value={v[k]} aria-invalid={!!errOf(k)} onChange={(e) => set(k, e.target.value)} />
  ));
  const yesNo = (k: Bool, off = false) => {
    const isChanged = changed.includes(k);
    return (
      <div className={`am-row${isChanged ? " changed" : ""}${off ? " am-off" : ""}`}>
        <div className="am-q">
          <span id={`am-${k}-l`}>{LABEL[k]}</span>
          {isChanged && (
            <div className="pe-was">
              <span>เดิม {shown(was[k])}</span>
              <button type="button" className="ui-link-btn" onClick={() => undo(k)}>คืนค่าเดิม</button>
            </div>
          )}
        </div>
        <input type="hidden" name={k} value={v[k] ? "yes" : "no"} />
        <div className="pe-seg" role="radiogroup" aria-labelledby={`am-${k}-l`} id={`am-${k}`}>
          {([["ไม่ใช่", false], ["ใช่", true]] as const).map(([l, val]) => (
            <button key={l} type="button" role="radio" aria-checked={v[k] === val} disabled={off}
              className={v[k] === val ? "on" : ""} onClick={() => set(k, val)}>{l}</button>
          ))}
        </div>
      </div>
    );
  };
  // the name box slides open under its question when the answer is ใช่ (same motion as the patient card)
  const note = (k: Note, show: boolean) => {
    const isChanged = show && changed.includes(k);
    return (
      <div className={`pe-slide${show ? " open" : ""}`} inert={!show}>
        <div>
          <div className={`am-note${isChanged ? " changed" : ""}`}>
            <input className="fld" id={`am-${k}`} name={k} value={v[k]} maxLength={300} autoComplete="off" aria-label={LABEL[k]}
              placeholder={k === "nsaidNote" ? "ชื่อยาและแหล่งที่ซื้อ (ถ้าทราบ)" : "ชื่อสมุนไพรและแหล่งที่ได้มา (ถ้าทราบ)"} onChange={(e) => set(k, e.target.value)} />
            {isChanged && (
              <div className="pe-was">
                <span>เดิม {shown(was[k])}</span>
                <button type="button" className="ui-link-btn" onClick={() => undo(k)}>คืนค่าเดิม</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section id="amend" className="ui-card pe-card editing am-card">
      <UnsavedGuard armed={dirty && !sending && !review} />
      <div className="ui-card-head">
        <div className="ui-card-title">{title}<span className="ui-card-count">{facility}</span></div>
        <span className="ui-card-count">คำนวณใหม่ด้วยเกณฑ์เดิม {ruleVersion} ค่าเดิมเก็บไว้ในประวัติการแก้ไข</span>
      </div>
      <form ref={formRef} action={action} noValidate className="pe-form" onSubmit={() => setSending(true)}
        onKeyDown={(e) => { if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") { e.preventDefault(); check(); } }}>
        <input type="hidden" name="back" value={backTo} />
        {serverError && <div className="err" role="alert">{serverError}</div>}

        <div className="am-sec"><span className="sec-num">1</span>ค่าที่วัด</div>
        <div className="am-grid">
          {num("weightKg", "0.1")}
          {num("heightCm", "0.1")}
          {num("egfr", "0.1")}
          {num("doseMgDay", "250")}
        </div>

        <div className="am-cols">
          <div>
            <div className="am-sec"><span className="sec-num">2</span>การดื่มแอลกอฮอล์</div>
            {yesNo("drinksAlcohol")}
            {yesNo("bingeDrinking", !v.drinksAlcohol)}
            {yesNo("regularHeavyDrinking", !v.drinksAlcohol)}
            <div className="pe-field am-reason">
              <label className="lbl" htmlFor="am-reason">เหตุผลที่แก้ไข *</label>
              <input className={`fld${errOf("reason") ? " bad" : ""}`} id="am-reason" name="reason" value={reason} maxLength={300} autoComplete="off"
                placeholder="เช่น รพ.สต. โทรแจ้งว่ากรอก eGFR ผิด" aria-invalid={!!errOf("reason")} onChange={(e) => setReason(e.target.value)} />
              {errOf("reason") && <div className="err">{errOf("reason")}</div>}
            </div>
          </div>
          <div>
            <div className="am-sec"><span className="sec-num">3</span>อาการและปัจจัยกระตุ้น</div>
            {yesNo("vomiting")}
            {yesNo("lowIntake")}
            {yesNo("nsaid")}
            {note("nsaidNote", v.nsaid)}
            {yesNo("herbal")}
            {note("herbalNote", v.herbal)}
          </div>
        </div>

        <div className="pe-bar">
          <span className={changed.length ? "pe-count on" : "pe-count"}>{changed.length ? `แก้ไขแล้ว ${changed.length} ช่อง ยังไม่ได้บันทึก` : "ยังไม่ได้แก้ช่องใด"}</span>
          <Link href={cancelHref} className="ui-btn secondary">ยกเลิก</Link>
          <button type="button" className="ui-btn primary" disabled={!changed.length || sending} onClick={check}>{sending ? "กำลังบันทึก..." : "ตรวจสอบและบันทึก"}</button>
        </div>
      </form>

      {review && (
        <Modal title="ตรวจสอบการแก้ไขผลคัดกรอง" onClose={() => setReview(false)} closeLabel="กลับไปแก้ไข"
          actions={<button type="button" className="ui-btn primary" onClick={confirm}>ยืนยันบันทึก</button>}>
          <p>ระบบจะคำนวณผลใหม่ด้วยเกณฑ์ {ruleVersion} และเก็บค่าเดิมไว้ในประวัติการแก้ไข</p>
          <dl className="ui-review">
            {changed.map((k) => (
              <div key={k} style={{ display: "contents" }}>
                <dt>{LABEL[k]}</dt>
                <dd><span className="ui-review-old">{shown(was[k])}</span> → {shown(now[k])}</dd>
              </div>
            ))}
            <dt>เหตุผล</dt><dd>{reason}</dd>
          </dl>
        </Modal>
      )}
    </section>
  );
}
