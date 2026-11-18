"use client";
// The criteria form on /admin/criteria, with the safety nets the other forms have:
// - leaving with unsaved edits asks first (UnsavedGuard)
// - each changed box shows its old value and "คืนค่าเดิม"; "ยกเลิกการแก้ไข" puts every box back
// - "ใช้ค่าชุดนี้" in the history copies an older version (or the hospital document's defaults)
//   into the form; it still has to be saved as a new version, nothing old is overwritten or deleted
// - a wrong or empty box is marked, scrolled to, focused and shaken; the mark clears once fixed
// - saving shows a review popup with every change (old → new), the approver and the reason
import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { UnsavedGuard } from "@/components/leave-guard";
import { Modal } from "@/components/ui/modal";
import { DEFAULT_PARAMS, PARAM_INFO, paramFieldProblems, type RuleParams } from "@/lib/rules";
import { saveCriteria } from "./actions";

const KEYS = Object.keys(DEFAULT_PARAMS) as (keyof RuleParams)[];
type Values = Record<keyof RuleParams, string>;
export type HistoryRow = { version: string; when: string; approvedBy: string; reason: string; by: string; used: number; params: RuleParams; isDefault?: boolean };

const asText = (p: RuleParams) => Object.fromEntries(KEYS.map((k) => [k, String(p[k])])) as Values;
const toNum = (s: string) => (s.trim() === "" ? NaN : Number(s));
// Labels are 1 or 2 lines long; giving every label 2 lines keeps the boxes in one row level.
const LABEL_2_LINES = { minHeight: "2.9em", display: "flex", alignItems: "flex-end" } as const;

export function CriteriaForm({ version, current, history }: { version: string; current: RuleParams; history: HistoryRow[] }) {
  const [state, action, pending] = useActionState(saveCriteria, undefined);
  const [values, setValues] = useState<Values>(asText(current));
  const [approvedBy, setApprovedBy] = useState("");
  const [reason, setReason] = useState("");
  const [tried, setTried] = useState(false);
  const [serverErr, setServerErr] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState<string | null>(null); // "ใช้ค่าชุดนี้" notice
  const [review, setReview] = useState<FormData | null>(null);
  const [askUndo, setAskUndo] = useState(false);
  const [jump, setJump] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  const changed = KEYS.filter((k) => toNum(values[k]) !== current[k]);
  const dirty = changed.length > 0 || approvedBy.trim() !== "" || reason.trim() !== "";

  const parsed = Object.fromEntries(KEYS.map((k) => [k, toNum(values[k])])) as RuleParams;
  const live: Record<string, string> = { ...paramFieldProblems(parsed) };
  if (!approvedBy.trim()) live.approvedBy = "กรุณากรอกชื่อแพทย์หรือเภสัชกรผู้อนุมัติ";
  if (!reason.trim()) live.reason = "กรุณากรอกเหตุผลหรือเอกสารอ้างอิง";
  const errOf = (k: string) => (tried ? live[k] : undefined) ?? serverErr[k];
  const errCount = [...KEYS, "approvedBy", "reason"].filter((k) => errOf(k)).length;

  // the server sent errors back: show them on the boxes and go to the first one
  // (done while rendering, once per new answer, so no extra effect pass)
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state?.errors) { setServerErr(state.errors); setJump((n) => n + 1); }
  }

  // scroll to the first marked box, put the cursor in it and make it shake
  useEffect(() => {
    if (!jump) return;
    const first = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (!first) return;
    const box = (first.closest(".crit-field") ?? first.parentElement) as HTMLElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    box.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    box.classList.remove("err-flash");
    void box.offsetWidth; // restart the animation
    box.classList.add("err-flash");
    first.focus({ preventScroll: true });
  }, [jump]);

  const clearServer = (k: string) => setServerErr((e) => { if (!(k in e)) return e; const n = { ...e }; delete n[k]; return n; });
  const setValue = (k: keyof RuleParams, v: string) => { setValues((o) => ({ ...o, [k]: v })); clearServer(k); setLoaded(null); };

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
  function undoAll() {
    setValues(asText(current)); setApprovedBy(""); setReason("");
    setTried(false); setServerErr({}); setLoaded(null); setAskUndo(false);
  }
  function loadVersion(h: HistoryRow) {
    setValues(asText(h.params)); setServerErr({});
    setLoaded(h.isDefault ? "ค่าตามเอกสาร รพ." : `เวอร์ชัน ${h.version}`);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const formMsg = state?.form && !state.errors ? state.form : null;

  return (
    <>
      <form ref={formRef} onSubmit={onSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 12, scrollMarginTop: 170 }}>
        <UnsavedGuard armed={dirty && !pending && !review} />
        {loaded && (
          <div className="flash">นำค่าจาก{" "}{loaded}{" "}มาใส่ในฟอร์มแล้ว ตรวจตัวเลข กรอกผู้อนุมัติและเหตุผล แล้วกดบันทึกเพื่อใช้เป็นเกณฑ์เวอร์ชันใหม่</div>
        )}
        {[...new Set(KEYS.map((k) => PARAM_INFO[k].part))].map((part) => (
          <div key={part} className="card pad">
            <div className="sec-title">{part}</div>
            <div className="form-grid">
              {KEYS.filter((k) => PARAM_INFO[k].part === part).map((k) => {
                const err = errOf(k);
                const isChanged = changed.includes(k);
                return (
                  <div key={k} className="crit-field">
                    <label className="lbl" htmlFor={k} style={LABEL_2_LINES}>{PARAM_INFO[k].label} ({PARAM_INFO[k].unit})</label>
                    <input className={`fld${err ? " bad" : isChanged ? " crit-changed" : ""}`} id={k} name={k} type="number" step="any" min={0} inputMode="decimal"
                      value={values[k]} onChange={(e) => setValue(k, e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()} // a mouse wheel over the box must not change a clinical number
                      aria-invalid={!!err} aria-describedby={`${k}-msg`} />
                    <div id={`${k}-msg`}>
                      {err && <div className="err">{err}</div>}
                      {isChanged ? (
                        <div className="crit-was">
                          <span>ค่าที่ใช้อยู่ <b>{current[k]}</b></span>
                          <button type="button" className="ui-link-btn sm" onClick={() => setValue(k, String(current[k]))}>คืนค่าเดิม</button>
                        </div>
                      ) : !err && (
                        <div className="note">ค่าเริ่มต้นตามเอกสาร รพ. {DEFAULT_PARAMS[k]}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div className="card pad form-grid">
          <div className="crit-field">
            <label className="lbl" htmlFor="approvedBy">แพทย์หรือเภสัชกรผู้อนุมัติ *</label>
            <input className={`fld${errOf("approvedBy") ? " bad" : ""}`} id="approvedBy" name="approvedBy" maxLength={120} placeholder="ชื่อและตำแหน่ง"
              value={approvedBy} onChange={(e) => { setApprovedBy(e.target.value); clearServer("approvedBy"); }} aria-invalid={!!errOf("approvedBy")} />
            {errOf("approvedBy") && <div className="err">{errOf("approvedBy")}</div>}
          </div>
          <div className="crit-field">
            <label className="lbl" htmlFor="reason">เหตุผลหรือเอกสารอ้างอิง *</label>
            <input className={`fld${errOf("reason") ? " bad" : ""}`} id="reason" name="reason" maxLength={500} placeholder="เช่น มติคณะกรรมการ PTC ครั้งที่ ..."
              value={reason} onChange={(e) => { setReason(e.target.value); clearServer("reason"); }} aria-invalid={!!errOf("reason")} />
            {errOf("reason") && <div className="err">{errOf("reason")}</div>}
          </div>
        </div>
        {formMsg && <div className="flash bad" role="alert">{formMsg}</div>}
        <div className="ui-savebar">
          {errCount > 0 ? (
            <button type="button" className="ui-hint crit-errjump" onClick={() => setJump((n) => n + 1)}>มี {errCount} ช่องที่ต้องแก้ไข กดเพื่อไปที่ช่องแรก</button>
          ) : (
            <span className="ui-hint">{changed.length ? `แก้ไขแล้ว ${changed.length} ช่อง ยังไม่ได้บันทึก` : "ยังไม่ได้แก้ค่าใด บันทึกแล้วจะเป็นเกณฑ์เวอร์ชันใหม่ ใช้กับการคัดกรองครั้งต่อไป"}</span>
          )}
          <button type="button" className="ui-btn secondary" disabled={!dirty || pending} onClick={() => setAskUndo(true)}>ยกเลิกการแก้ไข</button>
          <button className="ui-btn primary" type="submit" disabled={pending || changed.length === 0}>{pending ? "กำลังบันทึก..." : "บันทึกเป็นเกณฑ์เวอร์ชันใหม่"}</button>
        </div>
      </form>

      <div className="card" style={{ overflowX: "auto" }}>
        <div className="sec-title" style={{ padding: "16px 16px 0" }}>ประวัติเกณฑ์</div>
        <table className="grid">
          <thead><tr><th>เวอร์ชัน</th><th>บันทึกเมื่อ</th><th>ผู้อนุมัติ</th><th>เหตุผล</th><th>บันทึกโดย</th><th>ใช้ประเมินไปแล้ว</th><th></th></tr></thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.version}>
                <td className="mono">{h.version}{h.version === version && <span className="pill ok" style={{ marginLeft: 6 }}>ใช้อยู่</span>}</td>
                <td className="time">{h.when}</td>
                {h.isDefault ? <td colSpan={3}>เอกสาร MALA outline prg.xlsx ของ รพ.</td> : <><td>{h.approvedBy}</td><td>{h.reason}</td><td>{h.by}</td></>}
                <td>{h.used} ครั้ง</td>
                <td style={{ textAlign: "right" }}>
                  {h.version !== version && <button type="button" className="ui-btn secondary sm" onClick={() => loadVersion(h)}>ใช้ค่าชุดนี้</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="note" style={{ padding: "0 16px 14px", margin: 0 }}>
          เกณฑ์ที่บันทึกแล้วลบหรือแก้ย้อนหลังไม่ได้ เพราะผลคัดกรองเดิมอ้างอิงเวอร์ชันนั้นอยู่ ถ้าต้องการกลับไปใช้ค่าชุดเก่า
          ให้กด &quot;ใช้ค่าชุดนี้&quot; แล้วบันทึกเป็นเวอร์ชันใหม่
        </p>
      </div>

      {askUndo && (
        <Modal title="ยกเลิกการแก้ไขทั้งหมด?" tone="warn" onClose={() => setAskUndo(false)} closeLabel="แก้ไขต่อ" closePrimary
          actions={<button type="button" className="ui-btn secondary" onClick={undoAll}>ยกเลิกการแก้ไข</button>}>
          <p>ทุกช่องจะกลับเป็นค่าที่ใช้อยู่ตอนนี้ ({version}) และล้างชื่อผู้อนุมัติกับเหตุผลที่กรอกไว้</p>
        </Modal>
      )}
      {review && (
        <Modal title="ตรวจสอบก่อนบันทึกเกณฑ์ใหม่" onClose={() => setReview(null)} closeLabel="กลับไปแก้ไข"
          actions={<button type="button" className="ui-btn primary" onClick={confirmSave}>ยืนยันบันทึก</button>}>
          <p>เกณฑ์นี้จะใช้กับการคัดกรองครั้งต่อไปทันที ผลคัดกรองเดิมไม่เปลี่ยน</p>
          <dl className="ui-review">
            {changed.map((k) => (
              <div key={k} style={{ display: "contents" }}>
                <dt>{PARAM_INFO[k].label}</dt>
                <dd><span className="ui-review-old">{current[k]}</span> → {values[k]} {PARAM_INFO[k].unit}</dd>
              </div>
            ))}
            <dt>ผู้อนุมัติ</dt><dd>{approvedBy}</dd>
            <dt>เหตุผล</dt><dd>{reason}</dd>
          </dl>
        </Modal>
      )}
    </>
  );
}
