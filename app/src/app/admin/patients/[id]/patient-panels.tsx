"use client";
// Small pieces that keep the admin patient page tidy however much data a patient has:
// - Tabs: screening history and change history side by side instead of one long page
// - FoldRows: a long table shows its first rows, then "ดูเพิ่มอีก N รายการ" (the rest stay one
//   click away; nothing is paged away out of sight)
// - ActiveToggle: switch the patient off / on, asking the reason in a popup
// - VerifyBox: the identity check a patient added by a รพ.สต. is waiting for
import { useRef, useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/modal";
import { LIMITS, hnProblem } from "@/lib/format";

export function Tabs({ tabs, initial = 0 }: { tabs: { label: string; count: number; body: ReactNode }[]; initial?: number }) {
  const [on, setOn] = useState(initial);
  return (
    <section className="ui-card pa-tabs">
      <div className="pa-tabbar" role="tablist">
        {tabs.map((t, i) => (
          <button key={t.label} type="button" role="tab" aria-selected={on === i} className={on === i ? "on" : ""} onClick={() => setOn(i)}>
            {t.label}<span className="pa-count">{t.count}</span>
          </button>
        ))}
      </div>
      <div role="tabpanel">{tabs[on].body}</div>
    </section>
  );
}

export function FoldRows({ rows, cols, step = 10, empty }: { rows: ReactNode[]; cols: number; step?: number; empty: string }) {
  const [shown, setShown] = useState(step);
  if (rows.length === 0) return <tbody><tr><td colSpan={cols} className="ui-empty">{empty}</td></tr></tbody>;
  const more = rows.length - shown;
  return (
    <tbody>
      {rows.slice(0, shown)}
      {more > 0 && (
        <tr className="pa-more">
          <td colSpan={cols}>
            <button type="button" className="ui-btn secondary sm" onClick={() => setShown((n) => n + step * 2)}>ดูเพิ่มอีก {Math.min(more, step * 2)} รายการ</button>
            {more > step * 2 && <button type="button" className="ui-link-btn" onClick={() => setShown(rows.length)}>แสดงทั้งหมด {rows.length} รายการ</button>}
          </td>
        </tr>
      )}
    </tbody>
  );
}

// Switch the patient off (or back on): one small button; the reason is asked in a popup, which
// is also the confirmation. Posts to setPatientActive (the server checks the reason again).
export function ActiveToggle({ active, name, action, backTo }: { active: boolean; name: string; action: (fd: FormData) => void; backTo: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [tried, setTried] = useState(false);
  const [sending, setSending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const bad = tried && !reason.trim();
  const send = () => {
    setTried(true);
    if (!reason.trim()) { formRef.current?.querySelector<HTMLInputElement>("input[name=reason]")?.focus(); return; }
    setSending(true);
    formRef.current?.requestSubmit();
  };
  return (
    <>
      <button type="button" className={`ui-btn pe-btn ${active ? "pe-off" : "pe-on"}`} onClick={() => setOpen(true)}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {active ? <><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" /></> : <><path d="M12 3v9" /><path d="M6.3 7.5a8 8 0 1 0 11.4 0" /></>}
        </svg>
        {active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
      </button>
      {open && (
        <Modal title={active ? `ปิดใช้งาน ${name}?` : `เปิดใช้งาน ${name} อีกครั้ง?`} tone={active ? "warn" : undefined} closePrimary={active}
          onClose={() => { setOpen(false); setTried(false); }} closeLabel="ยกเลิก"
          actions={<button type="button" className={`ui-btn ${active ? "secondary uf-danger" : "primary"}`} disabled={sending} onClick={send}>{sending ? "กำลังบันทึก..." : active ? "ยืนยันปิดใช้งาน" : "ยืนยันเปิดใช้งาน"}</button>}>
          <form ref={formRef} action={action} className="pa-form" style={{ textAlign: "left" }} onSubmit={(e) => { if (!reason.trim()) e.preventDefault(); }}>
            <input type="hidden" name="back" value={backTo} />
            <p className="pa-hint">{active ? "ผู้ป่วยจะไม่แสดงในรายชื่อของ รพ.สต. ข้อมูลและประวัติไม่ถูกลบ และเปิดใช้งานกลับได้" : "ผู้ป่วยจะกลับมาแสดงในรายชื่อของ รพ.สต."}</p>
            <div className={bad ? "err-flash" : ""}>
              <label className="lbl" htmlFor="pa-reason">เหตุผล *</label>
              <input className={`fld${bad ? " bad" : ""}`} id="pa-reason" name="reason" value={reason} maxLength={300} autoComplete="off" autoFocus
                placeholder={active ? "เช่น ลงทะเบียนซ้ำ / ผู้ป่วยเสียชีวิต" : "เช่น ปิดผิดคน"} aria-invalid={bad}
                onChange={(e) => setReason(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(); } }} />
              {bad && <div className="err">กรุณากรอกเหตุผล</div>}
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

// "ผู้ป่วยรายนี้ยังไม่ได้ยืนยันตัวตน": the admin's job for a patient a รพ.สต. added, shown at the
// top of the patient's own card as two numbered steps (check the ID card number in the hospital
// system, then type the HN), with a confirm popup. Posts to verifyPatient (checked again there).
export function VerifyBox({ name, cardId, checksumOk, hn: startHn, action, backTo, serverError }: {
  name: string; cardId: string; checksumOk: boolean; hn: string;
  action: (fd: FormData) => void; backTo: string; serverError?: string;
}) {
  const [hn, setHn] = useState(startHn);
  const [err, setErr] = useState(serverError ?? "");
  const [ask, setAsk] = useState(false);
  const [sending, setSending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [shake, setShake] = useState(!!serverError);

  const problem = (v: string) => (!v.trim() ? "กรุณากรอก HN จากระบบของ รพ." : hnProblem(v) ?? "");
  const go = () => {
    const p = problem(hn);
    if (p) { setErr(p); setShake(false); requestAnimationFrame(() => setShake(true)); inputRef.current?.focus(); return; }
    setAsk(true);
  };

  return (
    <form ref={formRef} action={action} className="vf-box" onSubmit={() => setSending(true)}>
      <input type="hidden" name="back" value={backTo} />
      <p className="vf-text">
        <span className="ui-badge warn vf-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9.5" /><path d="M12 7.5v5.5" /><path d="M12 16.5h.01" />
          </svg>
          รอยืนยันตัวตน
        </span>
        ตรวจเลขประจำตัวประชาชน <b className="mono">{cardId}</b> กับระบบของ รพ. แล้วใส่ HN ด้านล่าง
      </p>
      {!checksumOk && <p className="vf-warn">เลขหลักสุดท้ายไม่ตรงตามสูตร ตรวจกับบัตรอีกครั้ง</p>}
      <div className={`vf-row${shake && err ? " err-flash" : ""}`}>
        <label className="vf-lbl" htmlFor="vf-hn">HN จากระบบ รพ.</label>
        <input ref={inputRef} className={`fld mono${err ? " bad" : ""}`} id="vf-hn" name="hn" value={hn} maxLength={LIMITS.hn} autoComplete="off"
          aria-invalid={!!err} onChange={(e) => { setHn(e.target.value); setErr(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); go(); } }} />
        <button type="button" className="ui-btn primary" disabled={sending} onClick={go}>{sending ? "กำลังบันทึก..." : "ยืนยันตัวตนผู้ป่วย"}</button>
      </div>
      {err && <div className="err">{err}</div>}
      {ask && (
        <Modal title="ยืนยันตัวตนผู้ป่วยรายนี้?" onClose={() => setAsk(false)} closeLabel="กลับไปแก้ไข"
          actions={<button type="button" className="ui-btn primary" onClick={() => { setAsk(false); setSending(true); formRef.current?.requestSubmit(); }}>ยืนยันตัวตน</button>}>
          <p>ตรวจแล้วว่าเลขบัตรตรงกับผู้ป่วยในระบบของ รพ.</p>
          <dl className="ui-review">
            <dt>ผู้ป่วย</dt><dd>{name}</dd>
            <dt>เลขประจำตัวประชาชน</dt><dd className="mono">{cardId}</dd>
            <dt>HN</dt><dd className="mono">{hn.trim()}</dd>
          </dl>
          <p className="pa-hint">หลังยืนยันแล้ว เจ้าหน้าที่ รพ.สต. จะเห็นสถานะผู้ป่วยเป็นยืนยันแล้ว</p>
        </Modal>
      )}
    </form>
  );
}

// "วันและเวลา": everything that happened to this patient, newest first (registered, identity
// checked, each screening, each saved edit, switched off / on). The card shows the newest 3, so it
// stays the height of the patient card beside it; "ดูทั้งหมด" opens the full list in a popup, so
// the page layout never jumps however long the history gets.
export type TimelineItem = { at: string; when: string; text: string; who?: string; kind: "create" | "verify" | "screen" | "edit" | "off" | "on" };
function TimelineList({ items }: { items: TimelineItem[] }) {
  return (
    <ul className="pa-timeline">
      {items.map((it, i) => (
        <li key={`${it.at}-${i}`} className={`k-${it.kind}`}>
          <b>{it.when}</b>
          <span>{it.text}{it.who ? <> โดย {it.who}</> : null}</span>
        </li>
      ))}
    </ul>
  );
}
export function Timeline({ items, step = 3 }: { items: TimelineItem[]; step?: number }) {
  const [all, setAll] = useState(false);
  return (
    <section className="ui-card pa-tl">
      <div className="ui-card-head">
        <div className="ui-card-title">วันและเวลา<span className="ui-card-count">{items.length} รายการ</span></div>
      </div>
      <TimelineList items={items.slice(0, step)} />
      {items.length > step && (
        <div className="pa-tl-more">
          <button type="button" className="ui-link-btn" onClick={() => setAll(true)}>ดูทั้งหมด {items.length} รายการ</button>
        </div>
      )}
      {all && (
        <Modal title={`วันและเวลาทั้งหมด (${items.length} รายการ)`} onClose={() => setAll(false)} closeLabel="ปิด">
          <div className="pa-tl-all"><TimelineList items={items} /></div>
        </Modal>
      )}
    </section>
  );
}
