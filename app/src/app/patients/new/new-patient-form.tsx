"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { DobPicker } from "@/components/dob-picker";
import { Modal } from "@/components/ui/modal";
import { cardIdChecksumOk, nameProblem, normalizeCardId } from "@/lib/format";
import { submitWithoutReset } from "@/lib/submit";
import { createPatient } from "./actions";

// Keeps only digits (Thai digits become 0 to 9), at most 13 of them, and shows them grouped
// as on the card: 1-2345-67890-12-3. Typing a 14th digit does nothing.
function typeCardId(raw: string) {
  const d = normalizeCardId(raw).slice(0, 13);
  return [d.slice(0, 1), d.slice(1, 5), d.slice(5, 10), d.slice(10, 12), d.slice(12, 13)].filter(Boolean).join("-");
}

export function NewPatientForm({ facility }: { facility: string }) {
  const [state, action, pending] = useActionState(createPatient, undefined);
  const e = state?.errors;
  // Check the name while typing, so a digit is flagged at once (the server checks again).
  const [name, setName] = useState("");
  const nameErr = nameProblem(name) ?? e?.name?.[0];
  const [cardId, setCardId] = useState("");
  const digits = normalizeCardId(cardId);
  // The check digit is only a warning: the hospital's own test IDs fail it on purpose.
  const cardWarn = digits.length === 13 && !cardIdChecksumOk(digits) ? "เลขหลักสุดท้ายไม่ตรงตามสูตรเลขบัตรประชาชน กรุณาตรวจสอบอีกครั้ง (บันทึกได้)" : null;
  // The popup belongs to one server answer; closing it hides it until the next answer.
  const [closedFor, setClosedFor] = useState<typeof state>(undefined);
  const otherUnit = state?.otherUnit && closedFor !== state ? state.otherUnit : null;

  return (
    <form onSubmit={submitWithoutReset(action)} className="ui-form-full">
      <section className="ui-card ui-card-sticky-actions">
        <div className="ui-card-head"><div className="ui-card-title">ข้อมูลผู้ป่วย</div><span className="ui-card-count">* จำเป็นต้องกรอก</span></div>
        <div className="ui-card-body ui-form">
          <div className="ui-field">
            <label htmlFor="cardId">เลขประจำตัวประชาชน 13 หลัก *</label>
            <input className={`fld mono${e?.cardId ? " bad" : ""}`} id="cardId" name="cardId" required inputMode="numeric" autoComplete="off"
              value={cardId} onChange={(ev) => setCardId(typeCardId(ev.target.value))} maxLength={17}
              pattern="[0-9]-[0-9]{4}-[0-9]{5}-[0-9]{2}-[0-9]" title="เลขประจำตัวประชาชน 13 หลัก"
              placeholder="x-xxxx-xxxxx-xx-x" />
            {e?.cardId ? <div className="err">{e.cardId[0]}</div> : cardWarn ? <div className="ui-hint warn-text">{cardWarn}</div> : <div className="ui-hint">{digits.length}/13 หลัก ระบบใช้เลขนี้ตรวจว่าผู้ป่วยลงทะเบียนที่หน่วยอื่นแล้วหรือยัง</div>}
          </div>
          <div className="ui-field">
            <label htmlFor="name">ชื่อ–นามสกุล *</label>
            <input className={`fld${nameProblem(name) ? " bad" : ""}`} id="name" name="name" required
              value={name} onChange={(ev) => setName(ev.target.value)} aria-invalid={!!nameErr} />
            {nameErr && <div className="err">{nameErr}</div>}
          </div>
          <div className="ui-field">
            <label htmlFor="sex">เพศ *</label>
            <select className="fld" id="sex" name="sex" defaultValue="หญิง">
              <option>หญิง</option>
              <option>ชาย</option>
            </select>
          </div>
          <div className="ui-field">
            <DobPicker error={e?.dob?.[0]} />
          </div>
          <div className="ui-field">
            <label htmlFor="phone">เบอร์โทรศัพท์</label>
            <input className="fld" id="phone" name="phone" inputMode="tel" maxLength={20} autoComplete="off" placeholder="ถ้ามี" />
          </div>
          <div className="ui-field">
            <label htmlFor="facility">หน่วยบริการประจำ</label>
            <input className="fld" id="facility" value={facility} readOnly />
          </div>
        </div>
        <div className="ui-card-body" style={{ paddingTop: 0 }}>
          <div className="ui-callout">
            ผู้ป่วยใหม่จะมีสถานะ <b>รอยืนยันตัวตน</b> จนกว่าผู้ดูแลระบบของ รพ. จะตรวจสอบและเพิ่ม HN ให้ ระหว่างนี้คัดกรองได้ตามปกติ
          </div>
        </div>
        <div className="ui-form-actions">
          <Link href="/patients" className="ui-btn secondary">ยกเลิก</Link>
          <button className="ui-btn primary" type="submit" disabled={pending}>
            {pending ? "กำลังตรวจสอบ…" : "บันทึกและเริ่มคัดกรอง"}
          </button>
        </div>
      </section>

      {otherUnit && (
        <Modal tone="warn" title="ผู้ป่วยรายนี้มีหน่วยบริการประจำอยู่แล้ว" onClose={() => setClosedFor(state)}>
          <p>เลขประจำตัวประชาชนนี้ลงทะเบียนไว้ที่ <b>{otherUnit}</b></p>
          <p>กรุณาแนะนำให้ผู้ป่วยไปรับการตรวจที่หน่วยบริการเดิม หรือที่โรงพยาบาลเชียงรายประชานุเคราะห์</p>
          <p className="ui-hint">ถ้าผู้ป่วยย้ายที่อยู่ถาวร ให้ติดต่อผู้ดูแลระบบของ รพ. เพื่อย้ายหน่วยบริการประจำ</p>
        </Modal>
      )}
    </form>
  );
}
