// /hospital/patients/[id] — one patient's whole screening history, for the referral-hospital doctor:
// who they are, how the key values changed since the first screening, and every screening.
import Link from "next/link";
import { Fragment } from "react";
import { notFound } from "next/navigation";
import { Topbar } from "@/components/topbar";
import { Card, PageHead } from "@/components/ui/card";
import { safeBack, withBack } from "@/lib/back-link";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { ageFromThaiDob, formatCardId, thaiDate, thaiDateTime } from "@/lib/format";
import { changeText, trendsOf } from "@/lib/history";
import { requireHospital } from "@/lib/session";

export default async function PatientHistoryPage({ params, searchParams }: PageProps<"/hospital/patients/[id]">) {
  const user = await requireHospital();
  const id = Number((await params).id);
  const patient = Number.isInteger(id)
    ? await db.patient.findUnique({
        where: { id },
        include: { screenings: { orderBy: { createdAt: "desc" }, include: { screener: true, followUpBy: true, followUpNotes: { include: { by: true }, orderBy: { at: "asc" } } } } },
      })
    : null;
  if (!patient) notFound();
  await audit({ user, action: "hospital.patient.history.view", entity: "Patient", entityId: patient.id, detail: `screenings=${patient.screenings.length}` });

  const list = patient.screenings;
  // "กลับ" returns to the list this patient was opened from (?back=), else all cases
  const back = safeBack((await searchParams).back, ["/hospital", "/admin/patients"]) || "/hospital/cases";
  const here = withBack(`/hospital/patients/${patient.id}`, back);
  const trends = trendsOf(list);
  const fmt = (n: number, d: number) => (d ? n.toFixed(d) : String(Math.round(n)));
  const alerts = list.filter((s) => s.isAlert).length;

  const kindBadge = (x: (typeof list)[number]) =>
    x.alertKind === "dose" ? <span className="ui-badge hi">ใช้ยาเกินขนาด</span>
      : x.isAlert ? <span className="ui-badge warn">เสี่ยงทั่วไป</span>
      : <span className="ui-badge ok">ไม่แจ้งเตือน</span>;

  return (
    <>
      <Topbar menu="cases" crumb="ประวัติผู้ป่วย" />
      <main className="ui-page">
        <PageHead
          sticky
          back={back}
          title={patient.name}
          subtitle={<>HN {patient.hn ?? "ยังไม่มี"} {patient.sex} อายุ {ageFromThaiDob(patient.dob)} ปี {patient.status === "pending" && <span className="ui-badge warn">รอยืนยันตัวตน</span>}</>}
          actions={<>
            {user.role === "admin" && <Link href={`/admin/patients/${patient.id}`} className="ui-btn primary">จัดการข้อมูลผู้ป่วย</Link>}
          </>}
        />

        <div className="ui-stats">
          <div className="ui-stat"><div className="label">คัดกรองทั้งหมด</div><div className="value">{list.length} <small>ครั้ง</small></div></div>
          <div className={`ui-stat${alerts ? " hi" : ""}`}><div className="label">แจ้งเตือน</div><div className="value">{alerts} <small>ครั้ง</small></div></div>
          <div className="ui-stat"><div className="label">ครั้งแรก</div><div className="value small">{list.length ? thaiDate(list[list.length - 1].createdAt) : "ยังไม่เคย"}</div></div>
          <div className="ui-stat"><div className="label">ครั้งล่าสุด</div><div className="value small">{list.length ? thaiDate(list[0].createdAt) : "ยังไม่เคย"}</div></div>
        </div>

        <div className="ui-split">
          <div className="ui-col">
            {trends && (
              <Card title="การเปลี่ยนแปลงตั้งแต่ครั้งแรก">
                <div className="ui-table-wrap">
                  <table className="ui-table">
                    <thead><tr><th /><th className="num">ครั้งแรก</th><th className="num">ครั้งล่าสุด</th><th>เปลี่ยนแปลง</th></tr></thead>
                    <tbody>
                      {trends.map((t) => (
                        <tr key={t.label}>
                          <td>{t.label}</td>
                          <td className="num">{fmt(t.first, t.decimals)} {t.unit}</td>
                          <td className="num"><b>{fmt(t.latest, t.decimals)}</b> {t.unit}</td>
                          <td style={t.label === "eGFR" && t.diff < 0 ? { color: "var(--hi)", fontWeight: 600 } : undefined}>{changeText(t)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
          <div className="ui-col">
            <Card title="ข้อมูลผู้ป่วย">
              <dl className="ui-rows">
                <dt>เลขประจำตัวประชาชน</dt><dd className="mono">{formatCardId(patient.cardId)}</dd>
                <dt>วันเกิด</dt><dd>{patient.dob}</dd>
                <dt>หน่วยบริการประจำ</dt><dd>{patient.facility ?? "ยังไม่มี"}</dd>
                <dt>ลงทะเบียน</dt><dd>{thaiDateTime(patient.registeredAt)}</dd>
                <dt>แก้ไขล่าสุด</dt><dd>{thaiDateTime(patient.updatedAt)}</dd>
              </dl>
            </Card>
          </div>
        </div>

        <Card title="ทุกครั้งที่คัดกรอง" count={`${list.length} ครั้ง`}>
          <div className="ui-table-wrap sticky-head">
            <table className="ui-table">
              <thead>
                <tr><th>วันที่คัดกรอง</th><th>หน่วยที่ตรวจ</th><th className="num">eGFR</th><th className="num">ขนาดยา</th><th className="num">BMI</th><th className="num">คะแนน</th><th>ผล</th><th>สถานะ</th><th /></tr>
              </thead>
              <tbody>
                {list.map((x) => {
                  // doctor / nurse notes, attached under the screening they belong to (oldest first)
                  const notes = x.followUpNotes.length
                    ? x.followUpNotes.map((n) => ({ id: n.id, at: n.at, by: n.by.displayName, note: n.note }))
                    : x.followUpNote && x.followUpAt ? [{ id: 0, at: x.followUpAt, by: x.followUpBy?.displayName ?? "", note: x.followUpNote }] : [];
                  return (
                  <Fragment key={x.id}>
                  <tr className={notes.length ? "has-notes" : undefined}>
                    <td style={{ whiteSpace: "nowrap" }}>{thaiDateTime(x.createdAt)}<span className="sub-line">โดย {x.screener.displayName}</span></td>
                    <td>{x.facility}</td>
                    <td className="num">{x.egfr}</td>
                    <td className="num">{x.doseMgDay}</td>
                    <td className="num">{x.bmi.toFixed(1)}</td>
                    <td className="num">{x.riskScore}</td>
                    <td>{kindBadge(x)}</td>
                    <td>
                      {x.confirmedAt ? `ยืนยันแล้ว` : "ยังไม่ยืนยัน"}
                      {x.confirmedAt && <span className="sub-line">{thaiDateTime(x.confirmedAt)}</span>}
                      {x.isAlert && <span className="sub-line">{x.acknowledgedAt ? "รพ. รับเรื่องแล้ว" : "รอรับเรื่อง"}</span>}
                    </td>
                    <td style={{ textAlign: "right" }}><Link href={withBack(`/hospital/cases/${x.id}`, here)} className="ui-btn secondary sm">ดูเคส</Link></td>
                  </tr>
                  {notes.length > 0 && (
                    <tr className="note-row">
                      <td colSpan={9}>
                        <div className="note-row-h">การดำเนินการของ รพ. ({notes.length})</div>
                        <ul>
                          {notes.map((n, i) => (
                            <li key={n.id || i}><span className="t">{thaiDateTime(n.at)} {n.by}</span>{n.note}</li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                  );
                })}
                {list.length === 0 && <tr><td colSpan={9} className="ui-empty">ยังไม่เคยคัดกรอง</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </>
  );
}
