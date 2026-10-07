// /login — the page itself is a Server Component; only the form inside is a Client Component.
// Left panel kept plain on purpose, like an institutional system's sign-in page:
// organisation, system name, usage notice, version. No decorative graphics.
import { existsSync } from "node:fs";
import path from "node:path";
import { redirect } from "next/navigation";
import { getCurrentUser, isHospital } from "@/lib/session";
import { LoginForm } from "./login-form";

// Drop an approved logo file at app/public/logo.png and it replaces the nurse icon; no code change.
const hasLogo = existsSync(path.join(process.cwd(), "public", "logo.png"));

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(isHospital(user) ? "/hospital" : "/patients"); // already logged in

  return (
    <main className="login">
      <section className="left">
        <div className="org">
          <div className="logo-slot">
            {hasLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/logo.png" alt="โลโก้หน่วยงาน" />
            ) : (
              <NurseMark />
            )}
          </div>
          <div>
            <div className="org-name">เครือข่ายหน่วยบริการปฐมภูมิ</div>
            <div className="org-sub">อำเภอเมือง จังหวัดเชียงราย</div>
          </div>
        </div>

        <div className="system">
          <h1 className="title">ระบบคัดกรองความเสี่ยงภาวะ MALA</h1>
          <div className="title-en">Metformin-Associated Lactic Acidosis Risk Screening</div>
          <p className="desc">สำหรับบุคลากรในหน่วยบริการปฐมภูมิ ใช้คัดกรองผู้ป่วยเบาหวานที่ได้รับยา Metformin และส่งต่อโรงพยาบาลแม่ข่าย</p>
        </div>

        <div className="notice">
          สำหรับเจ้าหน้าที่ที่ได้รับอนุญาตเท่านั้น การเข้าใช้งานทุกครั้งถูกบันทึกตาม พ.ร.บ. ว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์
        </div>

        <div className="foot">
          <span>เวอร์ชัน 0.1 ทดลองใช้</span>
          <span>โครงการพัฒนาร่วมกับ รพ.เชียงรายประชานุเคราะห์</span>
        </div>
      </section>

      <section className="right">
        <LoginForm />
      </section>
    </main>
  );
}

// Nurse cap with a cross: same drawing as the browser-tab icon (src/app/icon.svg).
function NurseMark() {
  return (
    <svg width="40" height="40" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M13 41c0-13 8.5-21 19-21s19 8 19 21z" fill="#5e1146" />
      <rect x="10" y="40" width="44" height="8" rx="4" fill="#5e1146" />
      <rect x="29" y="25" width="6" height="13" rx="1.5" fill="#fff" />
      <rect x="25.5" y="28.5" width="13" height="6" rx="1.5" fill="#fff" />
    </svg>
  );
}
