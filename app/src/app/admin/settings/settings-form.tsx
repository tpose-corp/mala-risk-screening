"use client";
// The /admin/settings form, laid out like the users page (full width, titled cards), with the
// same safety nets as the criteria page:
// - while something is changed and not saved, the save bar says so, and leaving the page asks first
// - "ยกเลิกการแก้ไข" puts everything back; "ใช้ข้อความเริ่มต้น" refills a message box
// - an empty box is marked, scrolled to, focused and shaken; the mark clears once it is filled
// - saving shows a review popup; switching a role off warns that those users are sent out at once
import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { UnsavedGuard } from "@/components/leave-guard";
import { Modal } from "@/components/ui/modal";
import { saveSettings } from "./actions";

export type SettingsValues = { pcuEnabled: boolean; clinicianEnabled: boolean; closedMessage: string; adminContact: string };
type Key = keyof SettingsValues;

const LABEL: Record<Key, string> = {
  pcuEnabled: "เจ้าหน้าที่ รพ.สต.",
  clinicianEnabled: "แพทย์และพยาบาล",
  closedMessage: "ข้อความเมื่อปิดระบบ",
  adminContact: "ช่องทางติดต่อผู้ดูแลระบบ",
};
const KEYS = Object.keys(LABEL) as Key[];
const onOff = (b: boolean) => (b ? "เปิด" : "ปิด");

export function SettingsForm({ saved, defaults, accounts }: {
  saved: SettingsValues;
  defaults: SettingsValues;
  accounts: { pcu: number; clinician: number; admin: number }; // active accounts per role
}) {
  const [state, action, pending] = useActionState(saveSettings, undefined);
  const [v, setV] = useState<SettingsValues>(saved);
  const [tried, setTried] = useState(false);
  const [serverErr, setServerErr] = useState<Record<string, string>>({});
  const [review, setReview] = useState<FormData | null>(null);
  const [askUndo, setAskUndo] = useState(false);
  const [jump, setJump] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  const changed = KEYS.filter((k) => (typeof v[k] === "string" ? String(v[k]).trim() : v[k]) !== saved[k]);
  const dirty = changed.length > 0;
  const live: Record<string, string> = {};
  if (!v.closedMessage.trim()) live.closedMessage = "กรุณากรอกข้อความ หรือกด \"ใช้ข้อความเริ่มต้น\"";
  if (!v.adminContact.trim()) live.adminContact = "กรุณากรอกช่องทางติดต่อ หรือกด \"ใช้ข้อความเริ่มต้น\"";
  const errOf = (k: string) => (tried ? live[k] : undefined) ?? serverErr[k];

  // a new answer from the server: show its errors on the boxes and go to the first one
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state?.errors) { setServerErr(state.errors); setJump((n) => n + 1); }
  }
  useEffect(() => {
    if (!jump) return;
    const first = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (!first) return;
    const box = (first.closest(".set-field") ?? first.parentElement) as HTMLElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    box.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    box.classList.remove("err-flash");
    void box.offsetWidth; // restart the animation
    box.classList.add("err-flash");
    first.focus({ preventScroll: true });
  }, [jump]);

  const set = <K extends Key>(k: K, val: SettingsValues[K]) => {
    setV((o) => ({ ...o, [k]: val }));
    setServerErr((e) => { if (!(k in e)) return e; const n = { ...e }; delete n[k]; return n; });
  };

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTried(true);
    if (Object.keys(live).length) { setJump((n) => n + 1); return; }
    setReview(new FormData(e.currentTarget));
  }
  function confirmSave() {
    const fd = review!;
    setReview(null);
    startTransition(() => action(fd));
  }
  function undoAll() { setV(saved); setTried(false); setServerErr({}); setAskUndo(false); }

  const roleRow = (k: "pcuEnabled" | "clinicianEnabled", what: string, count: number) => (
    <label className={`set-role${changed.includes(k) ? " changed" : ""}`}>
      <span className="set-role-text">
        <b>{LABEL[k]}</b>
        <span>{what}</span>
        <span className="set-role-count">บัญชีที่ใช้งานอยู่ {count} บัญชี</span>
      </span>
      <span className={`ui-badge ${v[k] ? "ok" : "muted"}`}>{v[k] ? "เปิดใช้งาน" : "ปิดอยู่"}</span>
      <input type="checkbox" className="ui-toggle" name={k} checked={v[k]} onChange={(e) => set(k, e.target.checked)} aria-label={`${LABEL[k]} เข้าใช้ระบบได้`} />
    </label>
  );

  const textField = (k: "closedMessage" | "adminContact", label: string, hint: string, max: number, multi: boolean, placeholder?: string) => {
    const err = errOf(k);
    const common = {
      className: `fld${err ? " bad" : ""}`, id: k, name: k, maxLength: max, placeholder, value: v[k],
      "aria-invalid": !!err, "aria-describedby": `${k}-msg`,
    };
    return (
      <div className="set-field">
        <div className="set-field-head">
          <label className="lbl" htmlFor={k}>{label}</label>
          {v[k] !== defaults[k] && <button type="button" className="ui-link-btn sm" onClick={() => set(k, defaults[k])}>ใช้ข้อความเริ่มต้น</button>}
        </div>
        {multi
          ? <textarea {...common} rows={3} style={{ height: "auto", resize: "vertical" }} onChange={(e) => set(k, e.target.value)} />
          : <input {...common} onChange={(e) => set(k, e.target.value)} />}
        <div id={`${k}-msg`} className="set-field-foot">
          {err ? <span className="err" style={{ margin: 0 }}>{err}</span> : changed.includes(k) ? <span className="set-was">ยังไม่ได้บันทึก</span> : <span className="ui-hint">{hint}</span>}
          <span className="ui-hint">{v[k].length}/{max}</span>
        </div>
      </div>
    );
  };

  // users who are sent out the moment this is saved
  const turningOff = (["pcuEnabled", "clinicianEnabled"] as const).filter((k) => saved[k] && !v[k]);
  const formMsg = state?.form && !state.errors ? state.form : null;

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="set-form">
      <UnsavedGuard armed={dirty && !pending && !review} />
      <div className="set-grid">
        <section className="ui-card">
          <div className="ui-card-head">
            <div className="ui-card-title">การเข้าใช้งานตามบทบาท</div>
          </div>
          <div className="set-roles">
            {roleRow("pcuEnabled", "คัดกรองผู้ป่วยและบันทึกผล", accounts.pcu)}
            {roleRow("clinicianEnabled", "ดูข้อมูลและรับเรื่องแจ้งเตือนจาก รพ.สต.", accounts.clinician)}
            <div className="set-role locked">
              <span className="set-role-text">
                <b>ผู้ดูแลระบบ</b>
                <span>เข้าได้เสมอ เพื่อให้เปิดระบบกลับได้</span>
                <span className="set-role-count">บัญชีที่ใช้งานอยู่ {accounts.admin} บัญชี</span>
              </span>
              <span className="ui-badge acc">เปิดเสมอ</span>
              <input type="checkbox" className="ui-toggle" checked disabled aria-label="ผู้ดูแลระบบเข้าใช้ระบบได้เสมอ" />
            </div>
          </div>
          <p className="set-note">ปิดแล้วข้อมูลไม่หาย ผู้ใช้บทบาทนั้นจะเห็นข้อความเมื่อปิดระบบแทนหน้าปกติ จนกว่าจะเปิดอีกครั้ง</p>
        </section>

        <section className="ui-card">
          <div className="ui-card-head">
            <div className="ui-card-title">ข้อความถึงผู้ใช้</div>
          </div>
          <div className="set-texts">
            {textField("closedMessage", "ข้อความที่แสดงเมื่อปิดระบบ *", "ผู้ใช้บทบาทที่ถูกปิดจะเห็นข้อความนี้", 300, true)}
            {textField("adminContact", "ช่องทางติดต่อผู้ดูแลระบบ *", "แสดงเมื่อผู้ใช้ต้องการแก้ผลที่ยืนยันแล้ว แต่แก้เองไม่ได้", 200, false, "เช่น ศูนย์ข้อมูลยา โทร 0xx-xxx-xxxx ต่อ xxx")}
          </div>
        </section>
      </div>

      {formMsg && <div className="flash bad" role="alert">{formMsg}</div>}
      <div className={`ui-savebar${dirty ? " set-dirty" : ""}`}>
        {dirty ? (
          <span className="set-unsaved"><b>ยังไม่ได้บันทึก</b> แก้ไขแล้ว {changed.length} รายการ กดบันทึกก่อนออกจากหน้านี้ ไม่อย่างนั้นการแก้ไขจะหายไป</span>
        ) : (
          <span className="ui-hint">การเปลี่ยนแปลงมีผลทันทีหลังบันทึก</span>
        )}
        <button type="button" className="ui-btn secondary" disabled={!dirty || pending} onClick={() => setAskUndo(true)}>ยกเลิกการแก้ไข</button>
        <button className="ui-btn primary" type="submit" disabled={!dirty || pending}>{pending ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}</button>
      </div>

      {askUndo && (
        <Modal title="ยกเลิกการแก้ไขทั้งหมด?" tone="warn" onClose={() => setAskUndo(false)} closeLabel="แก้ไขต่อ" closePrimary
          actions={<button type="button" className="ui-btn secondary" onClick={undoAll}>ยกเลิกการแก้ไข</button>}>
          <p>ทุกช่องจะกลับเป็นค่าที่บันทึกไว้ล่าสุด</p>
        </Modal>
      )}
      {review && (
        <Modal title="ตรวจสอบก่อนบันทึกการตั้งค่า" tone={turningOff.length ? "warn" : undefined} closePrimary={turningOff.length > 0} onClose={() => setReview(null)} closeLabel="กลับไปแก้ไข"
          actions={<button type="button" className={`ui-btn ${turningOff.length ? "secondary" : "primary"}`} onClick={confirmSave}>{turningOff.length ? "ยืนยันปิดการใช้งาน" : "ยืนยันบันทึก"}</button>}>
          <p>การตั้งค่ามีผลทันทีหลังบันทึก</p>
          <dl className="ui-review">
            {changed.map((k) => {
              const was = saved[k], now = v[k];
              return (
                <div key={k} style={{ display: "contents" }}>
                  <dt>{LABEL[k]}</dt>
                  <dd>{typeof was === "boolean"
                    ? <><span className="ui-review-old">{onOff(was)}</span> → {onOff(now as boolean)}</>
                    : <><span className="ui-review-old">{was}</span><br />{String(now).trim()}</>}</dd>
                </div>
              );
            })}
          </dl>
          {turningOff.length > 0 && (
            <p className="set-warn">
              {turningOff.map((k) => `${LABEL[k]} ${k === "pcuEnabled" ? accounts.pcu : accounts.clinician} บัญชี`).join(" และ ")}
              {" "}จะใช้ระบบไม่ได้ทันทีหลังบันทึก คนที่กำลังใช้งานอยู่จะถูกพาไปหน้าปิดระบบเมื่อกดครั้งถัดไป งานที่ยังไม่ได้บันทึกจะหายไป
            </p>
          )}
        </Modal>
      )}
    </form>
  );
}
