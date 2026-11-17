"use client";
// "use client" = this component runs in the browser, because it needs React state
// (useActionState for the error message, useState for the fields and the show-password button).

import { useActionState, useRef, useState } from "react";
import { login } from "@/app/actions";
import { submitWithoutReset } from "@/lib/submit";

// Synthetic demo accounts (prisma/seed.ts). Clicking one fills the form, handy for demos.
const DEMO = [
  { u: "admin", label: "ผู้ดูแลระบบ รพ." },
  { u: "doctor", label: "แพทย์ / พยาบาล" },
  { u: "somsri", label: "เจ้าหน้าที่ รพ.สต." },
];

export function LoginForm() {
  // state = whatever `login` returned last time (e.g. an error); pending = true while submitting.
  const [state, action, pending] = useActionState(login, undefined);
  const [showPw, setShowPw] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const pwRef = useRef<HTMLInputElement>(null);

  const fill = (u: string) => {
    setUsername(u);
    setPassword("mala1234");
    pwRef.current?.focus();
  };

  return (
    <form onSubmit={submitWithoutReset(action)} className="lg-card">
      <div className="lg-card-head">
        <span className="lg-hello">ยินดีต้อนรับ</span>
        <h2>เข้าสู่ระบบ</h2>
        <p>ใช้บัญชีผู้ใช้ที่โรงพยาบาลออกให้</p>
      </div>

      <div className="lg-field">
        <input id="username" name="username" autoComplete="username" required placeholder=" "
          value={username} onChange={(e) => setUsername(e.target.value)} />
        <label htmlFor="username">ชื่อผู้ใช้งาน</label>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
        </svg>
      </div>

      <div className="lg-field">
        <input ref={pwRef} id="password" name="password" type={showPw ? "text" : "password"} autoComplete="current-password" required placeholder=" "
          value={password} onChange={(e) => setPassword(e.target.value)} />
        <label htmlFor="password">รหัสผ่าน</label>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" />
        </svg>
        <button type="button" className="lg-eye" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"} title={showPw ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}>
          {showPw ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17.9 17.9A10 10 0 0112 20c-6 0-10-8-10-8a18 18 0 015.1-5.9M9.9 4.2A9 9 0 0112 4c6 0 10 8 10 8a18 18 0 01-2.2 3.2M14.1 14.1a3 3 0 11-4.2-4.2M2 2l20 20" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8-10-8-10-8z" /><circle cx="12" cy="12" r="3" /></svg>
          )}
        </button>
      </div>

      {/* key = the error object: each new error remounts this box and replays the shake */}
      {state?.error && (
        <div className="lg-error" role="alert" key={JSON.stringify(state) + String(pending)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>
          {state.error}
        </div>
      )}

      <button className="lg-submit" type="submit" disabled={pending}>
        {pending ? <><span className="spin" aria-hidden="true" />กำลังเข้าสู่ระบบ…</> : <>เข้าสู่ระบบ<span className="arrow" aria-hidden="true">→</span></>}
      </button>

      <div className="lg-demo">
        <div className="lg-demo-head"><span>บัญชีทดลอง กดเพื่อกรอกให้อัตโนมัติ</span><span>รหัส <code>mala1234</code></span></div>
        <div className="lg-demo-list">
          {DEMO.map((d) => (
            <button key={d.u} type="button" className={username === d.u ? "on" : ""} onClick={() => fill(d.u)}>
              <code>{d.u}</code>
              <span>{d.label}</span>
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
