"use client";

import { useActionState } from "react";
import { submitWithoutReset } from "@/lib/submit";
import { changePassword } from "./actions";

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);
  return (
    <form method="post" onSubmit={submitWithoutReset(action)} className="card pad" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <label className="lbl" htmlFor="current">รหัสผ่านปัจจุบัน</label>
        <input className="fld" id="current" name="current" type="password" autoComplete="current-password" required />
      </div>
      <div>
        <label className="lbl" htmlFor="next">รหัสผ่านใหม่ (อย่างน้อย 8 ตัว มีตัวอักษรและตัวเลข)</label>
        <input className="fld" id="next" name="next" type="password" autoComplete="new-password" required minLength={8} />
      </div>
      <div>
        <label className="lbl" htmlFor="again">พิมพ์รหัสผ่านใหม่อีกครั้ง</label>
        <input className="fld" id="again" name="again" type="password" autoComplete="new-password" required minLength={8} />
      </div>
      {state?.error && <div className="err" role="alert">{state.error}</div>}
      <button className="btn" type="submit" disabled={pending}>{pending ? "กำลังบันทึก…" : "บันทึกรหัสผ่านใหม่"}</button>
    </form>
  );
}
