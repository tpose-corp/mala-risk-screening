// /admin — the hospital back office overview: everything in the system at a glance, so the admin
// can monitor without opening each page (17 Nov 2026).
import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { PageHead } from "@/components/ui/card";
import { audit } from "@/lib/audit";
import { auditTargetNames } from "@/lib/audit-names";
import { describeRow, WARN_ACTIONS } from "@/lib/audit-text";
import { currentCriteria } from "@/lib/criteria";
import { db } from "@/lib/db";
import { thaiDate, thaiDateTime } from "@/lib/format";
import { num, periodStart } from "@/lib/paging";
import { requireAdmin } from "@/lib/session";
import { getSettings } from "@/lib/settings";

const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000);
// "วันนี้" / "เมื่อวาน" / "5 วันก่อน"
const ago = (d: Date) => {
  const n = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  return n <= 0 ? "วันนี้" : n === 1 ? "เมื่อวาน" : `${n} วันก่อน`;
};

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
  const people = await db.user.findMany({ select: { id: true, username: true, displayName: true, role: true, facility: true } });
  const names = await auditTargetNames(warnings);
  await audit({ user, action: "admin.dashboard.view" });

  // per unit, open units first, then by name
  const units = facilities
    .map((f) => ({
      f,
      patients: pick(patientsPerUnit, f.name)?._count._all ?? 0,
      screens: pick(perUnit, f.name)?._count._all ?? 0,
      alerts: pick(perUnitAlert, f.name)?._count._all ?? 0,
      last: pick(lastAt, f.name)?._max.createdAt ?? null,
    }))
    .sort((a, b) => Number(b.f.active) - Number(a.f.active) || a.f.name.localeCompare(b.f.name, "th"));
  const maxScreens = Math.max(1, ...units.map((u) => u.screens));

  // what the admin (or the hospital) should act on, in order of urgency
  const todo = [
    { n: waitDose, label: "ใช้ยาเกินขนาด รอ รพ. รับเรื่อง", note: "ต้องรับเรื่องโดยเร็ว", href: "/hospital?kind=dose", go: "ไปที่กล่องแจ้งเตือน", tone: "hi" },
    { n: waitLong, label: "แจ้งเตือนที่รอนานเกิน 24 ชั่วโมง", note: "ยังไม่มีใครรับเรื่อง", href: "/hospital", go: "ไปที่กล่องแจ้งเตือน", tone: "hi" },
    { n: waitRisk, label: "เสี่ยงทั่วไป รอ รพ. รับเรื่อง", note: "รับเรื่องและบันทึกการดำเนินการ", href: "/hospital?kind=risk", go: "ไปที่กล่องแจ้งเตือน", tone: "warn" },
    { n: pending, label: "ผู้ป่วยรอยืนยันตัวตน", note: "ตรวจเลขบัตรกับระบบ รพ. แล้วใส่ HN", href: "/admin/patients?status=pending", go: "ไปยืนยันตัวตน", tone: "warn" },
    { n: unconfirmed, label: "เคสที่ รพ.สต. ยังไม่ปิดเคส", note: "หน่วยนั้นจะคัดกรองรายใหม่ไม่ได้จนกว่าจะปิด", href: "/admin/patients", go: "ดูรายชื่อผู้ป่วย", tone: "warn" },
  ];
  const offRoles = [!settings.pcuEnabled && "เจ้าหน้าที่ รพ.สต.", !settings.clinicianEnabled && "แพทย์และพยาบาล"].filter(Boolean) as string[];

  return (
    <>
      <Topbar menu="overview" crumb="ภาพรวมระบบ" />
      <main className="ui-page">
        <PageHead sticky title="ภาพรวมระบบ" subtitle={<>ข้อมูล ณ {thaiDateTime(new Date())}</>} />

        {offRoles.length > 0 && (
          <div className="flash bad">ปิดการใช้งานอยู่ {offRoles.join(" และ ")} <Link href="/admin/settings">ไปที่ตั้งค่าระบบ</Link></div>
        )}

        <div className="ov-top">
          {/* 1. what needs doing */}
          <section className="ov-sec">
            <h2 className="ov-h">ต้องดำเนินการ<span>{todo.filter((t) => t.n > 0).length ? `ค้าง ${todo.filter((t) => t.n > 0).length} เรื่อง` : "ไม่มีงานค้าง"}</span></h2>
            <ul className="ov-todo">
              {todo.map((t) => (
                <li key={t.label} className={t.n > 0 ? `on ${t.tone}` : ""}>
                  <span className="ov-n">{num(t.n)}</span>
                  <span className="ov-what"><b>{t.label}</b><span>{t.n > 0 ? t.note : "ไม่มีค้าง"}</span></span>
                  {t.n > 0 && <Link href={t.href} className="ov-go">{t.go} ›</Link>}
                </li>
              ))}
            </ul>
          </section>

          {/* 2. screening numbers and the system */}
          <div className="ov-side">
            <section className="ov-sec">
              <h2 className="ov-h">การคัดกรอง</h2>
              <div className="ov-nums">
                <div><b>{num(screensToday)}</b><span>วันนี้</span></div>
                <div><b>{num(screens30)}</b><span>30 วันล่าสุด</span></div>
                <div><b>{num(patients)}</b><span>ผู้ป่วยในระบบ</span></div>
              </div>
            </section>
            <section className="ov-sec">
              <h2 className="ov-h">บัญชีและระบบ</h2>
              <dl className="ov-list">
                <dt>เจ้าหน้าที่ รพ.สต.</dt><dd><Link href="/admin/users?role=pcu">{num(roleCount("pcu"))} บัญชี</Link></dd>
                <dt>แพทย์และพยาบาล</dt><dd><Link href="/admin/users?role=clinician">{num(roleCount("clinician"))} บัญชี</Link></dd>
                <dt>ผู้ดูแลระบบ</dt><dd><Link href="/admin/users?role=admin">{num(roleCount("admin"))} บัญชี</Link>{inactiveUsers ? <span className="ov-muted"> ปิดใช้งานอยู่ {num(inactiveUsers)}</span> : null}</dd>
                <dt>เกณฑ์ที่ใช้อยู่</dt><dd><Link href="/admin/criteria" className="mono">{criteria.version}</Link></dd>
                <dt>การเข้าใช้ระบบ</dt><dd>{offRoles.length ? <Link href="/admin/settings" className="ov-bad">ปิดอยู่ {offRoles.join(" และ ")}</Link> : <span className="ov-ok">เปิดทุกบทบาท</span>}</dd>
              </dl>
            </section>
          </div>
        </div>

        {/* 3. per unit */}
        <section className="ui-card">
          <div className="ui-card-head">
            <div className="ui-card-title">แยกตามหน่วยบริการ<span className="ui-card-count">30 วันล่าสุด</span></div>
            <Link href="/admin/facilities" className="ui-link-btn">จัดการหน่วยบริการ ›</Link>
          </div>
          <div className="ui-table-wrap">
            <table className="ui-table ov-units">
              <colgroup><col /><col style={{ width: 130 }} /><col style={{ width: 230 }} /><col style={{ width: 130 }} /><col style={{ width: 170 }} /></colgroup>
              <thead><tr><th>หน่วยบริการ</th><th className="num">ผู้ป่วยประจำ</th><th>คัดกรอง</th><th className="num">แจ้งเตือน</th><th>คัดกรองล่าสุด</th></tr></thead>
              <tbody>
                {units.map(({ f, patients: np, screens, alerts, last }) => (
                  <tr key={f.id} className={f.active ? "" : "off"}>
                    <td><b>{f.name}</b>{!f.active && <span className="ui-badge muted" style={{ marginLeft: 8 }}>ปิดแล้ว</span>}</td>
                    <td className="num">{num(np)}</td>
                    <td>
                      <span className="ov-bar"><i style={{ width: `${(screens / maxScreens) * 100}%` }} /></span>
                      <span className="ov-bar-n">{num(screens)}</span>
                    </td>
                    <td className="num">{alerts ? <b className="ov-alert">{num(alerts)}</b> : <span className="ov-muted">0</span>}</td>
                    <td>{last ? <><span title={thaiDateTime(last)}>{thaiDate(last)}</span><span className="sub-line">{ago(last)}</span></> : <span className="ov-muted">ยังไม่เคย</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 4. what to keep an eye on */}
        <section className="ui-card">
          <div className="ui-card-head">
            <div className="ui-card-title">เหตุการณ์ที่ควรสังเกตล่าสุด</div>
            <Link href="/audit?warn=1" className="ui-link-btn">ดูทั้งหมดในบันทึกการใช้งาน ›</Link>
          </div>
          <ul className="ov-events">
            {warnings.map((w) => {
              const d = describeRow(w, people, names);
              return (
                <li key={w.id}>
                  <span className="ov-ev-time">{thaiDateTime(w.at)}</span>
                  <span className="ov-ev-what"><b>{d.what}</b>{d.target && <span>{d.target}</span>}</span>
                  <span className="ov-ev-who">{d.who}{d.whoNote && <span>{d.whoNote}</span>}</span>
                </li>
              );
            })}
            {warnings.length === 0 && <li className="ov-muted">ไม่มีเหตุการณ์ที่ต้องสังเกต</li>}
          </ul>
        </section>
      </main>
    </>
  );
}
