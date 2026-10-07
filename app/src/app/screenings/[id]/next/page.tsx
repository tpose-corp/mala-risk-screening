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
import { AdviceForm } from "./advice-form";

export default async function NextStepPage({ params }: PageProps<"/screenings/[id]/next">) {
  const user = await requireFacilityStaff();
  const s = await loadScreening((await params).id, user);
  if (s.confirmedAt || s.adviceGivenAt) redirect(`/screenings/${s.id}/confirm`);

  const { needsAdvice } = tasksFor(s);
  const cards = adviceFor(s);

  return (
    <>
      <Topbar menu="patients" step={3} crumb="แจ้งเตือนและคำแนะนำ" />
      <main className="page">
        <div className="center">
          <div className="card doc">
            <CaseHead name={s.patient.name} hn={s.patient.hn} dob={s.patient.dob} isAlert={s.isAlert} />

            {s.isAlert && (
              <section className="doc-sec">
                <h2>แจ้งโรงพยาบาลแม่ข่ายแล้ว</h2>
                <dl className="doc-rows">
                  <dt>เวลาที่แจ้ง</dt>
                  <dd>{s.alertRaisedAt ? thaiDateTime(s.alertRaisedAt) : ""}</dd>
                  <dt>การรับเรื่อง</dt>
                  <dd>
                    {s.acknowledgedAt
                      ? `รับแล้วโดย ${s.acknowledgedBy?.displayName}`
                      : <span className="muted">รอแพทย์รับเรื่อง</span>}
                  </dd>
                </dl>
                <p className="doc-note">เรื่องยาให้แพทย์เป็นผู้พิจารณา</p>
              </section>
            )}

            {needsAdvice ? (
              <section className="doc-sec">
                <h2>แจ้งผู้ป่วย {cards.length} เรื่อง</h2>
                <ol className="doc-list advice-list">
                  {cards.map((c) => (
                    <li key={c.title}>
                      <b>{c.title}</b>
                      {c.body && <span>{c.body}</span>}
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

          {needsAdvice ? (
            <AdviceForm screeningId={s.id} />
          ) : (
            <Link href={`/screenings/${s.id}/confirm`} className="btn">ดำเนินการต่อ</Link>
          )}
        </div>
      </main>
    </>
  );
}
