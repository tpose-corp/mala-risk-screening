"use client";
// Step 5 form, laid out as the same summary sheet as step 4: what was done, a note, and the
// e-signature block (ETA §9). `head` and `done` are prepared on the server and passed in.

import { useActionState, useState, type ReactNode } from "react";
import { submitWithoutReset } from "@/lib/submit";
import { confirmScreening } from "../actions";
import { OpenCaseGuard } from "@/components/leave-guard";

export type Row = { k: string; v: string; muted?: boolean };
// a small labelled box in the 4-column grid; `wide` spans the whole row
export type Fact = Row & { wide?: boolean; tone?: "hi" | "warn" | "ok" };

export function ConfirmForm(props: {
  screeningId: number;
  patientId: number;
  head: ReactNode;
  summary: ReactNode; // the data and result being confirmed, so all of it is on this one sheet
  done: Fact[];
  confirmer: string;
  facility: string;
  now: string;
  ruleVersion: string;
}) {
  const [state, action, pending] = useActionState(confirmScreening.bind(null, props.screeningId), undefined);
  const [note, setNote] = useState("");
  const [attest, setAttest] = useState(false);
  const [sent, setSent] = useState(false); // after submit the guard stops asking "leave?"
  const submit = submitWithoutReset(action);

  // Two columns so everything fits on one screen: what is being confirmed on the left, the
  // signature block and the button on the right (stays in view).
  return (
    <form method="post" onSubmit={(e) => { setSent(true); submit(e); }} className="split cf-split">
      <OpenCaseGuard screeningId={props.screeningId} patientId={props.patientId} armed={!sent || !!state?.error} />
      <div className="main">
        <div className="card doc cf-doc">
          {props.head}
          {props.summary}
          <section className="doc-sec">
            <h2>สรุปสิ่งที่ดำเนินการแล้ว</h2>
            <Facts rows={props.done} />
          </section>
        </div>
      </div>

      <aside className="side cf-side">
        <div className="card doc cf-doc">
          <section className="doc-sec">
            <h2>การยืนยันผลการประเมิน</h2>
            <Rows rows={[
              { k: "ผู้ยืนยัน", v: props.confirmer },
              { k: "วันและเวลา", v: props.now },
              { k: "หน่วยบริการ", v: props.facility },
              { k: "เวอร์ชันเกณฑ์", v: props.ruleVersion },
            ]} />
          </section>
          <section className="doc-sec">
            <h2><label htmlFor="note">หมายเหตุเพิ่มเติม</label></h2>
            <textarea className="fld" id="note" name="note" rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
            <label className="doc-attest">
              <input type="checkbox" name="attest" checked={attest} onChange={(e) => setAttest(e.target.checked)} />
              ข้าพเจ้าขอยืนยันว่าข้อมูลและผลการประเมินนี้ถูกต้อง
            </label>
          </section>
        </div>
        {state?.error && <div className="err" role="alert">{state.error}</div>}
        <button className="btn" type="submit" disabled={!attest || pending}>ยืนยันและบันทึกการตัดสินใจ</button>
        <div className="note" style={{ textAlign: "center" }}>
          การกดยืนยันถือเป็นการลงลายมือชื่ออิเล็กทรอนิกส์ตาม พ.ร.บ. ธุรกรรมทางอิเล็กทรอนิกส์ มาตรา 9
        </div>
      </aside>
    </form>
  );
}

export function Rows({ rows }: { rows: Row[] }) {
  return (
    <dl className="doc-rows">
      {rows.map((r) => (
        <div key={r.k} style={{ display: "contents" }}>
          <dt>{r.k}</dt>
          <dd className={r.muted ? "muted" : undefined}>{r.v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Facts({ rows }: { rows: Fact[] }) {
  return (
    <dl className="cf-facts">
      {rows.map((r) => (
        <div key={r.k} className={r.wide ? "wide" : undefined}>
          <dt>{r.k}</dt>
          <dd className={r.muted ? "muted" : undefined} style={r.tone ? { color: `var(--${r.tone})`, fontWeight: 800 } : undefined}>{r.v}</dd>
        </div>
      ))}
    </dl>
  );
}
