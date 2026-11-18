"use client";
// The "ข้อมูลผู้ป่วย" card on the admin patient page: the details at a glance, and the same card
// turning into the edit form (a soft slide, not a jump) with the same inputs as "เพิ่มผู้ป่วย":
// - date of birth with the day / Thai month / พ.ศ. year picker and calendar (DobPicker)
// - ID card typed with its dashes, sex as two buttons
// - every changed box is marked with its old value and "คืนค่าเดิม"
// - one footer: how many boxes changed, "ยกเลิก", "ตรวจสอบและบันทึก" (only when something changed)
// - a wrong or empty box is scrolled to, focused and shaken; the mark clears once fixed
// - a review popup shows old → new and the reason before anything is saved
// - leaving with unsaved changes asks first (UnsavedGuard)
// It still posts to the same server action (updatePatient), which checks everything again.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { DobPicker } from "@/components/dob-picker";
import { UnsavedGuard } from "@/components/leave-guard";
import { PencilIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { LIMITS, THAI_MONTHS_FULL, ageFromThaiDob, cardIdChecksumOk, formatCardId, formatPhone, hnProblem, nameProblem, normalizeCardId, phoneDigits, phoneProblem, typePhone } from "@/lib/format";

type Values = { name: string; cardId: string; hn: string; dob: string; sex: string; phone: string; facility: string };
type Key = keyof Values;
const LABEL: Record<Key, string> = {
  name: "ชื่อ–นามสกุล", cardId: "เลขประจำตัวประชาชน", hn: "HN", dob: "วันเกิด", sex: "เพศ", phone: "เบอร์โทรศัพท์", facility: "หน่วยบริการประจำ",
};
const KEYS = Object.keys(LABEL) as Key[];
// the server's ?err= codes → the box they belong to
const ERR_BOX: Record<string, Key> = { name: "name", dob: "dob", sex: "sex", card: "cardId", carddup: "cardId", hn: "hn", hndup: "hn", phone: "phone" };

const digits = (s: string) => normalizeCardId(s);
// "1234567890123" → "1-2345-67890-12-3" while typing
const typeCardId = (raw: string) => {
  const d = digits(raw).slice(0, 13);
  const parts = [d.slice(0, 1), d.slice(1, 5), d.slice(5, 10), d.slice(10, 12), d.slice(12, 13)].filter(Boolean);
  return parts.join("-");
};
const dobWords = (dob: string) => {
  const m = dob.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${Number(m[1])} ${THAI_MONTHS_FULL[Number(m[2]) - 1]} ${m[3]}` : dob;
};
const shown = (k: Key, v: string) => (v === "" ? "ว่าง" : k === "dob" ? dobWords(v) : k === "cardId" ? formatCardId(digits(v)) : k === "phone" ? formatPhone(v) : v);

export function PatientEditCard({ patient, facilities, action, backTo, serverError, actions, notice }: {
  patient: Values;
  facilities: string[];
  action: (fd: FormData) => void;
  backTo: string;
  serverError?: { code: string; message: string };
  actions: ReactNode; // the on/off control, in the card head while not editing
  notice?: ReactNode; // what the admin must do first (the identity check), at the top of the card
}) {
  const start: Values = { ...patient, cardId: typeCardId(patient.cardId) };
  const errBox = serverError ? ERR_BOX[serverError.code] : undefined;
  const [editing, setEditing] = useState(!!errBox);
  const [v, setV] = useState<Values>(start);
  const [reason, setReason] = useState("");
  const [tried, setTried] = useState(false);
  const [serverErr, setServerErr] = useState<Partial<Record<Key, string>>>(errBox ? { [errBox]: serverError!.message } : {});
  const [review, setReview] = useState(false);
  const [sending, setSending] = useState(false);
  const [jump, setJump] = useState(errBox ? 1 : 0);
  const [dobKey, setDobKey] = useState(0); // remount the date picker when its value is reset
  const formRef = useRef<HTMLFormElement>(null);

  // phone compared by its digits: "0812345678" and "081-234-5678" are the same number
  const norm = (x: Values) => ({ ...x, name: x.name.trim(), cardId: digits(x.cardId), hn: x.hn.trim(), phone: phoneDigits(x.phone) });
  const now = norm(v), was = norm(start);
  const changed = KEYS.filter((k) => now[k] !== was[k]);
  const dirty = changed.length > 0 || reason.trim() !== "";

  const live: Partial<Record<Key | "reason", string>> = {};
  if (!now.name) live.name = "กรุณากรอกชื่อ–นามสกุล";
  else if (nameProblem(now.name)) live.name = nameProblem(now.name)!;
  if (now.cardId.length !== 13) live.cardId = `ต้องมี 13 หลัก (กรอกแล้ว ${now.cardId.length} หลัก)`;
  if (!now.dob) live.dob = "กรุณากรอกวันเกิดให้ครบ ทั้งวัน เดือน และปี พ.ศ.";
  if (now.hn && hnProblem(now.hn)) live.hn = hnProblem(now.hn)!;
  if (now.phone !== was.phone && phoneProblem(v.phone)) live.phone = phoneProblem(v.phone)!;
  if (!reason.trim()) live.reason = "กรุณากรอกเหตุผลที่แก้ไข";
  const errOf = (k: Key | "reason") => (tried ? live[k] : undefined) ?? (k !== "reason" ? serverErr[k] : undefined);

  useEffect(() => {
    if (!jump) return;
    const first = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], .dob-box.bad');
    if (!first) return;
    const box = (first.closest(".pe-field") ?? first) as HTMLElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    box.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    box.classList.remove("err-flash");
    void box.offsetWidth;
    box.classList.add("err-flash");
    (box.querySelector<HTMLElement>("input:not([type=hidden]), select") ?? first).focus({ preventScroll: true });
  }, [jump]);

  const set = (k: Key, val: string) => {
    setV((o) => ({ ...o, [k]: val }));
    setServerErr((e) => { const n = { ...e }; delete n[k]; return n; });
  };
  const undo = (k: Key) => { set(k, start[k]); if (k === "dob") setDobKey((n) => n + 1); };
  const cancel = () => { setV(start); setReason(""); setTried(false); setServerErr({}); setDobKey((n) => n + 1); setEditing(false); };

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
        {k !== "dob" && <label className="lbl" htmlFor={`pe-${k}`}>{LABEL[k]}{k === "name" || k === "cardId" ? " *" : ""}</label>}
        {input}
        {err && k !== "dob" && <div className="err">{err}</div>}
        {err && k === "dob" && serverErr.dob && <div className="err">{serverErr.dob}</div>}
        {isChanged && (
          <div className="pe-was">
            <span>เดิม {shown(k, start[k])}</span>
            <button type="button" className="ui-link-btn" onClick={() => undo(k)}>คืนค่าเดิม</button>
          </div>
        )}
      </div>
    );
  };
  const text = (k: Key, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input className={`fld${errOf(k) ? " bad" : ""}`} id={`pe-${k}`} value={v[k]} autoComplete="off" aria-invalid={!!errOf(k)}
      onChange={(e) => set(k, k === "cardId" ? typeCardId(e.target.value) : k === "phone" ? typePhone(e.target.value) : e.target.value)} {...extra} />
  );

  const facts: [string, ReactNode, string?][] = [
    ["เลขประจำตัวประชาชน", formatCardId(patient.cardId), "mono"],
    ["HN", patient.hn || <span className="pa-none">ยังไม่มี</span>, patient.hn ? "mono" : ""],
    ["หน่วยบริการประจำ", patient.facility || <span className="pa-none">ยังไม่มี</span>],
    ["วันเกิด", <>{dobWords(patient.dob)} <span className="pa-none">({ageFromThaiDob(patient.dob)} ปี)</span></>],
    ["เพศ", patient.sex],
    ["เบอร์โทรศัพท์", patient.phone || <span className="pa-none">ไม่ได้ให้ไว้</span>],
  ];

  return (
    <section className={`ui-card pe-card${editing ? " editing" : ""}`}>
      <UnsavedGuard armed={editing && dirty && !sending && !review} />
      <div className="ui-card-head">
        <div className="ui-card-title">{editing ? "แก้ไขข้อมูลผู้ป่วย" : "ข้อมูลผู้ป่วย"}</div>
        {editing ? (
          <span className="ui-card-count">ค่าเดิมทุกช่องจะถูกเก็บไว้ในประวัติการแก้ไข</span>
        ) : (
          <div className="ui-card-actions pe-head-btns">
            <button type="button" className="ui-btn pe-btn pe-edit" onClick={() => setEditing(true)}><PencilIcon /> แก้ไขข้อมูล</button>
            {actions}
          </div>
        )}
      </div>

      {/* view ⇄ edit: both stay mounted and slide open / closed (grid rows 0fr ⇄ 1fr) */}
      <div className={`pe-slide${editing ? "" : " open"}`} inert={editing}>
        <div>
          {notice}
          <dl className="pa-facts">
            {facts.map(([l, val, cls]) => <div key={l}><dt>{l}</dt><dd className={cls}>{val}</dd></div>)}
          </dl>
        </div>
      </div>

      <div className={`pe-slide${editing ? " open" : ""}`} inert={!editing}>
        <div>
          <form ref={formRef} action={action} noValidate className="pe-form" onSubmit={() => setSending(true)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") { e.preventDefault(); check(); } }}>
            <input type="hidden" name="back" value={backTo} />
            <input type="hidden" name="cardId" value={now.cardId} />
            <input type="hidden" name="sex" value={v.sex} />
            <div className="pe-grid">
              {field("name", text("name", { name: "name", maxLength: LIMITS.name }), "s2")}
              {field("sex", (
                <div className="pe-seg" role="radiogroup" aria-label="เพศ">
                  {["หญิง", "ชาย"].map((x) => (
                    <button key={x} type="button" role="radio" aria-checked={v.sex === x} className={v.sex === x ? "on" : ""} onClick={() => set("sex", x)}>{x}</button>
                  ))}
                </div>
              ))}
              {field("cardId", (
                <>
                  {text("cardId", { inputMode: "numeric", maxLength: 17, className: `fld mono${errOf("cardId") ? " bad" : ""}` })}
                  {!errOf("cardId") && now.cardId.length === 13 && !cardIdChecksumOk(now.cardId) && <div className="ui-hint warn-text">เลขหลักสุดท้ายไม่ตรงตามสูตร ตรวจกับบัตรอีกครั้ง</div>}
                </>
              ))}
              {field("hn", text("hn", { name: "hn", maxLength: LIMITS.hn, className: `fld mono${errOf("hn") ? " bad" : ""}`, placeholder: "ยังไม่มี" }))}
              {field("phone", text("phone", { name: "phone", maxLength: LIMITS.phone, inputMode: "tel", placeholder: "ถ้ามี", className: `fld mono${errOf("phone") ? " bad" : ""}` }))}
              {field("dob", <DobPicker key={dobKey} initial={start.dob} error={errOf("dob")} onValue={(d) => setV((o) => (o.dob === d ? o : { ...o, dob: d }))} />, "s2")}
              {field("facility", (
                <select className="fld" id="pe-facility" name="facility" value={v.facility} onChange={(e) => set("facility", e.target.value)}>
                  <option value="">ยังไม่มี</option>
                  {[...new Set([...(patient.facility && !facilities.includes(patient.facility) ? [patient.facility] : []), ...facilities])].map((f) => (
                    <option key={f} value={f}>{f}{facilities.includes(f) ? "" : " (ปิดแล้ว)"}</option>
                  ))}
                </select>
              ))}
              <div className="pe-field s3">
                <label className="lbl" htmlFor="pe-reason">เหตุผลที่แก้ไข *</label>
                <input className={`fld${errOf("reason") ? " bad" : ""}`} id="pe-reason" name="reason" value={reason} maxLength={300} autoComplete="off"
                  placeholder="เช่น รพ.สต. แจ้งว่าพิมพ์วันเกิดผิด / ผู้ป่วยย้ายที่อยู่" aria-invalid={!!errOf("reason")} onChange={(e) => setReason(e.target.value)} />
                {errOf("reason") && <div className="err">{errOf("reason")}</div>}
              </div>
            </div>
            <div className="pe-bar">
              <span className={changed.length ? "pe-count on" : "pe-count"}>{changed.length ? `แก้ไขแล้ว ${changed.length} ช่อง ยังไม่ได้บันทึก` : "ยังไม่ได้แก้ช่องใด"}</span>
              <button type="button" className="ui-btn secondary" onClick={cancel}>ยกเลิก</button>
              <button type="button" className="ui-btn primary" disabled={!changed.length || sending} onClick={check}>{sending ? "กำลังบันทึก..." : "ตรวจสอบและบันทึก"}</button>
            </div>
          </form>
        </div>
      </div>

      {review && (
        <Modal title="ตรวจสอบการแก้ไขข้อมูลผู้ป่วย" onClose={() => setReview(false)} closeLabel="กลับไปแก้ไข"
          actions={<button type="button" className="ui-btn primary" onClick={confirm}>ยืนยันบันทึก</button>}>
          <p>ค่าเดิมจะถูกเก็บไว้ในประวัติการแก้ไขของผู้ป่วยรายนี้</p>
          <dl className="ui-review">
            {changed.map((k) => (
              <div key={k} style={{ display: "contents" }}>
                <dt>{LABEL[k]}</dt>
                <dd><span className="ui-review-old">{shown(k, was[k])}</span> → {shown(k, now[k])}</dd>
              </div>
            ))}
            <dt>เหตุผล</dt><dd>{reason}</dd>
          </dl>
          {changed.includes("facility") && <p className="uf-warn">ผู้ป่วยจะย้ายไปอยู่ในรายชื่อของ {now.facility || "ไม่มีหน่วยประจำ"} ทันที หน่วยเดิมจะไม่เห็นในรายชื่อแล้ว ผลคัดกรองเก่ายังบันทึกตามหน่วยที่ตรวจจริง</p>}
        </Modal>
      )}
    </section>
  );
}
