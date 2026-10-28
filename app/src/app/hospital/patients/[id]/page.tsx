// /hospital/patients/[id] — one patient's whole screening history, for the referral-hospital doctor:
// who they are, how the key values changed since the first screening, and every screening.
import Link from "next/link";
import { notFound } from "next/navigation";
import { Topbar } from "@/components/topbar";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { ageFromThaiDob, thaiDate, thaiDateTime } from "@/lib/format";
import { changeText, trendsOf } from "@/lib/history";
import { requireHospital } from "@/lib/session";

export default async function PatientHistoryPage({ params }: PageProps<"/hospital/patients/[id]">) {
  const user = await requireHospital();
  const id = Number((await params).id);
  const patient = Number.isInteger(id)
    ? await db.patient.findUnique({
        where: { id },
        include: { screenings: { orderBy: { createdAt: "desc" }, include: { screener: true } } },
      })
    : null;
  if (!patient) notFound();
  await audit({ user, action: "hospital.patient.history.view", entity: "Patient", entityId: patient.id, detail: `screenings=${patient.screenings.length}` });

  const list = patient.screenings;
  const trends = trendsOf(list);
  const fmt = (n: number, d: number) => (d ? n.toFixed(d) : String(Math.round(n)));
  const alerts = list.filter((s) => s.isAlert).length;

  return (
    <>
      <Topbar menu="cases" crumb="ประวัติผู้ป่วย" />
      <main className="page">
        <div className="card doc">
          <div className="doc-head">
            <div>
              <div className="doc-label">ผู้ป่วย</div>
              <div className="doc-name">{patient.name}</div>
              <div className="doc-meta">
                HN {patient.hn ?? "ยังไม่มี"} {patient.sex} อายุ {ageFromThaiDob(patient.dob)} ปี {patient.facility}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="doc-label">คัดกรองทั้งหมด</div>
              <div className="doc-status">{list.length} ครั้ง</div>
              {alerts > 0 && <div className="doc-meta" style={{ color: "var(--hi)" }}>แจ้งเตือน {alerts} ครั้ง</div>}
            </div>
          </div>
          {list.length > 0 && (
            <section className="doc-sec">
              <dl className="doc-rows">
                <dt>ครั้งแรก</dt>
                <dd>{thaiDate(list[list.length - 1].createdAt)}</dd>
                <dt>ครั้งล่าสุด</dt>
                <dd>{thaiDate(list[0].createdAt)}</dd>
              </dl>
            </section>
          )}
        </div>

        {trends && (
          <div className="card pad">
            <div className="sec-title">การเปลี่ยนแปลงตั้งแต่ครั้งแรก</div>
            <table className="measure">
              <thead>
                <tr><th /><th>ครั้งแรก</th><th>ครั้งล่าสุด</th><th>เปลี่ยนแปลง</th></tr>
              </thead>
              <tbody>
                {trends.map((t) => (
                  <tr key={t.label}>
                    <td>{t.label}</td>
                    <td>{fmt(t.first, t.decimals)} {t.unit}</td>
                    <td><b>{fmt(t.latest, t.decimals)}</b> {t.unit}</td>
                    <td className={t.label === "eGFR" && t.diff < 0 ? "worse" : undefined}>{changeText(t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="card" style={{ overflowX: "auto" }}>
          <div className="sec-title" style={{ padding: "18px 20px 0" }}>ทุกครั้งที่คัดกรอง</div>
          <table className="plist">
            <thead>
              <tr><th>วันที่คัดกรอง</th><th>eGFR</th><th>ขนาดยา</th><th>BMI</th><th>คะแนน</th><th>ผล</th><th>สถานะ</th><th>คัดกรองโดย</th><th /></tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{thaiDateTime(s.createdAt)}</td>
                  <td>{s.egfr}</td>
                  <td>{s.doseMgDay}</td>
                  <td>{s.bmi.toFixed(1)}</td>
                  <td>{s.riskScore}</td>
                  <td><span className={`pill ${s.isAlert ? "hi" : "ok"}`}>{s.isAlert ? "แจ้งเตือน" : "ไม่แจ้งเตือน"}</span></td>
                  <td style={{ color: "var(--ink-2)" }}>
                    {s.confirmedAt ? "ปิดเคสแล้ว" : "ยังไม่ปิดเคส"}
                    {s.isAlert && <><br /><span className="note">{s.acknowledgedAt ? "รพ. รับเรื่องแล้ว" : "รอรับเรื่อง"}</span></>}
                  </td>
                  <td style={{ color: "var(--ink-2)" }}>{s.screener.displayName}</td>
                  <td style={{ textAlign: "right" }}><Link href={`/hospital/cases/${s.id}`} className="btn-s">ดูเคส</Link></td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>ยังไม่เคยคัดกรอง</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div><Link href="/hospital/cases" className="btn-s">กลับไปข้อมูลทุกเคส</Link></div>
      </main>
    </>
  );
}
