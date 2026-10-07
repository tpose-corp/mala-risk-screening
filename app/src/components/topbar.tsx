// App shell for every logged-in page: a left sidebar like the network's NPCU site (system name,
// menu, who is logged in, logout) and a header over the content (where you are + the 5 steps).
// Still called <Topbar> so every page keeps working without changes.
// A Server Component, so it can read the user and the database directly.
import Link from "next/link";
import { logout } from "@/app/actions";
import { db } from "@/lib/db";
import { ROLE_LABEL, isHospital, requireUser } from "@/lib/session";

const STEPS = ["ค้นหาผู้ป่วย", "กรอกข้อมูล", "ผลประเมิน", "แจ้งเตือนและคำแนะนำ", "ยืนยัน"];

type Menu = "patients" | "new" | "alerts" | "cases" | "audit";

export async function Topbar({ step, crumb, menu }: { step?: number; crumb?: string; menu?: Menu }) {
  const user = await requireUser();
  const hospital = isHospital(user);
  const waiting = hospital ? await db.screening.count({ where: { isAlert: true, acknowledgedAt: null } }) : 0;
  const active = menu;
  const initials = user.displayName.replace(/^(นพ\.|พญ\.|นาย|นาง|น\.ส\.)\s*/, "").slice(0, 2);

  return (
    <>
      <aside className="sidebar">
        <Link href={hospital ? "/hospital" : "/patients"} className="side-brand">
          <span className="mark">
            <i>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </i>
            MALA Screening
          </span>
          <span className="org">ระบบคัดกรองความเสี่ยง MALA<br />เครือข่ายหน่วยบริการปฐมภูมิ อำเภอเมือง เชียงราย</span>
        </Link>

        <nav className="side-nav" aria-label="เมนูหลัก">
          {hospital ? (
            <>
              <span className="grp">โรงพยาบาลแม่ข่าย</span>
              <Link href="/hospital" className={active === "alerts" ? "on" : ""}>
                กล่องแจ้งเตือน {waiting > 0 && <span className="badge">{waiting}</span>}
              </Link>
              <Link href="/hospital/cases" className={active === "cases" ? "on" : ""}>ข้อมูลทุกเคส</Link>
            </>
          ) : (
            <>
              <span className="grp">งานคัดกรอง</span>
              <Link href="/patients" className={active === "patients" ? "on" : ""}>ค้นหาผู้ป่วย</Link>
              <Link href="/patients/new" className={active === "new" ? "on" : ""}>เพิ่มผู้ป่วยใหม่</Link>
            </>
          )}
          {user.role === "admin" && (
            <>
              <span className="grp">ผู้ดูแลระบบ</span>
              <Link href="/audit" className={active === "audit" ? "on" : ""}>บันทึกการใช้งาน</Link>
            </>
          )}
        </nav>

        <div className="side-user">
          <div className="who2">
            <span className="av">{initials}</span>
            <div>
              <div className="name">{user.displayName}</div>
              <div className="role">{ROLE_LABEL[user.role] ?? user.role}</div>
              <div className="fac">{user.facility}</div>
            </div>
          </div>
          <form action={logout}>
            <button type="submit">ออกจากระบบ</button>
          </form>
        </div>
      </aside>

      <header className="app-head">
        <div className="crumb">
          {user.facility}
          {crumb && <> <span aria-hidden="true">›</span> <b>{crumb}</b></>}
        </div>
        {!hospital && step !== undefined && (
          <div className="steps5" aria-label="ขั้นตอนการคัดกรอง">
            {STEPS.map((s, i) => (
              <span key={s} className={i === step ? "step-on" : i < step ? "step-done" : ""} aria-current={i === step ? "step" : undefined}>
                <i>{i < step ? "✓" : i + 1}</i>
                {s}
              </span>
            ))}
          </div>
        )}
      </header>
    </>
  );
}
