// /login — the page itself is a Server Component; only the form inside is a Client Component.
// Layout modelled on the team's printing-request system login, in the hospital colours.
// Motion is kept small on purpose (NN/g: 100 to 500 ms, feedback over decoration): one short
// fade-in on load, then only responses to what the user does (focus, press, loading, wrong
// password). Nothing loops. All motion is off for people who prefer reduced motion.
import { existsSync } from "node:fs";
import path from "node:path";
import { redirect } from "next/navigation";
import { getCurrentUser, homeOf } from "@/lib/session";
import { EcgLine } from "./ecg-line";
import { Emblem } from "./emblem";
import { LoginForm } from "./login-form";

// Drop an approved logo file at app/public/logo.png and it replaces the heart mark; no code change.
const hasLogo = existsSync(path.join(process.cwd(), "public", "logo.png"));

// Why the user is back here (?reason=), shown above the form.
const REASONS: Record<string, string> = {
  idle: "ออกจากระบบอัตโนมัติ เพราะไม่มีการใช้งานนานเกิน 30 นาที กรุณาเข้าสู่ระบบอีกครั้ง",
  expired: "ครบเวลาการเข้าใช้งาน 8 ชั่วโมงแล้ว กรุณาเข้าสู่ระบบอีกครั้ง",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const user = await getCurrentUser();
  if (user) redirect(homeOf(user.role)); // already logged in
  const reason = (await searchParams).reason;
  const notice = typeof reason === "string" ? REASONS[reason] : undefined;

  return (
    <main className="lg">
      <div className="lg-bg" aria-hidden="true" />

      <section className="lg-brand">
        <Emblem>
          {hasLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/logo.png" alt="โลโก้หน่วยงาน" />
          ) : (
            // heart with a small plus: care, not alarm (the ECG mark felt scary here)
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0016.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4.05 3 5.5l7 7z" />
              <path d="M12 8.6v5M9.5 11.1h5" />
            </svg>
          )}
        </Emblem>

        <p className="lg-org rise d1">โรงพยาบาลเชียงรายประชานุเคราะห์ และเครือข่ายหน่วยบริการปฐมภูมิ</p>
        <h1 className="lg-title rise d2">ระบบคัดกรองความเสี่ยง<br />ภาวะ <span className="accent">MALA</span></h1>
        <p className="lg-en rise d3">Metformin-Associated Lactic Acidosis Risk Screening</p>

        <EcgLine className="lg-ecg rise d3" />

        <p className="lg-notice rise d4">
          สำหรับเจ้าหน้าที่ที่ได้รับอนุญาตเท่านั้น การเข้าใช้งานทุกครั้งถูกบันทึกตาม พ.ร.บ. ว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์
        </p>
      </section>

      <section className="lg-side">
        <LoginForm notice={notice} />
        <p className="lg-foot">เวอร์ชัน 2.0 โครงการพัฒนาร่วมกับ รพ.เชียงรายประชานุเคราะห์</p>
      </section>
    </main>
  );
}
