"use client";
// Account form (new + edit) and the "reset password" button. Client Components because they show
// the generated temporary password once, right after the server creates it. It is never stored
// in plain text and never shown again.

import { useActionState, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { submitWithoutReset } from "@/lib/submit";
import { createUser, resetPassword, updateUser, type UserFormState } from "./actions";

type U = { id: number; username: string; displayName: string; role: string; facility: string | null; position: string | null; licenseNo: string | null; phone: string | null };

// The temporary password opens in a popup that stays until the admin closes it, with a copy
// button, so it cannot disappear before it was written down. Closing it hides it for good.
function TempPassword({ s }: { s: UserFormState }) {
  const [closedFor, setClosedFor] = useState<UserFormState>(undefined);
  const [copied, setCopied] = useState(false);
  if (!s?.tempPassword || closedFor === s) return null;
  const copy = async () => {
    try { await navigator.clipboard.writeText(s.tempPassword!); setCopied(true); } catch { setCopied(false); }
  };
  return (
    <Modal title="รหัสผ่านชั่วคราว" tone="ok" closeLabel="จดรหัสแล้ว ปิดหน้าต่าง" onClose={() => setClosedFor(s)}
      actions={<button type="button" className="ui-btn secondary" onClick={copy}>{copied ? "คัดลอกแล้ว" : "คัดลอกรหัส"}</button>}>
      <p>{s.ok}</p>
      <p>รหัสผ่านชั่วคราวของ <b>{s.username}</b></p>
      <p><code className="mono" style={{ fontSize: 24, fontWeight: 700, letterSpacing: 2, color: "var(--acc-d)" }}>{s.tempPassword}</code></p>
      <p className="note">แจ้งรหัสนี้กับเจ้าของบัญชีโดยตรง ระบบจะให้เปลี่ยนรหัสตอนเข้าสู่ระบบครั้งแรก เมื่อปิดหน้าต่างนี้แล้วจะดูรหัสนี้อีกไม่ได้</p>
    </Modal>
  );
}

export function UserForm({ facilities, user }: { facilities: string[]; user?: U }) {
  const [state, action, pending] = useActionState(user ? updateUser.bind(null, user.id) : createUser, undefined);
  const [role, setRole] = useState(user?.role ?? "pcu");
  return (
    <form method="post" onSubmit={submitWithoutReset(action)} className="card pad" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="sec-title" style={{ margin: 0 }}>{user ? `แก้ไขบัญชี ${user.username}` : "สร้างบัญชีใหม่"}</div>
      <div className="form-grid">
        <div>
          <label className="lbl" htmlFor="role">บทบาท *</label>
          <select className="fld" id="role" name="role" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="pcu">เจ้าหน้าที่ รพ.สต.</option>
            <option value="clinician">แพทย์ / พยาบาล (รพ.)</option>
            <option value="admin">ผู้ดูแลระบบ (รพ.)</option>
          </select>
        </div>
        {role === "pcu" && (
          <div>
            <label className="lbl" htmlFor="facility">หน่วยบริการ *</label>
            <select className="fld" id="facility" name="facility" defaultValue={user?.facility ?? ""} required>
              <option value="" disabled>เลือกหน่วยบริการ</option>
              {facilities.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="lbl" htmlFor="username">ชื่อผู้ใช้สำหรับเข้าสู่ระบบ *</label>
          <input className="fld mono" id="username" name="username" defaultValue={user?.username} required placeholder="เช่น bandu.somsri" autoComplete="off" />
        </div>
        <div>
          <label className="lbl" htmlFor="displayName">ชื่อ–นามสกุล *</label>
          <input className="fld" id="displayName" name="displayName" defaultValue={user?.displayName} required />
        </div>
        <div>
          <label className="lbl" htmlFor="position">ตำแหน่ง</label>
          <input className="fld" id="position" name="position" defaultValue={user?.position ?? ""} placeholder="เช่น พยาบาลวิชาชีพ" />
        </div>
        <div>
          <label className="lbl" htmlFor="licenseNo">เลขใบประกอบวิชาชีพ</label>
          <input className="fld" id="licenseNo" name="licenseNo" defaultValue={user?.licenseNo ?? ""} />
        </div>
        <div>
          <label className="lbl" htmlFor="phone">เบอร์โทรศัพท์</label>
          <input className="fld" id="phone" name="phone" defaultValue={user?.phone ?? ""} inputMode="tel" />
        </div>
      </div>
      {state?.error && <div className="err" role="alert">{state.error}</div>}
      {state?.ok && !state.tempPassword && <div className="flash">{state.ok}</div>}
      <TempPassword s={state} />
      <button className="btn" type="submit" disabled={pending}>{user ? "บันทึกการแก้ไข" : "สร้างบัญชีและออกรหัสผ่านชั่วคราว"}</button>
    </form>
  );
}

// Asks first: the account is logged out everywhere and must use the new password.
export function ResetPasswordButton({ userId, username }: { userId: number; username: string }) {
  const [state, action, pending] = useActionState(resetPassword.bind(null, userId), undefined);
  const [asking, setAsking] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={action} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <button className="btn-s" type="button" disabled={pending} onClick={() => setAsking(true)}>ตั้งรหัสผ่านชั่วคราวใหม่</button>
      {asking && (
        <Modal title={`ตั้งรหัสผ่านชั่วคราวใหม่ให้ ${username}?`} onClose={() => setAsking(false)} closeLabel="ยกเลิก"
          actions={<button type="button" className="ui-btn primary" onClick={() => { formRef.current?.requestSubmit(); setAsking(false); }}>ตั้งรหัสใหม่</button>}>
          <p>รหัสเดิมจะใช้ไม่ได้ทันที และบัญชีนี้จะถูกออกจากระบบทุกเครื่อง เจ้าของบัญชีต้องใช้รหัสชั่วคราวที่ระบบจะแสดงในขั้นต่อไป</p>
        </Modal>
      )}
      {state?.error && <div className="err">{state.error}</div>}
      <TempPassword s={state} />
    </form>
  );
}
