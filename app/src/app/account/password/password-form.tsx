"use client";
// Change my password. Safety nets like the other forms:
// - each box shows its own problem in Thai (the browser's English pop-ups are off: noValidate),
//   the first wrong box is scrolled to, focused and shaken, and the mark clears once it is fixed
// - the new password's rules tick off while typing, and "ตรงกัน" shows when both boxes match
// - show / hide each password, and a Caps Lock warning
// - when it is saved, a popup says so, then "ไปหน้าหลัก" moves on (nothing happens silently)
// The rules mirror passwordProblem() in src/lib/password.ts; the server checks them again.
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { changePassword } from "./actions";

type Key = "current" | "next" | "again";
const LABEL: Record<Key, string> = { current: "รหัสผ่านปัจจุบัน", next: "รหัสผ่านใหม่", again: "พิมพ์รหัสผ่านใหม่อีกครั้ง" };

function check(v: Record<Key, string>) {
  const e: Partial<Record<Key, string>> = {};
  if (!v.current) e.current = "กรุณากรอกรหัสผ่านปัจจุบัน";
  if (!v.next) e.next = "กรุณากรอกรหัสผ่านใหม่";
  else if (v.next.length < 8) e.next = "รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร";
  else if (!/[A-Za-z]/.test(v.next) || !/\d/.test(v.next)) e.next = "รหัสผ่านต้องมีทั้งตัวอักษรภาษาอังกฤษและตัวเลข";
  else if (v.next.length > 72) e.next = "รหัสผ่านยาวเกินไป";
  else if (v.next === v.current) e.next = "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม";
  if (!v.again) e.again = "กรุณาพิมพ์รหัสผ่านใหม่อีกครั้ง";
  else if (v.again !== v.next) e.again = "รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน";
  return e;
}

const Eye = ({ off }: { off: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />
    {off && <path d="M3 3l18 18" />}
  </svg>
);

export function PasswordForm({ firstTime }: { firstTime: boolean }) {
  const router = useRouter();
  const [v, setV] = useState<Record<Key, string>>({ current: "", next: "", again: "" });
  const [show, setShow] = useState<Record<Key, boolean>>({ current: false, next: false, again: false });
  const [tried, setTried] = useState(false);
  const [serverErr, setServerErr] = useState<Record<string, string>>({});
  const [caps, setCaps] = useState(false);
  const [done, setDone] = useState<string | null>(null); // home page to go to
  const [pending, start] = useTransition();
  const [jump, setJump] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  const live = check(v);
  const errOf = (k: Key) => (tried ? live[k] : undefined) ?? serverErr[k];

  useEffect(() => {
    if (!jump) return;
    const first = formRef.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]');
    if (!first) return;
    const box = (first.closest(".pw-field") ?? first) as HTMLElement;
    box.scrollIntoView({ block: "center", behavior: "smooth" });
    box.classList.remove("err-flash");
    void box.offsetWidth;
    box.classList.add("err-flash");
    first.focus({ preventScroll: true });
    first.select();
  }, [jump]);

  const set = (k: Key, val: string) => {
    setV((o) => ({ ...o, [k]: val }));
    setServerErr((e) => { const n = { ...e }; delete n[k]; delete n.form; if (k === "next") delete n.again; return n; });
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    if (Object.keys(live).length) { setJump((n) => n + 1); return; }
    start(async () => {
      const r = await changePassword(v);
      if (r.errors) { setServerErr(r.errors); setJump((n) => n + 1); }
      else setDone(r.home ?? "/");
    });
  }

  const rules = [
    { ok: v.next.length >= 8, text: "อย่างน้อย 8 ตัว" },
    { ok: /[A-Za-z]/.test(v.next), text: "มีตัวอักษรภาษาอังกฤษ" },
    { ok: /\d/.test(v.next), text: "มีตัวเลข" },
  ];

  const field = (k: Key, autoComplete: string) => {
    const err = errOf(k);
    return (
      <div className="pw-field">
        <label className="lbl" htmlFor={k}>{LABEL[k]}</label>
        <div className={`pw-box${err ? " bad" : ""}`}>
          <input id={k} type={show[k] ? "text" : "password"} autoComplete={autoComplete} value={v[k]} maxLength={72}
            onChange={(e) => set(k, e.target.value)} aria-invalid={!!err} aria-describedby={`${k}-msg`}
            onKeyUp={(e) => setCaps(e.getModifierState("CapsLock"))} onBlur={() => setCaps(false)} />
          <button type="button" className="pw-eye" aria-label={show[k] ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"} aria-pressed={show[k]}
            onClick={() => setShow((s) => ({ ...s, [k]: !s[k] }))}><Eye off={show[k]} /></button>
        </div>
        <div id={`${k}-msg`}>
          {err && <div className="err">{err}</div>}
          {k === "next" && !err && (
            <div className="pw-rules">{rules.map((r) => <span key={r.text} className={r.ok ? "ok" : ""}>{r.ok ? "✓ " : ""}{r.text}</span>)}</div>
          )}
          {k === "again" && !err && v.again && v.again === v.next && <div className="pw-match">✓ ตรงกัน</div>}
        </div>
      </div>
    );
  };

  return (
    <>
      <form ref={formRef} onSubmit={submit} noValidate className="card pad pw-form">
        {field("current", "current-password")}
        {field("next", "new-password")}
        {field("again", "new-password")}
        {caps && <div className="pw-caps" role="status">Caps Lock เปิดอยู่ ตัวอักษรที่พิมพ์จะเป็นตัวพิมพ์ใหญ่</div>}
        {serverErr.form && <div className="flash bad" role="alert">{serverErr.form}</div>}
        <button className="ui-btn primary pw-submit" type="submit" disabled={pending}>{pending ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}</button>
      </form>
      {done && (
        <Modal title={firstTime ? "ตั้งรหัสผ่านเรียบร้อย" : "เปลี่ยนรหัสผ่านเรียบร้อย"} tone="ok" closeLabel={firstTime ? "เริ่มใช้งาน" : "ไปหน้าหลัก"}
          onClose={() => router.push(done)}>
          <p>ครั้งต่อไปให้เข้าสู่ระบบด้วยรหัสผ่านใหม่ อย่าบอกรหัสผ่านนี้กับผู้อื่น</p>
        </Modal>
      )}
    </>
  );
}
