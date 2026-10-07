"use client";
// Step 5 form, laid out as the same summary sheet as step 4: what was done, a note, and the
// e-signature block (ETA §9). `head` and `done` are prepared on the server and passed in.

import { useActionState, useState, type ReactNode } from "react";
import { submitWithoutReset } from "@/lib/submit";
import { confirmScreening } from "../actions";

export type Row = { k: string; v: string; muted?: boolean };

export function ConfirmForm(props: {
  screeningId: number;
  head: ReactNode;
  done: Row[];
  confirmer: string;
  facility: string;
  now: string;
  ruleVersion: string;
}) {
  const [state, action, pending] = useActionState(confirmScreening.bind(null, props.screeningId), undefined);
  const [note, setNote] = useState("");
  const [attest, setAttest] = useState(false);

  return (
    <form onSubmit={submitWithoutReset(action)} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="card doc">
        {props.head}

        <section className="doc-sec">
          <h2>สรุปสิ่งที่ดำเนินการแล้ว</h2>
          <Rows rows={props.done} />
        </section>

        <section className="doc-sec">
          <h2><label htmlFor="note">หมายเหตุเพิ่มเติม</label></h2>
          <textarea className="fld" id="note" name="note" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
        </section>

        <section className="doc-sec">
          <h2>การยืนยันผลการประเมิน</h2>
          <Rows rows={[
            { k: "ผู้ยืนยัน", v: props.confirmer },
            { k: "วันและเวลา", v: props.now },
            { k: "หน่วยบริการ", v: props.facility },
            { k: "เวอร์ชันเกณฑ์", v: props.ruleVersion },
          ]} />
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
