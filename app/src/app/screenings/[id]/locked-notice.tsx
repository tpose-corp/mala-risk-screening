"use client";
// "แก้ไขข้อมูล" on the result page. Before the case is confirmed it simply opens the form in
// edit mode. After it is confirmed the button shows a popup instead: the รพ.สต. cannot change a
// record that was already sent to the hospital; the hospital admin can, with a reason.
import Link from "next/link";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";

export function LockedNotice({ editHref, contact, openAtStart = false }: { editHref: string | null; contact: string; openAtStart?: boolean }) {
  const [open, setOpen] = useState(openAtStart);
  if (editHref) return <Link href={editHref} className="btn-s">แก้ไขข้อมูลคัดกรอง</Link>;
  return (
    <>
      <button type="button" className="btn-s" onClick={() => setOpen(true)}>แก้ไขข้อมูลคัดกรอง</button>
      {open && (
        <Modal tone="warn" title="แก้ไขไม่ได้แล้ว" onClose={() => setOpen(false)}>
          <p>ผลประเมินนี้ยืนยันและส่งให้ รพ. แล้ว เจ้าหน้าที่ รพ.สต. จึงแก้ไขเองไม่ได้</p>
          <p>หากข้อมูลผิด กรุณาติดต่อ <b>{contact}</b> เพื่อให้ผู้ดูแลระบบแก้ไขให้ ระบบจะบันทึกประวัติการแก้ไขไว้ทุกครั้ง</p>
        </Modal>
      )}
    </>
  );
}
