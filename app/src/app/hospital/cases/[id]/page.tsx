// /hospital/cases/[id] — one case as the hospital doctor sees it: what was measured, why it is
// (or isn't) an alert, what the รพ.สต. already did, and the "รับเรื่องแล้ว" button.
import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { ALCOHOL_LABEL, TRIGGER_KEYS, TRIGGER_LABEL, ageFromThaiDob, thaiDateTime } from "@/lib/format";
import { loadCaseForHospital } from "@/lib/hospital";
import { alertReasons } from "@/lib/reasons";
import { requireHospital } from "@/lib/session";
import { acknowledgeAlert } from "../../actions";

export default async function HospitalCasePage({ params }: PageProps<"/hospital/cases/[id]">) {
  const user = await requireHospital();
  const s = await loadCaseForHospital((await params).id, user);
  const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
  const found = TRIGGER_KEYS.filter((k) => s[k]);

  const timeline = [
    { t: s.createdAt, text: `คัดกรองโดย ${s.screener.displayName} ที่ ${s.patient.facility}` },
    s.alertRaisedAt && { t: s.alertRaisedAt, text: "ระบบแจ้งเตือนเข้ากล่องแจ้งเตือนของ รพ." },
    s.adviceGivenAt && { t: s.adviceGivenAt, text: "เจ้าหน้าที่ รพ.สต. แจ้งคำแนะนำให้ผู้ป่วยแล้ว" },
    s.confirmedAt && { t: s.confirmedAt, text: `ปิดเคสฝั่ง รพ.สต. โดย ${s.confirmedBy?.displayName}` },
    s.acknowledgedAt && { t: s.acknowledgedAt, text: `รพ. รับเรื่องโดย ${s.acknowledgedBy?.displayName}` },
  ].filter(Boolean) as { t: Date; text: string }[];

  return (
    <>
      <Topbar menu={s.isAlert ? "alerts" : "cases"} crumb="รายละเอียดเคส" />
      <main className="page split">
        <div className="main">
          <div className={`card banner ${s.isAlert ? "hi" : "ok"}`}>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: s.isAlert ? "var(--hi)" : "var(--ok)" }}>
                {s.isAlert ? "แจ้งเตือน (Alert)" : "ไม่แจ้งเตือน"}
              </div>
              <div style={{ marginTop: 3, fontSize: 17, fontWeight: 700 }}>
                {s.patient.name}
                <span className="meta-inline">HN {s.patient.hn ?? "ยังไม่มี"}</span>
              </div>
              <div className="sub">{s.patient.sex} อายุ {ageFromThaiDob(s.patient.dob)} ปี จาก {s.patient.facility}</div>
              <div className="tag-row">
                {(s.isAlert ? alertReasons(s) : ["ขนาดยาเหมาะสม", "คะแนนไม่ถึงเกณฑ์"]).map((r) => (
                  <span key={r} style={{ color: s.isAlert ? "var(--hi)" : "var(--ok)" }}>{r}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="card pad">
            <div className="sec-title">ค่าที่วัดได้</div>
            <div className="kv"><span className="k">eGFR</span><span className="v">{fmt(s.egfr)}</span></div>
            <div className="kv"><span className="k">ขนาดยา Metformin</span><span className="v">{s.doseMgDay} มก./วัน (เกณฑ์ CPG {s.maxDoseMgDay === 0 ? "ห้ามใช้" : `ไม่เกิน ${s.maxDoseMgDay}`})</span></div>
            <div className="kv"><span className="k">น้ำหนัก ส่วนสูง BMI</span><span className="v">{fmt(s.weightKg)} กก. {fmt(s.heightCm)} ซม. BMI {s.bmi.toFixed(1)}</span></div>
            <div className="kv"><span className="k">การดื่มแอลกอฮอล์</span><span className="v">{ALCOHOL_LABEL[s.alcohol]}</span></div>
            <div className="kv total"><b>คะแนนความเสี่ยง MALA</b><span className="v">{s.riskScore} คะแนน (eGFR +{s.scoreEgfr}, BMI +{s.scoreBmi}, ดื่มหนัก +{s.scoreAlcohol})</span></div>
          </div>

          <div className="card pad">
            <div className="sec-title">ปัจจัยกระตุ้นที่พบ</div>
            {found.length ? found.map((k) => <div key={k} className="kv"><span className="k">{TRIGGER_LABEL[k]}</span><span className="v" style={{ color: "var(--warn)" }}>พบ</span></div>)
              : <div className="note">ไม่พบ</div>}
          </div>
        </div>

        <aside className="side" style={{ width: 300 }}>
          {s.isAlert && (
            <div className="card pad" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="todo-h">สถานะการรับเรื่อง</div>
              {s.acknowledgedAt ? (
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ok)" }}>
                  ✓ รับเรื่องแล้วโดย {s.acknowledgedBy?.displayName}
                </div>
              ) : (
                <form action={acknowledgeAlert.bind(null, s.id)} style={{ display: "flex", flexDirection: "column" }}>
                  <button className="btn danger" type="submit">รับเรื่องแล้ว</button>
                </form>
              )}
              <div className="note">การตัดสินใจปรับหรือหยุดยาเป็นของแพทย์ ระบบไม่ได้ตัดสินแทน</div>
            </div>
          )}
          <div className="card pad">
            <div className="todo-h">ลำดับเหตุการณ์</div>
            <ul className="timeline">
              {timeline.map((e) => (
                <li key={e.text}><b>{thaiDateTime(e.t)}</b><span>{e.text}</span></li>
              ))}
            </ul>
          </div>
          <Link href={`/hospital/patients/${s.patientId}`} className="btn-s">ดูประวัติการคัดกรองทั้งหมด</Link>
          <Link href={s.isAlert ? "/hospital" : "/hospital/cases"} className="btn-s">กลับ</Link>
        </aside>
      </main>
    </>
  );
}
