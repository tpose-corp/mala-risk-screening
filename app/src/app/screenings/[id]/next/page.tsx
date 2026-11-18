// Step 4 · /screenings/[id]/next — the alert record (if any) and the patient advice (if any).
// Per the outline, a Part 2 alert ALSO asks the screener to give Sick Day Rules advice, so a
// case can show both sections. Laid out like a printed summary sheet: one card, sections split
// by thin rules, "label: value" rows, numbered advice. Colour only on the one status word.
import Link from "next/link";
import { redirect } from "next/navigation";
import { CaseHead } from "@/components/case-head";
import { Topbar } from "@/components/topbar";
import { adviceFor, tasksFor } from "@/lib/advice";
import { thaiDateTime } from "@/lib/format";
import { loadScreening } from "@/lib/screening";
import { requireFacilityStaff } from "@/lib/session";
import { Facts } from "../confirm/confirm-form";
import { ScreeningSummary } from "../confirm/summary";
import { OpenCaseGuard } from "@/components/leave-guard";
import { AdviceForm } from "./advice-form";

export default async function NextStepPage({ params }: PageProps<"/screenings/[id]/next">) {
  const user = await requireFacilityStaff();
  const s = await loadScreening((await params).id, user);
  if (s.confirmedAt || s.adviceGivenAt) redirect(`/screenings/${s.id}/confirm`);

  const { needsAdvice } = tasksFor(s);
  const cards = adviceFor(s);

  return (
    <>
      <Topbar menu="patients" step={3} crumb="แจ้งเตือนและคำแนะนำ" caseId={s.id} />
      {/* Same two-column, one-screen layout as step 5: what to tell the patient on the left,
          the "advice given" tick and the button on the right (always in view). */}
      <OpenCaseGuard screeningId={s.id} patientId={s.patientId} />
      <main className="page split cf-split">
        <div className="main">
          <div className="card doc cf-doc">
            <CaseHead name={s.patient.name} hn={s.patient.hn} dob={s.patient.dob} isAlert={s.isAlert} />
            <ScreeningSummary s={s} only="result" />

            {s.isAlert && (
              <section className="doc-sec">
                <h2>แจ้งโรงพยาบาลแม่ข่ายแล้ว</h2>
                <Facts rows={[
                  { k: "เวลาที่แจ้ง", v: s.alertRaisedAt ? thaiDateTime(s.alertRaisedAt) : "" },
                  s.acknowledgedAt
                    ? { k: "การรับเรื่อง", v: `รับแล้วโดย ${s.acknowledgedBy?.displayName}` }
                    : { k: "การรับเรื่อง", v: "รอแพทย์รับเรื่อง", muted: true },
                  { k: "เรื่องยา", v: "แพทย์เป็นผู้พิจารณา" },
                ]} />
              </section>
            )}

            {needsAdvice ? (
              <section className="doc-sec">
                <h2>แจ้งผู้ป่วย {cards.length} เรื่อง</h2>
                <ol className="cf-advice">
                  {cards.map((c, i) => (
                    <li key={c.title}>
                      <span className="n">{i + 1}</span>
                      <div><b>{c.title}</b>{c.body && <span>{c.body}</span>}</div>
                    </li>
                  ))}
                </ol>
              </section>
            ) : (
              !s.isAlert && (
                <section className="doc-sec">
                  <h2>ไม่มีเรื่องที่ต้องแจ้งผู้ป่วยเพิ่ม</h2>
                </section>
              )
            )}
          </div>
        </div>

        <aside className="side cf-side">
          <div className="card doc cf-doc">
            <section className="doc-sec">
              <h2>สิ่งที่ต้องทำ</h2>
              <p className="note" style={{ margin: 0 }}>
                {needsAdvice ? `อ่านคำแนะนำ ${cards.length} เรื่องให้ผู้ป่วยฟัง แล้วติ๊กยืนยันด้านล่าง` : "ไม่มีคำแนะนำที่ต้องแจ้ง ไปขั้นตอนยืนยันปิดเคสได้เลย"}
              </p>
            </section>
          </div>
          {needsAdvice ? (
            <AdviceForm screeningId={s.id} />
          ) : (
            <Link href={`/screenings/${s.id}/confirm`} className="btn">ดำเนินการต่อ</Link>
          )}
        </aside>
      </main>
    </>
  );
}
