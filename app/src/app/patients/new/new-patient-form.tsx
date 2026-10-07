"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { DobPicker } from "@/components/dob-picker";
import { nameProblem, normalizeHn } from "@/lib/format";
import { submitWithoutReset } from "@/lib/submit";
import { createPatient } from "./actions";

export function NewPatientForm({ facility }: { facility: string }) {
  const [state, action, pending] = useActionState(createPatient, undefined);
  const e = state?.errors;
  // Check the name while typing, so a digit is flagged at once (the server checks again).
  const [name, setName] = useState("");
  const nameErr = nameProblem(name) ?? e?.name?.[0];
  // HN accepts only digits and - / ; Thai digits are converted as you type.
  const [hn, setHn] = useState("");

  return (
    <form onSubmit={submitWithoutReset(action)} className="narrow">
      <div>
        <h1 className="h1">เพิ่มผู้ป่วยใหม่</h1>
        <div className="sub">กรอกเฉพาะข้อมูลที่จำเป็นต่อการคัดกรอง</div>
      </div>
      <div className="card pad" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="row">
          <div style={{ flex: 3 }}>
            <label className="lbl" htmlFor="name">ชื่อ–นามสกุล *</label>
            <input className={`fld${nameProblem(name) ? " bad" : ""}`} id="name" name="name" required
              value={name} onChange={(ev) => setName(ev.target.value)} aria-invalid={!!nameErr} />
            {nameErr && <div className="err">{nameErr}</div>}
          </div>
          <div>
            <label className="lbl" htmlFor="sex">เพศ *</label>
            <select className="fld" id="sex" name="sex" defaultValue="หญิง">
              <option>หญิง</option>
              <option>ชาย</option>
            </select>
          </div>
        </div>
        <DobPicker error={e?.dob?.[0]} />
        <div>
          <label className="lbl" htmlFor="hn">HN (ถ้ามี)</label>
          <input className="fld" id="hn" name="hn" autoComplete="off" maxLength={20}
            value={hn} onChange={(ev) => setHn(normalizeHn(ev.target.value))} />
          {e?.hn && <div className="err">{e.hn[0]}</div>}
        </div>
        <div>
          <label className="lbl" htmlFor="facility">หน่วยบริการ</label>
          <input className="fld" id="facility" value={facility} readOnly />
        </div>
      </div>
      <div className="row">
        <Link href="/patients" className="btn-s">ยกเลิก</Link>
        <button className="btn" type="submit" disabled={pending} style={{ flex: 2 }}>
          บันทึกและเริ่มคัดกรอง
        </button>
      </div>
    </form>
  );
}
