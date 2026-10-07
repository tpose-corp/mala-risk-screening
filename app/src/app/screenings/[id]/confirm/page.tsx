// Step 5 · /screenings/[id]/confirm — e-signature (PBI-11). Once confirmed, the same URL shows
// the closed case. Both use the summary-sheet card from step 4.
import Link from "next/link";
import { redirect } from "next/navigation";
import { CaseHead } from "@/components/case-head";
import { Topbar } from "@/components/topbar";
import { tasksFor } from "@/lib/advice";
import { thaiDateTime } from "@/lib/format";
import { loadScreening } from "@/lib/screening";
import { ROLE_LABEL, requireFacilityStaff } from "@/lib/session";
import { ConfirmForm, Rows, type Row } from "./confirm-form";
import { SavedPopup } from "./saved-popup";

export default async function ConfirmPage({ params, searchParams }: PageProps<"/screenings/[id]/confirm">) {
  const user = await requireFacilityStaff();
  const s = await loadScreening((await params).id, user);
  const { needsAdvice } = tasksFor(s);
  if (needsAdvice && !s.adviceGivenAt && !s.confirmedAt) redirect(`/screenings/${s.id}/next`);

  // What has been done so far, as "label: value" rows.
  const done: Row[] = [];
  if (s.isAlert) {
    done.push({ k: "แจ้งแพทย์ที่ รพ.", v: s.alertRaisedAt ? thaiDateTime(s.alertRaisedAt) : "" });
    done.push(
      s.acknowledgedAt
        ? { k: "การรับเรื่อง", v: `รับเรื่องแล้วโดย ${s.acknowledgedBy?.displayName} เมื่อ ${thaiDateTime(s.acknowledgedAt)}` }
        : { k: "การรับเรื่อง", v: "รอแพทย์รับเรื่อง", muted: true },
    );
  }
  if (s.adviceGivenAt) done.push({ k: "แจ้งคำแนะนำผู้ป่วย", v: thaiDateTime(s.adviceGivenAt) });
  if (!s.isAlert && !s.adviceGivenAt) done.push({ k: "ผลการคัดกรอง", v: "ไม่เข้าเกณฑ์แจ้งเตือน และไม่มีคำแนะนำเพิ่มเติม" });

  const head = <CaseHead name={s.patient.name} hn={s.patient.hn} dob={s.patient.dob} isAlert={s.isAlert} />;

  if (s.confirmedAt) {
    const justSaved = (await searchParams).saved === "1";
    return (
      <>
        <Topbar menu="patients" step={4} crumb="ยืนยันปิดเคส" />
        {justSaved && <SavedPopup name={s.patient.name} time={thaiDateTime(s.confirmedAt)} />}
        <main className="page">
          <div className="center">
            <div className="card doc">
              <CaseHead name={s.patient.name} hn={s.patient.hn} dob={s.patient.dob} isAlert={s.isAlert}
                status={s.isAlert ? "แจ้งเตือน ปิดเคสแล้ว" : "ปิดเคสแล้ว"} />
              <section className="doc-sec">
                <h2>สรุปสิ่งที่ดำเนินการแล้ว</h2>
                <Rows rows={done} />
              </section>
              <section className="doc-sec">
                <h2>การยืนยันผลการประเมิน</h2>
                <Rows rows={[
                  { k: "ผู้ยืนยัน", v: `${s.confirmedBy?.displayName} (${ROLE_LABEL[s.confirmedBy?.role ?? ""] ?? ""})` },
                  { k: "วันและเวลา", v: thaiDateTime(s.confirmedAt) },
                  { k: "หมายเหตุ", v: s.confirmNote ?? "ไม่มี", muted: !s.confirmNote },
                  { k: "เวอร์ชันเกณฑ์", v: s.ruleVersion },
                ]} />
              </section>
            </div>
            <div className="row">
              <Link href={`/screenings/${s.id}`} className="btn-s">ดูผลประเมิน</Link>
              <Link href="/patients" className="btn">เริ่มเคสใหม่</Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Topbar menu="patients" step={4} crumb="ยืนยันปิดเคส" />
      <main className="page">
        <div className="center">
          <ConfirmForm
            screeningId={s.id}
            head={head}
            done={done}
            confirmer={`${user.displayName} (${ROLE_LABEL[user.role] ?? user.role})`}
            facility={user.facility}
            now={thaiDateTime(new Date())}
            ruleVersion={s.ruleVersion}
          />
        </div>
      </main>
    </>
  );
}
