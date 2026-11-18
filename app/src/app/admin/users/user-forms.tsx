"use client";
// The account list on /admin/users and its popups. Every change is checked in a popup first:
// - "สร้างบัญชีใหม่": fill the form, check the summary, then the temporary password is shown once
// - "จัดการ": the account at a glance, edit its details (review old → new before saving),
//   set a new temporary password, or switch the account off / on (each asks first)
// - closing a popup with unsaved typing asks before throwing it away
// - a wrong or empty box is marked, focused and shaken; the mark clears once it is fixed
// The temporary password is never stored in plain text and is shown only once.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { Modal } from "@/components/ui/modal";
import { PlusIcon } from "@/components/ui/icons";
import { LIMITS, formatPhone, licenseNoProblem, nameProblem, phoneDigits, phoneProblem, typePhone } from "@/lib/format";
import { createUser, resetPassword, setUserActive, updateUser, type UserInput, type UserResult } from "./actions";

export type UserRow = UserInput & {
  id: number; active: boolean; mustChangePassword: boolean;
  lastLogin: { date: string; time: string } | null; created: { date: string; time: string };
};

const ROLE: Record<string, string> = { pcu: "เจ้าหน้าที่ รพ.สต.", clinician: "แพทย์ / พยาบาล", admin: "ผู้ดูแลระบบ" };
const LABEL: Record<keyof UserInput, string> = {
  role: "บทบาท", facility: "หน่วยบริการ", username: "ชื่อผู้ใช้", displayName: "ชื่อ–นามสกุล",
  position: "ตำแหน่ง", licenseNo: "เลขใบประกอบวิชาชีพ", phone: "เบอร์โทรศัพท์",
};
const FIELDS = Object.keys(LABEL) as (keyof UserInput)[];
const EMPTY: UserInput = { role: "pcu", facility: "", username: "", displayName: "", position: "", licenseNo: "", phone: "" };
const shown = (k: keyof UserInput, v: string) => (k === "role" ? ROLE[v] ?? v : k === "phone" && v ? formatPhone(v) : v.trim() || "ไม่ได้กรอก");

// the value that will really be saved (hospital staff have no unit)
const norm = (v: UserInput): UserInput => {
  const t = Object.fromEntries(FIELDS.map((k) => [k, v[k].trim()])) as UserInput;
  // a phone counts as changed only when its digits change ("0812345678" = "081-234-5678")
  return { ...t, username: t.username.toLowerCase(), facility: t.role === "pcu" ? t.facility : "", phone: phoneProblem(t.phone) ? t.phone : phoneDigits(t.phone) };
};

function localErrors(v: UserInput) {
  const e: Record<string, string> = {};
  if (!/^[a-z0-9._-]{3,30}$/.test(v.username.trim().toLowerCase())) e.username = "ใช้ได้เฉพาะ a-z 0-9 . _ - ยาว 3 ถึง 30 ตัว";
  if (v.displayName.trim().length < 2) e.displayName = "กรุณากรอกชื่อ–นามสกุล";
  else if (nameProblem(v.displayName)) e.displayName = nameProblem(v.displayName)!;
  if (v.position.trim().length > LIMITS.position) e.position = `ยาวเกิน ${LIMITS.position} ตัวอักษร`;
  if (licenseNoProblem(v.licenseNo)) e.licenseNo = licenseNoProblem(v.licenseNo)!;
  if (phoneProblem(v.phone)) e.phone = phoneProblem(v.phone)!;
  if (v.role === "pcu" && !v.facility) e.facility = "บัญชีเจ้าหน้าที่ รพ.สต. ต้องเลือกหน่วยบริการ";
  return e;
}

function StatusBadge({ u }: { u: Pick<UserRow, "active" | "mustChangePassword"> }) {
  if (!u.active) return <span className="ui-badge muted">ปิดใช้งาน</span>;
  if (u.mustChangePassword) return <span className="ui-badge warn">รอตั้งรหัสผ่าน</span>;
  return <span className="ui-badge ok">ใช้งานได้</span>;
}

// what just happened, for the result popup
type Outcome = {
  kind: "create" | "save" | "reset" | "off" | "on";
  account: { displayName: string; username: string; role: string; facility: string };
  active: boolean; mustChangePassword: boolean;
  changed?: (keyof UserInput)[];
};
type Dialog = { kind: "create" } | { kind: "manage"; u: UserRow } | { kind: "result"; r: UserResult; o: Outcome };

export function UsersManager({ rows, facilities, meId, count, search }: { rows: UserRow[]; facilities: string[]; meId: number; count: string; search: ReactNode }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const done = (r: UserResult, o: Outcome) => { router.refresh(); setDialog({ kind: "result", r, o }); };

  return (
    <>
      <section className="ui-card">
      <div className="ui-card-head">
        <div className="ui-card-title">บัญชีทั้งหมด<span className="ui-card-count">{count}</span></div>
        <div className="ui-card-actions">
          {search}
          <button type="button" className="ui-btn primary sm" onClick={() => { setDialog({ kind: "create" }); }}><PlusIcon /> สร้างบัญชีใหม่</button>
        </div>
      </div>
      <div className="ui-table-wrap sticky-head">
        <table className="ui-table">
          <thead><tr><th>ชื่อผู้ใช้</th><th>ชื่อ–นามสกุล</th><th>บทบาท</th><th>หน่วยบริการ</th><th>สถานะ</th><th>เข้าใช้ล่าสุด</th><th /></tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className={u.active ? "" : "off"}>
                <td className="mono">{u.username}{u.id === meId && <span className="sub-line">บัญชีของคุณ</span>}</td>
                <td style={{ whiteSpace: "nowrap" }}><b>{u.displayName}</b>{u.position && <span className="sub-line">{u.position}</span>}</td>
                <td style={{ whiteSpace: "nowrap" }}>{ROLE[u.role] ?? u.role}</td>
                <td style={{ whiteSpace: "nowrap" }}>{u.facility || <span className="fac-none">โรงพยาบาล</span>}</td>
                <td><StatusBadge u={u} /></td>
                <td style={{ whiteSpace: "nowrap" }}>{u.lastLogin ? <>{u.lastLogin.date}<span className="sub-line">{u.lastLogin.time}</span></> : <span className="fac-none">ยังไม่เคย</span>}</td>
                <td style={{ textAlign: "right" }}><button type="button" className="ui-btn secondary sm" onClick={() => { setDialog({ kind: "manage", u }); }}>จัดการ</button></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="ui-empty">ไม่พบบัญชีที่ตรงกับการค้นหา</td></tr>}
          </tbody>
        </table>
      </div>
      </section>

      {dialog?.kind === "create" && <UserDialog facilities={facilities} onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.kind === "manage" && <UserDialog u={dialog.u} me={dialog.u.id === meId} facilities={facilities} onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.kind === "result" && <ResultPopup r={dialog.r} o={dialog.o} onClose={() => setDialog(null)} />}
    </>
  );
}

function Field({ id, label, hint, error, span = 3, children }: { id: string; label: string; hint?: string; error?: string; span?: 2 | 3 | 6; children: ReactNode }) {
  return (
    <div className={`uf-field s${span}`}>
      <label className="lbl" htmlFor={id}>{label}</label>
      {children}
      {error ? <div className="err">{error}</div> : hint && <div className="ui-hint">{hint}</div>}
    </div>
  );
}

// One popup for both "create" (no u) and "manage" (u). Views: the form, the review of what will
// be saved, "throw away your typing?", and the confirms for password reset and on/off.
// Each view's <Modal> has its own key, so switching views opens a fresh dialog.
function UserDialog({ u, me = false, facilities, onClose, onDone }: {
  u?: UserRow; me?: boolean; facilities: string[]; onClose: () => void; onDone: (r: UserResult, o: Outcome) => void;
}) {
  const start0 = u ? { role: u.role, facility: u.facility, username: u.username, displayName: u.displayName, position: u.position, licenseNo: u.licenseNo, phone: u.phone } : EMPTY;
  const [v, setV] = useState<UserInput>(start0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [view, setView] = useState<"form" | "review" | "discard" | "reset" | "toggle">("form");
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLDivElement>(null);
  const [jump, setJump] = useState(0);

  const now = norm(v), was = norm(start0);
  const changed = FIELDS.filter((k) => now[k] !== was[k]);
  const dirty = changed.length > 0;
  // a closed unit the account still points at stays in the list so the form shows it
  const units = u?.facility && !facilities.includes(u.facility) ? [u.facility, ...facilities] : facilities;

  useEffect(() => {
    if (!jump || view !== "form") return;
    const first = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (!first) return;
    const box = (first.closest(".uf-field") ?? first) as HTMLElement;
    box.scrollIntoView({ block: "nearest" });
    box.classList.remove("err-flash");
    void box.offsetWidth;
    box.classList.add("err-flash");
    first.focus({ preventScroll: true });
  }, [jump, view]);

  const set = (k: keyof UserInput, val: string) => {
    setV((o) => ({ ...o, [k]: val }));
    setErrors((e) => { const n = { ...e }; delete n[k]; delete n.form; return n; });
  };
  const fail = (e: Record<string, string>) => { setErrors(e); setView("form"); setJump((n) => n + 1); };

  function toReview() {
    const e = localErrors(v);
    if (Object.keys(e).length) return fail(e);
    if (u && !dirty) return setErrors({ form: "ยังไม่มีข้อมูลที่เปลี่ยน" });
    setView("review");
  }
  function save() {
    start(async () => {
      const r = u ? await updateUser(u.id, now) : await createUser(now);
      if (r.errors) fail(r.errors);
      else onDone(r, u
        ? { kind: "save", account: now, active: u.active, mustChangePassword: u.mustChangePassword, changed }
        : { kind: "create", account: now, active: true, mustChangePassword: true });
    });
  }
  function run(kind: "reset" | "off" | "on", action: () => Promise<UserResult>) {
    start(async () => {
      const r = await action();
      if (r.errors) { setErrors(r.errors); setView("form"); return; }
      const acc = u ? { displayName: u.displayName, username: u.username, role: u.role, facility: u.facility } : now;
      onDone(r, {
        kind, account: acc,
        active: kind === "off" ? false : kind === "on" ? true : !!u?.active,
        mustChangePassword: kind === "reset" ? true : !!u?.mustChangePassword,
      });
    });
  }
  // the popup's own close (button or Esc): ask first when something was typed
  const close = () => (dirty ? setView("discard") : onClose());

  const input = (k: keyof UserInput, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input className={`fld${k === "username" || k === "licenseNo" ? " mono" : ""}${errors[k] ? " bad" : ""}`} id={`uf-${k}`} value={v[k]} autoComplete="off"
      onChange={(e) => set(k, k === "username" ? e.target.value.toLowerCase() : k === "phone" ? typePhone(e.target.value) : e.target.value)} aria-invalid={!!errors[k]} {...extra} />
  );

  if (view === "discard") {
    return (
      <Modal key="discard" title="ยังไม่ได้บันทึก" tone="warn" onClose={() => setView("form")} closeLabel="กลับไปแก้ไขต่อ" closePrimary
        actions={<button type="button" className="ui-btn secondary" onClick={onClose}>ปิดโดยไม่บันทึก</button>}>
        <p>ข้อมูลที่กรอกหรือแก้ไขไว้ {changed.length} ช่องยังไม่ได้บันทึก ถ้าปิดตอนนี้ข้อมูลจะหายไป</p>
      </Modal>
    );
  }
  if (view === "review") {
    return (
      <Modal key="review" title={u ? "ตรวจสอบก่อนบันทึกการแก้ไข" : "ตรวจสอบก่อนสร้างบัญชี"} onClose={() => setView("form")} closeLabel="กลับไปแก้ไข"
        actions={<button type="button" className="ui-btn primary" disabled={pending} onClick={save}>{pending ? "กำลังบันทึก..." : u ? "ยืนยันบันทึก" : "ยืนยันสร้างบัญชี"}</button>}>
        {!u && <p>ระบบจะออกรหัสผ่านชั่วคราวให้หลังสร้างบัญชี เจ้าของบัญชีต้องตั้งรหัสใหม่ตอนเข้าสู่ระบบครั้งแรก</p>}
        <dl className="ui-review">
          {(u ? changed : FIELDS.filter((k) => now[k])).map((k) => (
            <div key={k} style={{ display: "contents" }}>
              <dt>{LABEL[k]}</dt>
              <dd>{u ? <><span className="ui-review-old">{shown(k, was[k])}</span> → {shown(k, now[k])}</> : shown(k, now[k])}</dd>
            </div>
          ))}
        </dl>
        {u && changed.includes("username") && <p className="uf-warn">เจ้าของบัญชีต้องใช้ชื่อผู้ใช้ใหม่ <b>{now.username}</b> ในการเข้าสู่ระบบครั้งต่อไป</p>}
        {u && changed.includes("role") && <p className="uf-warn">บทบาทใหม่มีผลทันที เจ้าของบัญชีจะเห็นเมนูและข้อมูลตามบทบาทใหม่ในการกดครั้งถัดไป</p>}
      </Modal>
    );
  }
  if (view === "reset" && u) {
    return (
      <Modal key="reset" title={`ตั้งรหัสผ่านชั่วคราวใหม่ให้ ${u.username}?`} tone="warn" onClose={() => setView("form")} closeLabel="ยกเลิก" closePrimary
        actions={<button type="button" className="ui-btn secondary" disabled={pending} onClick={() => run("reset", () => resetPassword(u.id))}>{pending ? "กำลังตั้งรหัส..." : "ตั้งรหัสใหม่"}</button>}>
        <p>รหัสเดิมจะใช้ไม่ได้ทันที และบัญชีนี้จะถูกออกจากระบบทุกเครื่อง เจ้าของบัญชีต้องใช้รหัสชั่วคราวที่ระบบจะแสดงในขั้นต่อไป</p>
      </Modal>
    );
  }
  if (view === "toggle" && u) {
    return u.active ? (
      <Modal key="off" title={`ปิดการใช้งาน ${u.username}?`} tone="warn" onClose={() => setView("form")} closeLabel="ยกเลิก" closePrimary
        actions={<button type="button" className="ui-btn secondary uf-danger" disabled={pending} onClick={() => run("off", () => setUserActive(u.id, false))}>{pending ? "กำลังปิด..." : "ปิดการใช้งาน"}</button>}>
        <p><b>{u.displayName}</b> จะถูกออกจากระบบทันทีและเข้าใช้ไม่ได้ ข้อมูลและประวัติการใช้งานของบัญชียังอยู่ครบ เปิดใช้งานกลับได้ภายหลัง</p>
      </Modal>
    ) : (
      <Modal key="on" title={`เปิดการใช้งาน ${u.username} อีกครั้ง?`} onClose={() => setView("form")} closeLabel="ยกเลิก"
        actions={<button type="button" className="ui-btn primary" disabled={pending} onClick={() => run("on", () => setUserActive(u.id, true))}>{pending ? "กำลังเปิด..." : "เปิดการใช้งาน"}</button>}>
        <p><b>{u.displayName}</b> จะเข้าสู่ระบบด้วยรหัสผ่านเดิมได้อีกครั้ง ถ้าจำรหัสไม่ได้ ให้ตั้งรหัสผ่านชั่วคราวใหม่</p>
      </Modal>
    );
  }

  return (
    <Modal key="form" title={u ? `จัดการบัญชี ${u.displayName}` : "สร้างบัญชีใหม่"} onClose={close} closeLabel="ยกเลิก"
      actions={<button type="button" className="ui-btn primary" onClick={toReview}>{u ? "บันทึกการแก้ไข" : "ถัดไป ตรวจสอบข้อมูล"}</button>}>
      <div className="uf-form" ref={formRef} onKeyDown={(e) => { if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") { e.preventDefault(); toReview(); } }}>
        {u && (
          <div className="uf-summary">
            <StatusBadge u={u} />
            <span className="uf-meta">เข้าใช้ล่าสุด {u.lastLogin ? `${u.lastLogin.date} ${u.lastLogin.time}` : "ยังไม่เคย"}</span>
            <span className="uf-meta">สร้างเมื่อ {u.created.date}</span>
          </div>
        )}

        <fieldset className="uf-roles">
          <legend className="lbl">บทบาท *</legend>
          {(["pcu", "clinician", "admin"] as const).map((r) => (
            <label key={r} className="ui-chip"><input type="radio" name="uf-role" checked={v.role === r} disabled={me && r !== "admin"} onChange={() => set("role", r)} />{ROLE[r]}</label>
          ))}
          {errors.role && <div className="err" style={{ flexBasis: "100%" }}>{errors.role}</div>}
        </fieldset>

        <div className="uf-grid">
          {v.role === "pcu" && (
            <Field id="uf-facility" label="หน่วยบริการ *" error={errors.facility} span={6}>
              <select className={`fld${errors.facility ? " bad" : ""}`} id="uf-facility" value={v.facility} onChange={(e) => set("facility", e.target.value)} aria-invalid={!!errors.facility}>
                <option value="">เลือกหน่วยบริการ</option>
                {units.map((f) => <option key={f} value={f}>{f}{facilities.includes(f) ? "" : " (ปิดแล้ว)"}</option>)}
              </select>
            </Field>
          )}
          <Field id="uf-username" label="ชื่อผู้ใช้สำหรับเข้าสู่ระบบ *" hint="a-z 0-9 . _ - เช่น bandu.somsri" error={errors.username}>
            {input("username", { maxLength: 30, autoFocus: !u })}
          </Field>
          <Field id="uf-displayName" label="ชื่อ–นามสกุล *" error={errors.displayName}>{input("displayName", { maxLength: LIMITS.name })}</Field>
          <Field span={2} id="uf-position" label="ตำแหน่ง" error={errors.position}>{input("position", { maxLength: LIMITS.position, placeholder: "เช่น พยาบาลวิชาชีพ" })}</Field>
          <Field span={2} id="uf-licenseNo" label="เลขใบประกอบวิชาชีพ" error={errors.licenseNo}>{input("licenseNo", { maxLength: LIMITS.licenseNo, placeholder: "ถ้ามี" })}</Field>
          <Field span={2} id="uf-phone" label="เบอร์โทรศัพท์" error={errors.phone}>{input("phone", { maxLength: LIMITS.phone, inputMode: "tel", placeholder: "ถ้ามี" })}</Field>
        </div>
        {errors.form && <div className="flash bad" role="alert">{errors.form}</div>}

        {u && (
          <div className="uf-more">
            <span className="lbl">การจัดการบัญชี</span>
            <div className="uf-more-btns">
              {me
                ? <Link href="/account/password" className="ui-btn secondary sm">เปลี่ยนรหัสผ่านของฉัน</Link>
                : <button type="button" className="ui-btn secondary sm" onClick={() => setView("reset")}>ตั้งรหัสผ่านชั่วคราวใหม่</button>}
              {!me && (u.active
                ? <button type="button" className="ui-btn secondary sm uf-danger" onClick={() => setView("toggle")}>ปิดการใช้งานบัญชี</button>
                : <button type="button" className="ui-btn secondary sm" onClick={() => setView("toggle")}>เปิดการใช้งานอีกครั้ง</button>)}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

const RESULT: Record<Outcome["kind"], { title: string; note: string }> = {
  create: { title: "สร้างบัญชีเรียบร้อย", note: "แจ้งรหัสผ่านชั่วคราวกับเจ้าของบัญชีโดยตรง ระบบจะให้ตั้งรหัสใหม่ตอนเข้าสู่ระบบครั้งแรก" },
  reset: { title: "ตั้งรหัสผ่านชั่วคราวใหม่แล้ว", note: "รหัสเดิมใช้ไม่ได้แล้ว และบัญชีถูกออกจากระบบทุกเครื่อง แจ้งรหัสนี้กับเจ้าของบัญชีโดยตรง" },
  save: { title: "บันทึกการแก้ไขแล้ว", note: "ข้อมูลใหม่มีผลทันที" },
  off: { title: "ปิดการใช้งานบัญชีแล้ว", note: "บัญชีนี้ถูกออกจากระบบทุกเครื่องและเข้าใช้ไม่ได้ ข้อมูลและประวัติยังอยู่ครบ เปิดใช้งานกลับได้ที่ปุ่มจัดการ" },
  on: { title: "เปิดการใช้งานบัญชีแล้ว", note: "เจ้าของบัญชีเข้าสู่ระบบด้วยรหัสผ่านเดิมได้อีกครั้ง" },
};

// The result of an action, as a popup: what happened, the account as it is now, and for a new
// account or a reset the temporary password. The password stays until the admin closes the popup
// (with a copy button) and is never shown again after that.
function ResultPopup({ r, o, onClose }: { r: UserResult; o: Outcome; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(r.tempPassword!); setCopied(true); } catch { setCopied(false); }
  };
  const a = o.account;
  const t = RESULT[o.kind];
  return (
    <Modal key="result" title={t.title} tone={o.kind === "off" ? "warn" : "ok"} onClose={onClose}
      closeLabel={r.tempPassword ? "จดรหัสแล้ว ปิดหน้าต่าง" : "เสร็จสิ้น"}>
      <div className="ur-card">
        <span className={`ur-avatar${o.active ? "" : " off"}`} aria-hidden="true">{a.displayName.trim().charAt(0) || "?"}</span>
        <div className="ur-who">
          <b>{a.displayName}</b>
          <span className="mono">{a.username}</span>
          <span>{ROLE[a.role] ?? a.role}{a.facility ? ` ${a.facility}` : ""}</span>
        </div>
        <StatusBadge u={o} />
      </div>
      {r.tempPassword && (
        <div className="ur-pass">
          <span>รหัสผ่านชั่วคราว</span>
          <code className="mono">{r.tempPassword}</code>
          <button type="button" className="ui-btn secondary sm" onClick={copy}>{copied ? "คัดลอกแล้ว" : "คัดลอกรหัส"}</button>
        </div>
      )}
      <p className="ur-note">
        {o.kind === "save" && o.changed?.length ? `แก้ไข${o.changed.map((k) => LABEL[k]).join(" ")}แล้ว ` : ""}
        {t.note}{r.tempPassword ? " เมื่อปิดหน้าต่างนี้แล้วจะดูรหัสนี้อีกไม่ได้" : ""}
      </p>
    </Modal>
  );
}
