// Step 3 · /screenings/[id] — the result (PBI-07), laid out like the hospital's outline:
// one card per Part (criteria → what was found), plus "what you must do now" for the screener.
import Link from "next/link";
import { EgfrMeter } from "@/components/egfr-meter";
import { Topbar } from "@/components/topbar";
import { tasksFor } from "@/lib/advice";
import { db } from "@/lib/db";
import { ALCOHOL_LABEL, TRIGGER_LABEL, thaiDate } from "@/lib/format";
import { alertReasons } from "@/lib/reasons";
import { RISK_SCORE_ALERT_THRESHOLD } from "@/lib/rules";
import { loadScreening } from "@/lib/screening";
import { requireFacilityStaff } from "@/lib/session";

const DOSE_BANDS = [
  { label: "eGFR ≥ 45", rule: "ไม่เกิน 2000 มก./วัน", match: (e: number) => e >= 45 },
  { label: "eGFR 30–44", rule: "ไม่เกิน 1000 มก./วัน", match: (e: number) => e >= 30 && e < 45 },
  { label: "eGFR < 30", rule: "ห้ามใช้ยา", match: (e: number) => e < 30 },
];

export default async function ResultPage({ params }: PageProps<"/screenings/[id]">) {
  const user = await requireFacilityStaff();
  const s = await loadScreening((await params).id, user);
  const prev = await db.screening.findFirst({
    where: { patientId: s.patientId, createdAt: { lt: s.createdAt } },
    orderBy: { createdAt: "desc" },
  });

  const tasks = tasksFor(s);
  const tone = s.isAlert ? "hi" : "ok";
  const riskGroup = s.riskScore >= RISK_SCORE_ALERT_THRESHOLD;
  const part3 = s.vomiting || s.lowIntake;
  const part4 = s.nsaid || s.herbal;

  // Same wording as the hospital screens (src/lib/reasons.ts), so both sides read the same cause.
  const reasons: string[] = s.isAlert ? alertReasons(s) : ["ขนาดยาเหมาะสม", "คะแนนความเสี่ยงไม่ถึงเกณฑ์"];
  if (part3 || part4) reasons.push("ต้องแนะนำ Sick Day Rules");

  const next = s.confirmedAt ? `/screenings/${s.id}/confirm` : `/screenings/${s.id}/next`;
  const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
  const measures = [
    { k: "น้ำหนัก", unit: "กก.", now: s.weightKg, before: prev?.weightKg },
    { k: "ส่วนสูง", unit: "ซม.", now: s.heightCm, before: prev?.heightCm },
    { k: "BMI", unit: "kg/m²", now: s.bmi, before: prev?.bmi },
    { k: "eGFR", unit: "", now: s.egfr, before: prev?.egfr },
    { k: "ขนาดยา Metformin", unit: "มก./วัน", now: s.doseMgDay, before: prev?.doseMgDay },
  ];

  return (
    <>
      <Topbar menu="patients" step={2} crumb="ผลประเมิน" />
      <main className="page split">
        <div className="main">
          <div className={`card banner ${tone}`}>
            <div className="icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {s.isAlert ? <path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /> : <path d="M20 6L9 17l-5-5" />}
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: `var(--${tone})`, textTransform: "uppercase", letterSpacing: ".04em" }}>
                {s.isAlert ? "แจ้งเตือนแล้ว (Alert)" : "ไม่แจ้งเตือน (No Alert)"}
              </div>
              <div style={{ marginTop: 3, fontSize: 17, fontWeight: 700 }}>{s.patient.name}</div>
              <div className="tag-row">{reasons.map((r) => <span key={r} style={{ color: `var(--${tone})` }}>{r}</span>)}</div>
            </div>
          </div>

          {/* ---------- measured values, this time vs last time ---------- */}
          <div className="card pad">
            <div className="sec-title">ค่าที่วัดได้</div>
            <table className="measure">
              <thead>
                <tr><th /><th>ครั้งนี้ ({thaiDate(s.createdAt)})</th><th>ครั้งก่อน {prev ? `(${thaiDate(prev.createdAt)})` : ""}</th></tr>
              </thead>
              <tbody>
                {measures.map((m) => (
                  <tr key={m.k}>
                    <td>{m.k}</td>
                    <td><b>{fmt(m.now)}</b> {m.unit}</td>
                    <td>{m.before === undefined ? <span className="note">ยังไม่เคยคัดกรอง</span> : <>{fmt(m.before)} {m.unit}<Delta now={m.now} before={m.before} /></>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ---------- Part 1 ---------- */}
          <Part no={1} title="ขนาดยา Metformin เทียบกับ eGFR (CPG)" ok={s.doseCheck === "ok"} okText="เหมาะสม" badText={s.doseCheck === "contraindicated" ? "ห้ามใช้ยา" : "ไม่เหมาะสม"}>
            {DOSE_BANDS.map((b) => (
              <div key={b.label} className={`kv band${b.match(s.egfr) ? " on" : ""}`}>
                <span className="k">{b.label}</span>
                <span className="v">{b.rule}</span>
              </div>
            ))}
            <div className="note" style={{ marginTop: 6 }}>
              ผู้ป่วยมี eGFR {fmt(s.egfr)} และได้ยา {s.doseMgDay} มก./วัน
            </div>
            <EgfrMeter value={s.egfr} />
          </Part>

          {/* ---------- Part 2 ---------- */}
          <Part no={2} title="คะแนนความเสี่ยง MALA" ok={!riskGroup} okText={`${s.riskScore} คะแนน ไม่ถึงเกณฑ์`} badText={`${s.riskScore} คะแนน กลุ่มเสี่ยง`}>
            <div className="kv"><span className="k">eGFR น้อยกว่า 60 (ผู้ป่วย {fmt(s.egfr)})</span><span className="v">+{s.scoreEgfr}</span></div>
            <div className="kv"><span className="k">BMI น้อยกว่า 23 (ผู้ป่วย {s.bmi.toFixed(1)})</span><span className="v">+{s.scoreBmi}</span></div>
            <div className="kv"><span className="k">ดื่มหนัก (ผู้ป่วย{ALCOHOL_LABEL[s.alcohol]})</span><span className="v">+{s.scoreAlcohol}</span></div>
            <div className="kv total"><b>รวม (2 คะแนนขึ้นไป = กลุ่มเสี่ยง)</b><span className="v">{s.riskScore} คะแนน</span></div>
          </Part>

          {/* ---------- Part 3 + 4 ---------- */}
          <Part no={3} title="อาการขาดน้ำหรือขาดอาหาร" ok={!part3} okText="ไม่พบ" badText="พบ ต้องแนะนำ Sick Day Rules" warn>
            <Found label={TRIGGER_LABEL.vomiting} on={s.vomiting} />
            <Found label={TRIGGER_LABEL.lowIntake} on={s.lowIntake} />
          </Part>
          <Part no={4} title="ยาหรือผลิตภัณฑ์ที่ทำให้ไตบาดเจ็บ" ok={!part4} okText="ไม่พบ" badText="พบ ต้องแนะนำ Sick Day Rules" warn>
            <Found label={TRIGGER_LABEL.nsaid} on={s.nsaid} />
            <Found label={TRIGGER_LABEL.herbal} on={s.herbal} />
          </Part>
        </div>

        <aside className="side" style={{ width: 300 }}>
          <div className="card pad todo">
            <div className="todo-h">สิ่งที่คุณต้องทำ</div>
            <ol>{tasks.staff.map((t) => <li key={t}>{t}</li>)}</ol>
            {tasks.system.length > 0 && (
              <>
                <div className="todo-h" style={{ marginTop: 12 }}>ระบบและแพทย์จะดำเนินการ</div>
                <ul className="bullets">{tasks.system.map((t) => <li key={t}>{t}</li>)}</ul>
              </>
            )}
            <div className="draft-flag" style={{ marginTop: 12 }}>คำนวณด้วยเกณฑ์ที่ รพ. กำหนดไว้ (ฉบับร่าง)</div>
          </div>
          <Link href={next} className="btn" style={{ background: `var(--${tone})` }}>ดำเนินการต่อ</Link>
          <Link href="/patients" className="btn-s">กลับไปรายชื่อผู้ป่วย</Link>
        </aside>
      </main>
    </>
  );
}

function Part(props: { no: number; title: string; ok: boolean; okText: string; badText: string; warn?: boolean; children: React.ReactNode }) {
  const bad = props.warn ? "warn" : "hi";
  return (
    <div className="card pad">
      <div className="part-h">
        <div className="sec-title" style={{ margin: 0 }}><span className="sec-num">{props.no}</span>{props.title}</div>
        <span className={`pill ${props.ok ? "ok" : bad}`}>{props.ok ? props.okText : props.badText}</span>
      </div>
      {props.children}
    </div>
  );
}

function Found({ label, on }: { label: string; on: boolean }) {
  return (
    <div className="kv">
      <span className="k" style={{ color: on ? "var(--ink-2)" : "var(--muted)" }}>{label}</span>
      <span className="v" style={{ color: on ? "var(--warn)" : "var(--muted)" }}>{on ? "พบ" : "ไม่พบ"}</span>
    </div>
  );
}

function Delta({ now, before }: { now: number; before: number }) {
  const d = now - before;
  if (Math.abs(d) < 0.05) return null;
  return <span className="delta">ครั้งนี้{d > 0 ? "เพิ่มขึ้น" : "ลดลง"} {Math.abs(d).toFixed(1)}</span>;
}
