// /hospital/cases/[id] — one case as the hospital doctor sees it: what was measured, why it is
// (or isn't) an alert, what the รพ.สต. already did, and the "รับเรื่องแล้ว" button.
import Link from "next/link";
import { Fragment } from "react";
import { Card, PageHead } from "@/components/ui/card";
import { safeBack, withBack } from "@/lib/back-link";
import { Topbar } from "@/components/topbar";
import { ALCOHOL_LABEL, TRIGGER_KEYS, TRIGGER_LABEL, ageFromThaiDob, thaiDateTime } from "@/lib/format";
import { loadCaseForHospital } from "@/lib/hospital";
import { alertReasons } from "@/lib/reasons";
import { requireHospital } from "@/lib/session";
import { acknowledgeAlert, saveFollowUp } from "../../actions";

export default async function HospitalCasePage({ params, searchParams }: PageProps<"/hospital/cases/[id]">) {
  const user = await requireHospital();
  const s = await loadCaseForHospital((await params).id, user);
  const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
  const found = TRIGGER_KEYS.filter((k) => s[k]);


  const timeline = [
    { t: s.createdAt, text: `คัดกรองโดย ${s.screener.displayName} ที่ ${s.facility}` },
    s.updatedAt.getTime() - s.createdAt.getTime() > 1000 && { t: s.updatedAt, text: "แก้ไขข้อมูลล่าสุด" },
    s.alertRaisedAt && { t: s.alertRaisedAt, text: "ระบบแจ้งเตือนเข้ากล่องแจ้งเตือนของ รพ." },
    s.adviceGivenAt && { t: s.adviceGivenAt, text: "เจ้าหน้าที่ รพ.สต. แจ้งคำแนะนำให้ผู้ป่วยแล้ว" },
    s.confirmedAt && { t: s.confirmedAt, text: `ปิดเคสฝั่ง รพ.สต. โดย ${s.confirmedBy?.displayName}` },
    s.acknowledgedAt && { t: s.acknowledgedAt, text: `รพ. รับเรื่องโดย ${s.acknowledgedBy?.displayName}` },
    s.followUpAt && { t: s.followUpAt, text: `บันทึกการดำเนินการโดย ${s.followUpBy?.displayName}` },
  ].filter(Boolean) as { t: Date; text: string }[];
  timeline.sort((a, b) => a.t.getTime() - b.t.getTime());

  const tone = s.alertKind === "dose" ? "hi" : s.isAlert ? "warn" : "ok";
  const label = s.alertKind === "dose" ? "ใช้ยาเกินขนาด" : s.isAlert ? "เกณฑ์เสี่ยงทั่วไป" : "ไม่แจ้งเตือน";
  // "กลับ" returns to the exact list this case was opened from (?back=), else a sensible default
  const back = safeBack((await searchParams).back, ["/hospital", "/admin/patients"]) || (s.isAlert ? `/hospital?kind=${s.alertKind ?? "risk"}` : "/hospital/cases");
  const here = withBack(`/hospital/cases/${s.id}`, back);

  return (
    <>
      <Topbar menu={s.isAlert ? "alerts" : "cases"} crumb="รายละเอียดเคส" />
      <main className="ui-page">
        <PageHead
          sticky
          back={back}
          title={s.patient.name}
          subtitle={<>HN {s.patient.hn ?? "ยังไม่มี"} {s.patient.sex} อายุ {ageFromThaiDob(s.patient.dob)} ปี คัดกรองที่ {s.facility}{s.patient.facility && s.patient.facility !== s.facility ? ` (หน่วยประจำ ${s.patient.facility})` : ""} เมื่อ {thaiDateTime(s.createdAt)}</>}
          actions={<>
            <Link href={withBack(`/hospital/patients/${s.patientId}`, here)} className="ui-btn secondary">ประวัติการคัดกรองทั้งหมด</Link>
          </>}
        />

        <div className={`ui-outcome ${tone}`}>
          <span className={`ui-badge ${tone}`}>{label}</span>
          <ul>
            {(s.isAlert ? alertReasons(s) : ["ขนาดยาเหมาะสม", "คะแนนความเสี่ยงไม่ถึงเกณฑ์"]).map((r) => <li key={r}>{r}</li>)}
          </ul>
        </div>

        <div className="ui-split">
          <div className="ui-col">
            <Card title="ค่าที่วัดได้">
              <dl className="ui-rows">
                <dt>eGFR</dt><dd>{fmt(s.egfr)}{s.egfrDate && <span className="sub-line">ตรวจเมื่อ {s.egfrDate}</span>}</dd>
                <dt>ขนาดยา Metformin</dt><dd>{s.doseMgDay} มก./วัน <span className="sub-line">เกณฑ์ CPG {s.maxDoseMgDay === 0 ? "ห้ามใช้ยา" : `ไม่เกิน ${s.maxDoseMgDay} มก./วัน`}</span></dd>
                <dt>น้ำหนัก / ส่วนสูง</dt><dd>{fmt(s.weightKg)} กก. / {fmt(s.heightCm)} ซม.</dd>
                <dt>BMI</dt><dd>{s.bmi.toFixed(1)}</dd>
                <dt>การดื่มแอลกอฮอล์</dt><dd>{ALCOHOL_LABEL[s.alcohol]}</dd>
                <dt>คะแนนความเสี่ยง MALA</dt><dd><b>{s.riskScore} คะแนน</b> <span className="sub-line">eGFR +{s.scoreEgfr}, BMI +{s.scoreBmi}, ดื่มหนัก +{s.scoreAlcohol} (เกณฑ์ {s.ruleVersion})</span></dd>
              </dl>
            </Card>
            <Card title="ปัจจัยกระตุ้นที่พบ" count={found.length ? `${found.length} ข้อ` : "ไม่พบ"}>
              <dl className="ui-rows">
                {TRIGGER_KEYS.map((k) => (
                  <Fragment key={k}>
                    <dt>{TRIGGER_LABEL[k]}</dt>
                    <dd>
                      {s[k] ? <span className="ui-badge warn">พบ</span> : <span className="ui-badge muted">ไม่พบ</span>}
                      {k === "nsaid" && s.nsaidNote && <span className="sub-line">ระบุ: {s.nsaidNote}</span>}
                      {k === "herbal" && s.herbalNote && <span className="sub-line">ระบุ: {s.herbalNote}</span>}
                    </dd>
                  </Fragment>
                ))}
              </dl>
            </Card>
          </div>

          <div className="ui-col">
            {s.isAlert && (
              <Card title="สถานะการรับเรื่อง">
                <div className="ui-card-body ui-stack">
                  {s.acknowledgedAt ? (
                    <div className="ui-badge ok" style={{ alignSelf: "flex-start" }}>รับเรื่องแล้วโดย {s.acknowledgedBy?.displayName}</div>
                  ) : (
                    <form action={acknowledgeAlert.bind(null, s.id)}>
                      <button className="ui-btn solid-danger" type="submit" style={{ width: "100%" }}>รับเรื่อง</button>
                    </form>
                  )}
                  <p className="ui-hint">การตัดสินใจปรับหรือหยุดยาเป็นของแพทย์ ระบบไม่ได้ตัดสินแทน</p>
                </div>
              </Card>
            )}
            <Card title="การดำเนินการกับผู้ป่วย">
              <div className="ui-card-body ui-stack">
                {s.followUpNote && (
                  <div className="ui-note-box">
                    {s.followUpNote}
                    <span className="sub-line">{s.followUpBy?.displayName} เมื่อ {s.followUpAt ? thaiDateTime(s.followUpAt) : ""}</span>
                  </div>
                )}
                <form action={saveFollowUp.bind(null, s.id)} className="ui-stack">
                  <textarea className="ui-input" name="note" rows={3} maxLength={1000} required
                    placeholder="เช่น นัดผู้ป่วยมาพบแพทย์ ปรับลดขนาดยา หรือลงพื้นที่ตรวจสอบ" />
                  <button className="ui-btn primary" type="submit">{s.followUpNote ? "บันทึกแทนข้อความเดิม" : "บันทึกการดำเนินการ"}</button>
                </form>
                <p className="ui-hint">บันทึกนี้ไม่แก้ข้อมูลคัดกรองของ รพ.สต. ข้อความเดิมจะถูกเก็บในประวัติการแก้ไข</p>
              </div>
            </Card>
            <Card title="ลำดับเหตุการณ์">
              <ol className="ui-timeline">
                {timeline.map((e) => (
                  <li key={e.text}><span className="t">{thaiDateTime(e.t)}</span><span>{e.text}</span></li>
                ))}
              </ol>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
