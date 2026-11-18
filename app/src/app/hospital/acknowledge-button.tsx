"use client";
// "รับเรื่อง" with a check first: a one-screen summary of the case and what pressing it records
// (who and when; the รพ.สต. sees it). Used in the alert inbox and on the case page.
import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { acknowledgeAlert } from "./actions";

export type AckSummary = {
  name: string;
  patientLine: string; // HN, sex, age
  from: string; // unit and screener
  sentAt: string;
  waited: string;
  kind: "dose" | "risk";
  reasons: string[];
  measured: string; // eGFR, dose, BMI
  products?: string; // drugs or herbs named by the รพ.สต.
};

export function AcknowledgeButton({ id, me, summary, className }: { id: number; me: string; summary: AckSummary; className: string }) {
  const [open, setOpen] = useState(false);
  const [takenBy, setTakenBy] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ready = note.trim().length >= 3; // a note is required with every "รับเรื่อง"

  function confirm() {
    if (pending || !ready) return; // one click only
    start(async () => {
      const r = await acknowledgeAlert(id, note);
      if ("error" in r) setError(r.error);
      else if ("takenBy" in r) setTakenBy(r.takenBy);
      else { setOpen(false); setNote(""); }
    });
  }

  return (
    <>
      <button type="button" className={className} onClick={() => { setTakenBy(null); setError(null); setOpen(true); }}>รับเรื่อง</button>
      {open && (takenBy ? (
        <Modal tone="warn" title="มีผู้รับเรื่องเคสนี้ไปแล้ว" onClose={() => setOpen(false)}>
          <p><b>{takenBy}</b> รับเรื่องเคสนี้ไปก่อนแล้ว</p>
          <p>บันทึกการดำเนินการที่คุณเขียนไว้ ถูกเก็บในประวัติของเคสนี้แล้ว</p>
        </Modal>
      ) : (
        <Modal title="ยืนยันรับเรื่อง" onClose={() => setOpen(false)} closeLabel="ยกเลิก"
          actions={<button type="button" className="ui-btn solid-danger" onClick={confirm} disabled={pending || !ready}>{pending ? "กำลังบันทึก…" : "ยืนยันรับเรื่อง"}</button>}>
          <div className="ack">
            <div className="ack-case">
              <div className="ack-head">
                <div>
                  <div className="ack-name">{summary.name}</div>
                  <div className="ack-sub">{summary.patientLine}</div>
                </div>
                <span className={`ui-badge ${summary.kind === "dose" ? "hi" : "warn"}`}>{summary.kind === "dose" ? "ใช้ยาเกินขนาด" : "เกณฑ์เสี่ยงทั่วไป"}</span>
              </div>
              <dl className="ack-facts">
                <div className="wide"><dt>เหตุผล</dt><dd>{summary.reasons.join(", ")}</dd></div>
                <div className="wide"><dt>ค่าที่วัด</dt><dd>{summary.measured}</dd></div>
                {summary.products && <div className="wide"><dt>ใช้ร่วม</dt><dd>{summary.products}</dd></div>}
                <div><dt>จาก</dt><dd>{summary.from}</dd></div>
                <div><dt>แจ้งเมื่อ</dt><dd>{summary.sentAt} <span className="muted-inline">{summary.waited}</span></dd></div>
              </dl>
            </div>

            <label className="ack-note">
              <span>การดำเนินการกับผู้ป่วย <b>*</b></span>
              <textarea className="ui-input" rows={3} maxLength={1000} value={note} autoFocus
                onChange={(ev) => { setNote(ev.target.value); setError(null); }}
                placeholder="สิ่งที่ทำหรือจะทำ เช่น โทรนัดผู้ป่วยมาพบแพทย์ ปรับลดขนาดยา หรือประสาน รพ.สต. ติดตาม" />
              <small className={error ? "bad" : undefined}>{error ?? (ready ? "บันทึกแล้วแก้ไขหรือลบไม่ได้ ถ้ามีเพิ่มเติมให้เพิ่มบันทึกใหม่ในหน้าเคส" : "ต้องบันทึกก่อนจึงจะกดยืนยันได้")}</small>
            </label>

            <p className="ack-foot">ระบบจะบันทึกว่า <b>{me}</b> รับเรื่องพร้อมวันและเวลา และ รพ.สต. จะเห็นว่า รพ. รับเรื่องแล้ว</p>
          </div>
        </Modal>
      ))}
    </>
  );
}
