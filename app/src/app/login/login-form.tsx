"use client";
// "use client" = this component runs in the browser, because it needs React state
// (useActionState for the error message, useState for the show-password button).

import { useActionState, useState } from "react";
import { login } from "@/app/actions";
import { submitWithoutReset } from "@/lib/submit";

export function LoginForm() {
  // state = whatever `login` returned last time (e.g. an error); pending = true while submitting.
  const [state, action, pending] = useActionState(login, undefined);
  const [showPw, setShowPw] = useState(false);

  return (
    <form onSubmit={submitWithoutReset(action)} className="login-card">
      <div className="card-head">
        <div className="form-title">เข้าสู่ระบบ</div>
        <div className="sub">ใช้บัญชีผู้ใช้ที่หน่วยงานออกให้</div>
      </div>

      <div>
        <label className="lbl" htmlFor="username">ชื่อผู้ใช้งาน</label>
        <div className="icon-field">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
          </svg>
          <input className="fld" id="username" name="username" autoComplete="username" required />
        </div>
      </div>

      <div>
        <label className="lbl" htmlFor="password">รหัสผ่าน</label>
        <div className="icon-field">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" />
          </svg>
          <input className="fld" id="password" name="password" type={showPw ? "text" : "password"} autoComplete="current-password" required />
          <button type="button" className="pw-toggle" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}>
            {showPw ? "ซ่อน" : "แสดง"}
          </button>
        </div>
      </div>

      {state?.error && <div className="err" role="alert">{state.error}</div>}
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
      </button>

      <div className="demo-acc">
        <b>บัญชีทดลอง</b>
        <span>เจ้าหน้าที่ รพ.สต. <code>somsri</code></span>
        <span>แพทย์ รพ. <code>doctor</code></span>
        <span>รหัสผ่าน <code>mala1234</code></span>
      </div>
    </form>
  );
}
