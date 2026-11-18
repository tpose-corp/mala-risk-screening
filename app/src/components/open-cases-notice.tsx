"use client";
// รพ.สต. pages while the unit has open cases (saved but not closed with "ยืนยันปิดเคส"):
// - BlockedButton: looks disabled; a click explains why instead of doing nothing
// - BlockedPopup: opens at once (after a blocked page sent the user back to the list)
// The rule itself is in src/lib/open-cases.ts and is enforced on the server.
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/modal";

function OpenCasesModal({ count, onClose }: { count: number; onClose: () => void }) {
  return (
    <Modal tone="warn" title="ยังมีเคสที่ยังไม่ได้ปิด" onClose={onClose} closeLabel="ปิด"
      actions={<Link href="/patients#open-cases" className="ui-btn primary" onClick={onClose}>ไปปิดเคสที่ค้าง</Link>}>
      <p>หน่วยบริการนี้มี <b>{count} เคส</b> ที่บันทึกผลแล้วแต่ยังไม่ได้ยืนยันปิดเคส</p>
      <p>ต้องปิดเคสให้ครบก่อน จึงจะเริ่มคัดกรองหรือเพิ่มผู้ป่วยใหม่ได้</p>
    </Modal>
  );
}

export function BlockedButton({ count, className, children }: { count: number; className: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={`${className} is-disabled`} aria-disabled="true" onClick={() => setOpen(true)}>{children}</button>
      {open && <OpenCasesModal count={count} onClose={() => setOpen(false)} />}
    </>
  );
}

export function BlockedPopup({ count }: { count: number }) {
  const [open, setOpen] = useState(true);
  return open ? <OpenCasesModal count={count} onClose={() => setOpen(false)} /> : null;
}
