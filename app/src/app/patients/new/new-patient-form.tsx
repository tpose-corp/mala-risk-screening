"use client";

import Link from "next/link";
import { startTransition, useActionState, useState, type FormEvent } from "react";
import { DobPicker } from "@/components/dob-picker";
import { UnsavedGuard } from "@/components/leave-guard";
import { Modal } from "@/components/ui/modal";
import { THAI_MONTHS_FULL, ageFromThaiDob, cardIdChecksumOk, nameProblem, normalizeCardId } from "@/lib/format";
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
  const [dirty, setDirty] = useState(false); // typed but not saved: warn before leaving
  const [name, setName] = useState("");
  const nameErr0 = nameProblem(name) ?? e?.name?.[0];
  const [cardId, setCardId] = useState("");
  const digits = normalizeCardId(cardId);
  // The check digit is only a warning: the hospital's own test IDs fail it on purpose.
  const cardWarn = digits.length === 13 && !cardIdChecksumOk(digits) ? "เลขหลักสุดท้ายไม่ตรงตามสูตรเลขบัตรประชาชน กรุณาตรวจสอบอีกครั้ง (บันทึกได้)" : null;
  // The popup belongs to one server answer; closing it hides it until the next answer.
  const [closedFor, setClosedFor] = useState<typeof state>(undefined);
  const otherUnit = state?.otherUnit && closedFor !== state ? state.otherUnit : null;

  // Required fields left empty. Checked when "save" is pressed, then live while the user fixes
  // them, so every empty field is marked at once (the browser's own check shows only one, and
  // cannot see the date of birth because that value sits in a hidden input).
  const [dob, setDob] = useState("");
  const [tried, setTried] = useState(false);
  const missing = {
    cardId: digits.length === 0 ? "กรุณากรอกเลขประจำตัวประชาชน" : digits.length < 13 ? `ยังกรอกไม่ครบ 13 หลัก (กรอกแล้ว ${digits.length} หลัก)` : null,
    name: name.trim() === "" ? "กรุณากรอกชื่อ–นามสกุล" : null,
    dob: dob === "" ? "กรุณากรอกวันเกิดให้ครบ ทั้งวัน เดือน และปี พ.ศ." : null,
  };
  const LABELS = { cardId: "เลขประจำตัวประชาชน", name: "ชื่อ–นามสกุล", dob: "วันเกิด" } as const;
  const empty = (Object.keys(missing) as (keyof typeof missing)[]).filter((k) => missing[k]);
  const show = tried ? missing : { cardId: null, name: null, dob: null };

  function onSubmit(ev: FormEvent<HTMLFormElement>) {
    if (empty.length > 0) {
      ev.preventDefault();
      setTried(true);
      const first = empty[0];
      ev.currentTarget.querySelector<HTMLElement>(first === "dob" ? ".dob-day" : `#${first}`)?.focus();
      return;
    }
    // Everything is filled: show the review popup first. Staff cannot change a patient's details
    // after saving (only the hospital admin can), so this is the last chance to catch a typo.
    ev.preventDefault();
    setReview(new FormData(ev.currentTarget));
  }

  // The review popup holds the exact FormData that will be sent, so what staff check is what is saved.
  const [review, setReview] = useState<FormData | null>(null);
  function confirmSave() {
    const fd = review!;
    setReview(null);
    setDirty(false);
    startTransition(() => action(fd)); // like submitWithoutReset: the form keeps its values on an error
  }
  const reviewDob = review ? String(review.get("dob")) : "";
  const [rd, rm, ry] = reviewDob.split("/").map(Number);

  return (
    <form method="post" onSubmit={onSubmit} onInput={() => setDirty(true)} noValidate className="ui-form-full">
      <UnsavedGuard armed={dirty && !pending && !review} />
      <section className="ui-card ui-card-sticky-actions">
        <div className="ui-card-head"><div className="ui-card-title">ข้อมูลผู้ป่วย</div><span className="ui-card-count">* จำเป็นต้องกรอก</span></div>
        <div className="ui-card-body ui-form">
          <div className="ui-field">
            <label htmlFor="cardId">เลขประจำตัวประชาชน 13 หลัก *</label>
            <input className={`fld mono${show.cardId || e?.cardId ? " bad" : ""}`} id="cardId" name="cardId" required inputMode="numeric" autoComplete="off"
              value={cardId} onChange={(ev) => setCardId(typeCardId(ev.target.value))} maxLength={17}
              aria-invalid={!!(show.cardId || e?.cardId)} />
            {show.cardId ? <div className="err">{show.cardId}</div> : e?.cardId ? <div className="err">{e.cardId[0]}</div> : cardWarn ? <div className="ui-hint warn-text">{cardWarn}</div> : <div className="ui-hint">{digits.length}/13 หลัก</div>}
          </div>
          <div className="ui-field">
            <label htmlFor="name">ชื่อ–นามสกุล *</label>
            <input className={`fld${nameProblem(name) || show.name ? " bad" : ""}`} id="name" name="name" required
              value={name} onChange={(ev) => setName(ev.target.value)} aria-invalid={!!(show.name || nameErr0)} />
            {(show.name || nameErr0) && <div className="err">{show.name || nameErr0}</div>}
          </div>
          <div className="ui-field">
            <label htmlFor="sex">เพศ *</label>
            <select className="fld" id="sex" name="sex" defaultValue="หญิง">
              <option>หญิง</option>
              <option>ชาย</option>
            </select>
          </div>
          <div className="ui-field">
            <DobPicker error={show.dob ?? e?.dob?.[0]} onValue={setDob} />
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
          {tried && empty.length > 0 && (
            <div className="err" role="alert" style={{ marginRight: "auto", alignSelf: "center", marginTop: 0 }}>
              ยังกรอกไม่ครบ {empty.length} ช่อง: {empty.map((k) => LABELS[k]).join(", ")}
            </div>
          )}
          <Link href="/patients" className="ui-btn secondary">ยกเลิก</Link>
          <button className="ui-btn primary" type="submit" disabled={pending}>
            {pending ? "กำลังตรวจสอบ…" : "บันทึกและเริ่มคัดกรอง"}
          </button>
        </div>
      </section>

      {review && (
        <Modal title="ตรวจสอบข้อมูลก่อนบันทึก" onClose={() => setReview(null)} closeLabel="กลับไปแก้ไข"
          actions={<button type="button" className="ui-btn primary" onClick={confirmSave}>ยืนยันบันทึก</button>}>
          <p>หลังบันทึกแล้ว เจ้าหน้าที่ รพ.สต. จะแก้ไขข้อมูลผู้ป่วยเองไม่ได้ กรุณาตรวจเลขบัตรและวันเกิดให้ตรงกับบัตรประชาชน</p>
          <dl className="ui-review">
            <dt>เลขประจำตัวประชาชน</dt><dd className="mono">{String(review.get("cardId"))}</dd>
            <dt>ชื่อ–นามสกุล</dt><dd>{String(review.get("name"))}</dd>
            <dt>เพศ</dt><dd>{String(review.get("sex"))}</dd>
            <dt>วันเกิด</dt><dd>{rd} {THAI_MONTHS_FULL[rm - 1]} {ry} (อายุ {ageFromThaiDob(reviewDob)} ปี)</dd>
            {String(review.get("phone") ?? "").trim() && <><dt>เบอร์โทรศัพท์</dt><dd>{String(review.get("phone"))}</dd></>}
            <dt>หน่วยบริการประจำ</dt><dd>{facility}</dd>
          </dl>
          {cardWarn && <p className="ui-hint warn-text">{cardWarn}</p>}
        </Modal>
      )}

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
