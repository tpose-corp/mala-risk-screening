// /admin — the hospital back office overview: everything in the system at a glance, so the admin
// can monitor without opening each page (17 Nov 2026).
import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { PageHead } from "@/components/ui/card";
import { audit } from "@/lib/audit";
import { describeAction, WARN_ACTIONS } from "@/lib/audit-text";
import { currentCriteria } from "@/lib/criteria";
import { db } from "@/lib/db";
import { thaiDateTime } from "@/lib/format";
import { num, periodStart } from "@/lib/paging";
import { requireAdmin } from "@/lib/session";
import { getSettings } from "@/lib/settings";

const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000);

export default async function AdminHome() {
  const user = await requireAdmin();
  const today = periodStart("today")!;
  const d30 = periodStart("30d")!;
  const dayAgo = hoursAgo(24);

  const [usersByRole, inactiveUsers, facilities, patients, pending, screensToday, screens30, waitDose, waitRisk, waitLong, unconfirmed] = await Promise.all([
    db.user.groupBy({ by: ["role"], where: { active: true }, _count: { _all: true } }),
    db.user.count({ where: { active: false } }),
    db.facility.findMany({ orderBy: { name: "asc" } }),
    db.patient.count({ where: { active: true } }),
    db.patient.count({ where: { active: true, status: "pending" } }),
    db.screening.count({ where: { createdAt: { gte: today } } }),
    db.screening.count({ where: { createdAt: { gte: d30 } } }),
    db.screening.count({ where: { isAlert: true, alertKind: "dose", acknowledgedAt: null } }),
    db.screening.count({ where: { isAlert: true, alertKind: "risk", acknowledgedAt: null } }),
    db.screening.count({ where: { isAlert: true, acknowledgedAt: null, alertRaisedAt: { lt: dayAgo } } }),
    db.screening.count({ where: { confirmedAt: null } }),
  ]);
  const roleCount = (r: string) => usersByRole.find((x) => x.role === r)?._count._all ?? 0;

  // Per unit, last 30 days.
  const perUnit = await db.screening.groupBy({ by: ["facility"], where: { createdAt: { gte: d30 } }, _count: { _all: true } });
  const perUnitAlert = await db.screening.groupBy({ by: ["facility"], where: { createdAt: { gte: d30 }, isAlert: true }, _count: { _all: true } });
  const lastAt = await db.screening.groupBy({ by: ["facility"], _max: { createdAt: true } });
  const patientsPerUnit = await db.patient.groupBy({ by: ["facility"], where: { active: true }, _count: { _all: true } });
  const pick = <T extends { facility: string | null }>(list: T[], f: string) => list.find((x) => x.facility === f);

  const criteria = await currentCriteria();
  const settings = await getSettings();
  const warnings = await db.auditLog.findMany({ where: { action: { in: WARN_ACTIONS } }, orderBy: { at: "desc" }, take: 6 });
  await audit({ user, action: "admin.dashboard.view" });

  return (
    <>
      <Topbar menu="overview" crumb="ภาพรวมระบบ" />
      <main className="ui-page">
        <PageHead sticky title="ภาพรวมระบบ" subtitle={<>ข้อมูล ณ {thaiDateTime(new Date())}</>} />

        {(!settings.pcuEnabled || !settings.clinicianEnabled) && (
          <div className="flash bad">
            ปิดการใช้งานอยู่: {[!settings.pcuEnabled && "เจ้าหน้าที่ รพ.สต.", !settings.clinicianEnabled && "แพทย์ / พยาบาล"].filter(Boolean).join(" และ ")}{" "}
            <Link href="/admin/settings">ไปที่ตั้งค่าระบบ</Link>
          </div>
        )}

        <div className="tiles">
          <Link href="/hospital?kind=dose" className={`stat${waitDose ? " hi" : ""}`} style={{ textDecoration: "none" }}><div className="v">{num(waitDose)}</div><div className="k">ใช้ยาเกินขนาด รอรับเรื่อง</div></Link>
          <Link href="/hospital?kind=risk" className={`stat${waitRisk ? " warn" : ""}`} style={{ textDecoration: "none" }}><div className="v">{num(waitRisk)}</div><div className="k">เสี่ยงทั่วไป รอรับเรื่อง</div></Link>
          <div className={`stat${waitLong ? " hi" : ""}`}><div className="v">{num(waitLong)}</div><div className="k">แจ้งเตือนที่รอเกิน 24 ชั่วโมง</div></div>
          <Link href="/admin/patients?status=pending" className={`stat${pending ? " warn" : ""}`} style={{ textDecoration: "none" }}><div className="v">{num(pending)}</div><div className="k">ผู้ป่วยรอยืนยันตัวตน</div></Link>
          <div className="stat"><div className="v">{num(screensToday)}</div><div className="k">คัดกรองวันนี้</div></div>
          <div className="stat"><div className="v">{num(screens30)}</div><div className="k">คัดกรอง 30 วันล่าสุด</div></div>
          <div className="stat"><div className="v">{num(unconfirmed)}</div><div className="k">ผลที่ รพ.สต. ยังไม่กดยืนยัน</div></div>
          <div className="stat"><div className="v">{num(patients)}</div><div className="k">ผู้ป่วยในระบบ</div></div>
        </div>

        <div className="tiles">
          <Link href="/admin/users" className="stat" style={{ textDecoration: "none" }}><div className="v">{roleCount("pcu")}</div><div className="k">บัญชีเจ้าหน้าที่ รพ.สต.</div></Link>
          <Link href="/admin/users" className="stat" style={{ textDecoration: "none" }}><div className="v">{roleCount("clinician")}</div><div className="k">บัญชีแพทย์ / พยาบาล</div></Link>
          <Link href="/admin/users" className="stat" style={{ textDecoration: "none" }}><div className="v">{roleCount("admin")}</div><div className="k">บัญชีผู้ดูแลระบบ{inactiveUsers ? ` (ปิดใช้งาน ${inactiveUsers})` : ""}</div></Link>
          <Link href="/admin/criteria" className="stat" style={{ textDecoration: "none" }}><div className="v" style={{ fontSize: 15 }}>{criteria.version}</div><div className="k">เกณฑ์ที่ใช้อยู่</div></Link>
        </div>

        <div className="card" style={{ overflowX: "auto" }}>
          <div className="sec-title" style={{ padding: "16px 16px 0" }}>แยกตามหน่วยบริการ (30 วันล่าสุด)</div>
          <table className="grid">
            <thead><tr><th>หน่วยบริการ</th><th>สถานะ</th><th>ผู้ป่วยประจำ</th><th>คัดกรอง</th><th>แจ้งเตือน</th><th>คัดกรองล่าสุด</th></tr></thead>
            <tbody>
              {facilities.map((f) => {
                const last = pick(lastAt, f.name)?._max.createdAt;
                return (
                  <tr key={f.id} className={f.active ? "" : "off"}>
                    <td style={{ fontWeight: 600 }}>{f.name}</td>
                    <td>{f.active ? <span className="pill ok">เปิด</span> : <span className="pill warn">ปิด</span>}</td>
                    <td>{num(pick(patientsPerUnit, f.name)?._count._all ?? 0)}</td>
                    <td>{num(pick(perUnit, f.name)?._count._all ?? 0)}</td>
                    <td>{num(pick(perUnitAlert, f.name)?._count._all ?? 0)}</td>
                    <td className="time">{last ? thaiDateTime(last) : "ยังไม่เคย"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="card pad">
          <div className="part-h">
            <div className="sec-title" style={{ margin: 0 }}>เหตุการณ์ที่ควรสังเกตล่าสุด</div>
            <Link href="/audit?warn=1" className="btn-s">ดูบันทึกการใช้งานทั้งหมด</Link>
          </div>
          <table className="grid">
            <tbody>
              {warnings.map((w) => (
                <tr key={w.id}><td className="time">{thaiDateTime(w.at)}</td><td>{describeAction(w.action).label}</td><td className="note">{w.username ?? "ไม่ผ่านหน้าเว็บ"}</td></tr>
              ))}
              {warnings.length === 0 && <tr><td className="note">ไม่มี</td></tr>}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
