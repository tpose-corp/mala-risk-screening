"use client";
// Shown once right after the case is confirmed (the URL carries ?saved=1). It only tells the
// user it worked; where to go next is left to the buttons already on the page, so nothing repeats.
// Closing it removes ?saved from the URL, so a reload does not show it again.

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";

export function SavedPopup({ name, time }: { name: string; time: string }) {
  const [open, setOpen] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  if (!open) return null;
  return (
    <Modal tone="ok" title="ยืนยันปิดเคสเรียบร้อยแล้ว" onClose={() => { setOpen(false); router.replace(pathname, { scroll: false }); }}>
      <p>บันทึกการยืนยันของ {name} แล้ว เมื่อ {time}</p>
    </Modal>
  );
}
