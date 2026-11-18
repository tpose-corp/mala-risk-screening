"use client";
// "ข้อมูลผู้ป่วยไม่ถูกต้อง?" on the patient card of the screening form. รพ.สต. staff cannot
// change a patient's details themselves (the hospital admin verifies and keeps them), so this
// popup says who to contact and what to tell them. Screening can go on as usual meanwhile.
import { useState } from "react";
import { Modal } from "@/components/ui/modal";

export function PatientFixNotice({ contact }: { contact: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="linkbtn" style={{ padding: "4px 0" }} onClick={() => setOpen(true)}>ข้อมูลผู้ป่วยไม่ถูกต้อง?</button>
      {open && (
        <Modal tone="warn" title="แก้ไขข้อมูลผู้ป่วย" onClose={() => setOpen(false)}>
          <p>เจ้าหน้าที่ รพ.สต. แก้ไขข้อมูลผู้ป่วยเองไม่ได้ เพื่อให้ข้อมูลตรงกับที่ รพ. ยืนยันตัวตนไว้</p>
          <p>กรุณาติดต่อ <b>{contact}</b> แจ้งชื่อผู้ป่วย เลขบัตร 4 หลักท้าย ช่องที่ผิด และค่าที่ถูกต้อง ผู้ดูแลระบบจะแก้ไขให้และบันทึกประวัติการแก้ไขไว้ทุกครั้ง</p>
          <p className="ui-hint">ระหว่างนี้คัดกรองต่อได้ตามปกติ</p>
        </Modal>
      )}
    </>
  );
}
