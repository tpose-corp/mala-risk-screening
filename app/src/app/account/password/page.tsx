// /account/password — every account starts with a temporary password set by the hospital admin
// and must pick its own here before using the system. Anyone can come back to change it later.
import { Topbar } from "@/components/topbar";
import { requireUser } from "@/lib/session";
import { PasswordForm } from "./password-form";

export default async function PasswordPage() {
  const user = await requireUser({ allowPasswordChange: true });
  return (
    <>
      {!user.mustChangePassword && <Topbar crumb="เปลี่ยนรหัสผ่าน" />}
      <main className="page" style={user.mustChangePassword ? { marginLeft: "auto", marginRight: "auto", maxWidth: 520, paddingTop: 60 } : undefined}>
        <div className="narrow">
          <div>
            <h1 className="h1">{user.mustChangePassword ? "ตั้งรหัสผ่านของคุณ" : "เปลี่ยนรหัสผ่าน"}</h1>
            <div className="sub">
              {user.mustChangePassword
                ? `สวัสดี ${user.displayName} บัญชีนี้ใช้รหัสผ่านชั่วคราวที่ผู้ดูแลระบบตั้งให้ กรุณาตั้งรหัสผ่านใหม่ก่อนเริ่มใช้งาน`
                : "รหัสผ่านใหม่ต้องยาวอย่างน้อย 8 ตัวอักษร และมีทั้งตัวอักษรและตัวเลข"}
            </div>
          </div>
          <PasswordForm />
        </div>
      </main>
    </>
  );
}
