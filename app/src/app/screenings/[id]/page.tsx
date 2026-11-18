// Step 3 · /screenings/[id] — the result (PBI-07), laid out like the hospital's outline:
// one card per Part (criteria → what was found), plus "what you must do now" for the screener.
import Link from "next/link";
import { EgfrMeter } from "@/components/egfr-meter";
import { Topbar } from "@/components/topbar";
import { tasksFor } from "@/lib/advice";
import { criteriaFor } from "@/lib/criteria";
import { OpenCaseGuard } from "@/components/leave-guard";
import { LockedNotice } from "./locked-notice";
import { db } from "@/lib/db";
import { ALCOHOL_LABEL, TRIGGER_LABEL, thaiDate, thaiDateTime } from "@/lib/format";
import type { RuleParams } from "@/lib/rules";
import { getSettings } from "@/lib/settings";
import { alertReasons } from "@/lib/reasons";
import { loadScreening } from "@/lib/screening";
import { requireFacilityStaff } from "@/lib/session";

// Dose bands drawn from the criteria version this screening was scored with.
const doseBands = (p: RuleParams) => [
  { label: `eGFR ≥ ${p.egfrReducedBelow}`, rule: `ไม่เกิน ${p.maxDoseNormal} มก./วัน`, match: (e: number) => e >= p.egfrReducedBelow },
  { label: `eGFR ${p.egfrContraindicatedBelow}–${p.egfrReducedBelow - 1}`, rule: `ไม่เกิน ${p.maxDoseReduced} มก./วัน`, match: (e: number) => e >= p.egfrContraindicatedBelow && e < p.egfrReducedBelow },
  { label: `eGFR < ${p.egfrContraindicatedBelow}`, rule: "ห้ามใช้ยา", match: (e: number) => e < p.egfrContraindicatedBelow },
];

export default async function ResultPage({ params, searchParams }: PageProps<"/screenings/[id]">) {
  const user = await requireFacilityStaff();
  const s = await loadScreening((await params).id, user);
  const { locked } = await searchParams;
  const p = await criteriaFor(s.ruleVersion);
  const adminContact = (await getSettings()).adminContact;
  const prev = await db.screening.findFirst({
    where: { patientId: s.patientId, createdAt: { lt: s.createdAt } },
    orderBy: { createdAt: "desc" },
  });

  const tasks = tasksFor(s);
  const tone = s.isAlert ? "hi" : "ok";
  const riskGroup = s.riskGroup;
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
    { k: "eGFR", unit: "mL/min", now: s.egfr, before: prev?.egfr },
    { k: "ขนาดยา", unit: "มก./วัน", now: s.doseMgDay, before: prev?.doseMgDay },
  ];

  return (
    <>
      <Topbar menu="patients" step={2} crumb="ผลประเมิน" caseId={s.id} />
      {!s.confirmedAt && <OpenCaseGuard screeningId={s.id} patientId={s.patientId} />}
      <main className="page split">
        <div className="main">
          <div className={`card banner ${tone}`}>
            <div className="icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {s.isAlert ? <path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /> : <path d="M20 6L9 17l-5-5" />}
              </svg>
            </div>
            <div>
              {/* The headline says which group the patient is in, using the hospital's two alert kinds
                  (same names as the hospital inbox tabs), so the screener sees the result at once. */}
              <div style={{ fontSize: 20, fontWeight: 800, color: `var(--${tone})`, lineHeight: 1.3 }}>
                {s.alertKind === "dose" ? "ผู้ป่วยใช้ยาเกินขนาด" : s.isAlert ? "ผู้ป่วยกลุ่มเสี่ยง MALA" : "ไม่พบความเสี่ยงที่ต้องแจ้งเตือน"}
              </div>
              <div style={{ marginTop: 2, fontSize: 15, fontWeight: 700 }}>{s.patient.name}</div>
              <div className="tag-row">{reasons.map((r) => <span key={r} style={{ color: `var(--${tone})` }}>{r}</span>)}</div>
              {s.isAlert && (
                <div className="banner-sent">
                  ระบบแจ้งเตือนแพทย์ รพ. แล้ว เมื่อ {thaiDateTime(s.alertRaisedAt ?? s.createdAt)}
                  {s.alertKind === "dose" ? " แพทย์จะพิจารณาปรับขนาดยาให้เหมาะสม" : " แพทย์จะติดตามและพิจารณาการรักษา"}
                </div>
              )}
            </div>
          </div>

          {/* ---------- measured values: one tile each, this time big, last time under it ---------- */}
          <div className="card pad">
            <div className="part-h">
              <div className="sec-title" style={{ margin: 0 }}>ค่าที่วัดได้</div>
              <span className="note">ครั้งนี้ {thaiDate(s.createdAt)}{prev ? ` เทียบครั้งก่อน ${thaiDate(prev.createdAt)}` : " (ยังไม่เคยคัดกรอง)"}</span>
            </div>
            <div className="res-tiles">
              {measures.map((m) => (
                <div key={m.k} className="res-tile">
                  <div className="k">{m.k}</div>
                  <div className="v">{fmt(m.now)} <small>{m.unit}</small></div>
                  <div className="p">{m.before === undefined ? "ครั้งก่อน ไม่มี" : <>ครั้งก่อน {fmt(m.before)}<Delta now={m.now} before={m.before} /></>}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="res-grid">
          {/* ---------- Part 1 ---------- */}
          <Part no={1} title="ขนาดยา Metformin เทียบกับ eGFR (CPG)" ok={s.doseCheck === "ok"} okText="เหมาะสม" badText={s.doseCheck === "contraindicated" ? "ห้ามใช้ยา" : "ไม่เหมาะสม"}>
            {doseBands(p).map((b) => (
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
            <div className="kv"><span className="k">eGFR น้อยกว่า {p.egfrRiskBelow} (ผู้ป่วย {fmt(s.egfr)})</span><span className="v">+{s.scoreEgfr}</span></div>
            <div className="kv"><span className="k">BMI น้อยกว่า {p.bmiRiskBelow} (ผู้ป่วย {s.bmi.toFixed(1)})</span><span className="v">+{s.scoreBmi}</span></div>
            <div className="kv"><span className="k">ดื่มหนัก (ผู้ป่วย{ALCOHOL_LABEL[s.alcohol]})</span><span className="v">+{s.scoreAlcohol}</span></div>
            <div className="kv total"><b>รวม ({p.riskGroupMinScore} คะแนนขึ้นไป = กลุ่มเสี่ยง)</b><span className="v">{s.riskScore} คะแนน</span></div>
          </Part>

          </div>

          {/* ---------- Part 3 + 4 ---------- */}
          <div className="res-grid">
          <Part no={3} title="อาการขาดน้ำหรือขาดอาหาร" ok={!part3} okText="ไม่พบ" badText="พบ ต้องแนะนำ Sick Day Rules" warn>
            <Found label={TRIGGER_LABEL.vomiting} on={s.vomiting} />
            <Found label={TRIGGER_LABEL.lowIntake} on={s.lowIntake} />
          </Part>
          <Part no={4} title="ยาหรือผลิตภัณฑ์ที่ทำให้ไตบาดเจ็บ" ok={!part4} okText="ไม่พบ" badText="พบ ต้องแนะนำ Sick Day Rules" warn>
            <Found label={TRIGGER_LABEL.nsaid} on={s.nsaid} note={s.nsaidNote} />
            <Found label={TRIGGER_LABEL.herbal} on={s.herbal} note={s.herbalNote} />
          </Part>
          </div>
        </div>

        <aside className="side res-side" style={{ width: 300 }}>
          <div className="card pad todo">
            <div className="todo-h">สิ่งที่คุณต้องทำ</div>
            <ol>{tasks.staff.map((t) => <li key={t}>{t}</li>)}</ol>
            {tasks.system.length > 0 && (
              <>
                <div className="todo-h" style={{ marginTop: 12 }}>ระบบและแพทย์จะดำเนินการ</div>
                <ul className="bullets">{tasks.system.map((t) => <li key={t}>{t}</li>)}</ul>
              </>
            )}
            <div className="draft-flag" style={{ marginTop: 12 }}>คำนวณด้วยเกณฑ์ที่ รพ. กำหนด เวอร์ชัน {s.ruleVersion}</div>
          </div>
          <div className="card pad">
            <div className="todo-h">เวลา</div>
            <ul className="timeline">
              {/* oldest first, so the list reads in the order things happened */}
              {([
                { label: "บันทึกผลคัดกรอง", at: s.createdAt },
                { label: "แจ้งเตือน รพ.", at: s.alertRaisedAt },
                { label: "แก้ไขล่าสุด", at: s.updatedAt.getTime() - s.createdAt.getTime() > 1000 ? s.updatedAt : null },
                { label: "ยืนยันปิดเคส", at: s.confirmedAt },
              ] as { label: string; at: Date | null }[])
                .flatMap((t) => (t.at ? [{ label: t.label, at: t.at }] : []))
                .sort((x, y) => Math.floor(x.at.getTime() / 60000) - Math.floor(y.at.getTime() / 60000)) // by minute, as shown; same minute keeps this order
                .map((t) => <li key={t.label}><b>{t.label}</b>{thaiDateTime(t.at)}</li>)}
            </ul>
          </div>
          {/* the main button is always the system colour; the result colour is already on the banner */}
          <Link href={next} className="btn">ดำเนินการต่อ</Link>
          <LockedNotice editHref={s.confirmedAt ? null : `/patients/${s.patientId}/screen?edit=${s.id}`} contact={adminContact} openAtStart={locked === "1"} />
          {/* Leaving does not cancel anything: the result is saved (and any alert already sent) when
              "ประมวลผล" is pressed. The case stays "ยังไม่ยืนยัน" and can be reopened from the list. */}
          <div className="later">
            {s.confirmedAt ? (
              <Link href="/patients">← กลับไปรายชื่อผู้ป่วย</Link>
            ) : (
              <>
                <Link href="/patients" data-leave-ok>ทำต่อภายหลัง กลับไปรายชื่อผู้ป่วย</Link>
                <span>ผลนี้บันทึกแล้ว{s.isAlert ? " และแจ้ง รพ. แล้ว" : ""} กลับมายืนยันได้จากรายชื่อผู้ป่วย</span>
              </>
            )}
          </div>
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

function Found({ label, on, note }: { label: string; on: boolean; note?: string | null }) {
  return (
    <div className="kv">
      <span className="k" style={{ color: on ? "var(--ink-2)" : "var(--muted)" }}>
        {label}
        {on && note && <><br /><span className="note">ระบุ: {note}</span></>}
      </span>
      <span className="v" style={{ color: on ? "var(--warn)" : "var(--muted)" }}>{on ? "พบ" : "ไม่พบ"}</span>
    </div>
  );
}

function Delta({ now, before }: { now: number; before: number }) {
  const d = now - before;
  if (Math.abs(d) < 0.05) return null;
  return <span className={`delta ${d > 0 ? "up" : "down"}`}>{d > 0 ? "▲" : "▼"} {Math.abs(d).toFixed(1)}</span>;
}
