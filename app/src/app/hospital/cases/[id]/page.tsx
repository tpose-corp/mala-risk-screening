// /hospital/cases/[id] — one case as the hospital doctor sees it: what was measured, why it is
// (or isn't) an alert, what the รพ.สต. already did, and the "รับเรื่องแล้ว" button.
import Link from "next/link";
import { Card, PageHead } from "@/components/ui/card";
import { safeBack, withBack } from "@/lib/back-link";
import { Topbar } from "@/components/topbar";
import { ALCOHOL_LABEL, TRIGGER_KEYS, TRIGGER_LABEL, ageFromThaiDob, thaiDateTime } from "@/lib/format";
import { loadCaseForHospital } from "@/lib/hospital";
import { alertReasons } from "@/lib/reasons";
import { requireHospital } from "@/lib/session";
import { saveFollowUp } from "../../actions";
import { AcknowledgeButton } from "../../acknowledge-button";
import { ackSummary } from "@/lib/ack-summary";

// How much to show before folding the rest away (long histories stay tidy).
const TIMELINE_SHOW = 6;
const NOTES_SHOW = 3;

type Note = { id: number; at: Date; by: string; role: string; note: string };
function NoteItem({ n, latest }: { n: Note; latest: boolean }) {
  return (
    <li className={latest ? "latest" : undefined}>
      <div className="fu-note">{n.note}</div>
      <div className="fu-meta"><b>{n.by}</b>{n.role && ` ${n.role}`}<span>{thaiDateTime(n.at)}</span>{latest && <span className="ui-badge ok">ล่าสุด</span>}</div>
    </li>
  );
}

export default async function HospitalCasePage({ params, searchParams }: PageProps<"/hospital/cases/[id]">) {
  const user = await requireHospital();
  const s = await loadCaseForHospital((await params).id, user);
  const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
  const found = TRIGGER_KEYS.filter((k) => s[k]);
  // Note history, newest first. A case saved before the history existed has only its latest note.
  const notes = s.followUpNotes.length
    ? s.followUpNotes.map((n) => ({ id: n.id, at: n.at, by: n.by.displayName, role: n.by.position ?? "", note: n.note }))
    : s.followUpNote && s.followUpAt
      ? [{ id: 0, at: s.followUpAt, by: s.followUpBy?.displayName ?? "", role: s.followUpBy?.position ?? "", note: s.followUpNote }]
      : [];


  const timeline = [
    { t: s.createdAt, text: `คัดกรองโดย ${s.screener.displayName} ที่ ${s.facility}` },
    s.updatedAt.getTime() - s.createdAt.getTime() > 1000 && { t: s.updatedAt, text: "แก้ไขข้อมูลล่าสุด" },
    s.alertRaisedAt && { t: s.alertRaisedAt, text: "ระบบแจ้งเตือนเข้ากล่องแจ้งเตือนของ รพ." },
    s.adviceGivenAt && { t: s.adviceGivenAt, text: "เจ้าหน้าที่ รพ.สต. แจ้งคำแนะนำให้ผู้ป่วยแล้ว" },
    s.confirmedAt && { t: s.confirmedAt, text: `ปิดเคสฝั่ง รพ.สต. โดย ${s.confirmedBy?.displayName}` },
    s.acknowledgedAt && { t: s.acknowledgedAt, text: `รพ. รับเรื่องโดย ${s.acknowledgedBy?.displayName}` },
    ...notes.map((n) => ({ t: n.at, text: `บันทึกการดำเนินการโดย ${n.by}` })),
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

        {/* 1. what this case is: result, reasons and where it stands, in one band */}
        <div className={`cs-head ${tone}`}>
          <div className="cs-kind">
            <span className={`ui-badge ${tone}`}>{label}</span>
            <ul className="cs-reasons">
              {(s.isAlert ? alertReasons(s) : ["ขนาดยาเหมาะสม", "คะแนนความเสี่ยงไม่ถึงเกณฑ์"]).map((r) => <li key={r}>{r}</li>)}
            </ul>
          </div>
          <div className="cs-status">
            {s.isAlert && <span className={`cs-chip${s.acknowledgedAt ? " ok" : " hi"}`}>{s.acknowledgedAt ? `รพ. รับเรื่องแล้ว ${thaiDateTime(s.acknowledgedAt)}` : "รอ รพ. รับเรื่อง"}</span>}
            <span className={`cs-chip${s.confirmedAt ? " ok" : ""}`}>{s.confirmedAt ? "รพ.สต. ปิดเคสแล้ว" : "รพ.สต. ยังไม่ปิดเคส"}</span>
          </div>
        </div>

        <div className="cs-grid">
          {/* 2. left: the screening itself (fixed size, so it never overflows) */}
          <div className="cs-main">
            <Card title="ค่าที่วัดได้">
              <div className="cs-tiles">
                <div className="cs-tile"><span className="k">eGFR</span><span className="v">{fmt(s.egfr)}</span>{s.egfrDate && <span className="s">ตรวจเมื่อ {s.egfrDate}</span>}</div>
                <div className="cs-tile"><span className="k">ขนาดยา Metformin</span><span className="v">{s.doseMgDay} <small>มก./วัน</small></span><span className={`s${s.doseCheck !== "ok" ? " bad" : ""}`}>เกณฑ์ CPG {s.maxDoseMgDay === 0 ? "ห้ามใช้ยา" : `ไม่เกิน ${s.maxDoseMgDay}`}</span></div>
                <div className="cs-tile"><span className="k">คะแนนความเสี่ยง</span><span className="v">{s.riskScore} <small>คะแนน</small></span><span className="s">eGFR +{s.scoreEgfr} BMI +{s.scoreBmi} ดื่มหนัก +{s.scoreAlcohol}</span></div>
                <div className="cs-tile"><span className="k">น้ำหนัก / ส่วนสูง</span><span className="v">{fmt(s.weightKg)} <small>กก.</small> / {fmt(s.heightCm)} <small>ซม.</small></span></div>
                <div className="cs-tile"><span className="k">BMI</span><span className="v">{s.bmi.toFixed(1)}</span></div>
                <div className="cs-tile"><span className="k">การดื่มแอลกอฮอล์</span><span className="v sm">{ALCOHOL_LABEL[s.alcohol]}</span></div>
              </div>
              <div className="cs-foot">คำนวณด้วยเกณฑ์ {s.ruleVersion}</div>
            </Card>

            <Card title="ปัจจัยกระตุ้น" count={found.length ? `พบ ${found.length} ข้อ` : "ไม่พบ"}>
              <ul className="cs-triggers">
                {TRIGGER_KEYS.map((k) => {
                  const note = k === "nsaid" ? s.nsaidNote : k === "herbal" ? s.herbalNote : null;
                  return (
                    <li key={k} className={s[k] ? "on" : undefined}>
                      <span className={`ui-badge ${s[k] ? "warn" : "muted"}`}>{s[k] ? "พบ" : "ไม่พบ"}</span>
                      <span className="t">{TRIGGER_LABEL[k]}{s[k] && note && <span className="n">ระบุ: {note}</span>}</span>
                    </li>
                  );
                })}
              </ul>
            </Card>

            <Card title="ลำดับเหตุการณ์" count={`${timeline.length} รายการ`}>
              {/* long histories: the latest few are shown, the rest fold away */}
              <ol className="cs-timeline">
                {timeline.length > TIMELINE_SHOW && (
                  <li className="more">
                    <details>
                      <summary>ดูเหตุการณ์ก่อนหน้าอีก {timeline.length - TIMELINE_SHOW} รายการ</summary>
                      <ol className="cs-timeline inner">
                        {timeline.slice(0, timeline.length - TIMELINE_SHOW).map((e, i) => (
                          <li key={i}><span className="t">{thaiDateTime(e.t)}</span><span>{e.text}</span></li>
                        ))}
                      </ol>
                    </details>
                  </li>
                )}
                {timeline.slice(-TIMELINE_SHOW).map((e, i) => (
                  <li key={`l${i}`}><span className="t">{thaiDateTime(e.t)}</span><span>{e.text}</span></li>
                ))}
              </ol>
            </Card>
          </div>

          {/* 3. right: what the hospital does with it */}
          <div className="cs-side">
            {s.isAlert && !s.acknowledgedAt && (
              <Card title="สถานะการรับเรื่อง">
                <div className="ui-card-body">
                  <AcknowledgeButton id={s.id} me={user.displayName} summary={ackSummary(s)} className="ui-btn solid-danger full" />
                </div>
              </Card>
            )}
            <Card title="การดำเนินการกับผู้ป่วย" count={notes.length ? `${notes.length} บันทึก` : undefined}>
              <div className="ui-card-body ui-stack">
                <form action={saveFollowUp.bind(null, s.id)} className="cs-add">
                  <textarea className="ui-input" name="note" rows={2} maxLength={1000} required minLength={3}
                    placeholder="เพิ่มบันทึก เช่น โทรติดตามแล้ว ผู้ป่วยมาพบแพทย์ ปรับลดขนาดยาแล้ว" />
                  <button className="ui-btn primary sm" type="submit">เพิ่มบันทึก</button>
                </form>
                {notes.length > 0 ? (
                  <ol className="fu-list">
                    {notes.slice(0, NOTES_SHOW).map((n, i) => <NoteItem key={n.id || i} n={n} latest={i === 0 && notes.length > 1} />)}
                    {notes.length > NOTES_SHOW && (
                      <li className="more">
                        <details>
                          <summary>ดูบันทึกก่อนหน้าอีก {notes.length - NOTES_SHOW} รายการ</summary>
                          <ol className="fu-list inner">
                            {notes.slice(NOTES_SHOW).map((n, i) => <NoteItem key={n.id || `o${i}`} n={n} latest={false} />)}
                          </ol>
                        </details>
                      </li>
                    )}
                  </ol>
                ) : (
                  <p className="ui-hint" style={{ margin: 0 }}>ยังไม่มีบันทึก</p>
                )}
                <p className="ui-hint" style={{ margin: 0 }}>บันทึกแต่ละครั้งเก็บไว้ทั้งหมด พร้อมชื่อผู้เขียนและเวลา แก้ไขหรือลบไม่ได้</p>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
