// /closed — shown when the hospital admin has switched off the system for this user's role.
// Same colours as the login page (hospital purple), a plain "sorry, closed for
// now" card with the admin's own message and contact, and a nurse badge bouncing across the whole
// screen behind the card like a DVD player's idle screen (bouncing-nurse.tsx).
import Link from "next/link";
import { connection } from "next/server";
import { logout } from "@/app/actions";
import { getSettings } from "@/lib/settings";
import { BouncingNurse } from "./bouncing-nurse";

// Thai has no spaces between words, so the browser may break a line inside a name
// ("โรง / พยาบาล"). Keep each phrase the admin separated with a space together on one line;
// a phrase longer than the whole line still wraps inside itself.
const phrases = (text: string) =>
  text.split(/(\s+)/).map((part, i) => (i % 2 ? " " : part && <span key={i} className="cl-phrase">{part}</span>));

export default async function ClosedPage() {
  await connection(); // read the settings per request, never at build time
  const s = await getSettings();
  return (
    <main className="cl-page">
      <div className="lg-bg" aria-hidden="true" />
      <BouncingNurse />

      <div className="cl-wrap">
        <p className="cl-org">โรงพยาบาลเชียงรายประชานุเคราะห์<br />ระบบคัดกรองความเสี่ยงภาวะ MALA</p>

        <section className="cl-card" aria-labelledby="cl-title">
          <h1 id="cl-title" className="cl-title">ขออภัยในความไม่สะดวก</h1>
          <p className="cl-message">{phrases(s.closedMessage)}</p>

          <div className="cl-contact">
            <span className="cl-contact-label">ติดต่อสอบถาม</span>
            <b>{phrases(s.adminContact)}</b>
          </div>

          <div className="cl-actions">
            <Link href="/" className="ui-btn primary">ลองเข้าใช้งานอีกครั้ง</Link>
            <form action={logout}><button className="ui-btn secondary" type="submit">ออกจากระบบ</button></form>
          </div>
        </section>
      </div>
    </main>
  );
}
