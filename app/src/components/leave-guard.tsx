"use client";
// Warns before the screener leaves a page they should finish first (an open case, or typed data
// that is not saved yet).
// - a click on a link inside the app (sidebar, steps, logo) opens a popup first
// - closing or reloading the tab shows the browser's own "leave site?" question
// Links whose path starts with one of `allow` (the next steps of the same case) pass through, and
// so does any link marked data-leave-ok (a "come back later" link the user presses on purpose).
// Turned off when `armed` is false (e.g. right after the form is submitted).
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/modal";

export function LeaveGuard({ armed, title, children, allow = [], stayLabel = "อยู่ต่อ", leaveLabel = "ออกไปก่อน" }: {
  armed: boolean;
  title: string;
  children: ReactNode;
  allow?: string[];
  stayLabel?: string;
  leaveLabel?: string;
}) {
  const router = useRouter();
  const [to, setTo] = useState<string | null>(null);
  const allowKey = allow.join("|");

  useEffect(() => {
    if (!armed) return;
    const prefixes = allowKey ? allowKey.split("|") : [];
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download") || a.hasAttribute("data-leave-ok")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname) return;
      if (prefixes.some((p) => url.pathname.startsWith(p))) return;
      e.preventDefault();
      e.stopImmediatePropagation(); // capture phase on document: Next's <Link> and any other guard never see the click
      setTo(url.pathname + url.search);
    };
    const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    document.addEventListener("click", onClick, true);
    window.addEventListener("beforeunload", onUnload);
    return () => { document.removeEventListener("click", onClick, true); window.removeEventListener("beforeunload", onUnload); };
  }, [armed, allowKey]);

  if (!to) return null;
  return (
    // "stay" is the main (filled) button, "leave" the quiet one: finishing is what we want people to do
    <Modal tone="warn" title={title} onClose={() => setTo(null)} closeLabel={stayLabel} closePrimary
      actions={<button type="button" className="ui-btn secondary" onClick={() => { const t = to; setTo(null); router.push(t); }}>{leaveLabel}</button>}>
      {children}
    </Modal>
  );
}

// The message for a case that is saved but not closed (steps 3 to 5).
export function OpenCaseGuard({ screeningId, patientId, armed = true }: { screeningId: number; patientId: number; armed?: boolean }) {
  return (
    <LeaveGuard armed={armed} title="ยังไม่ได้ยืนยันปิดเคส" stayLabel="อยู่ต่อเพื่อปิดเคส"
      allow={[`/screenings/${screeningId}`, `/patients/${patientId}/screen`]}>
      <p>ผลคัดกรองบันทึกแล้ว แต่ยังไม่มีผู้ลงชื่อยืนยันปิดเคส</p>
      <p>ถ้าออกไปตอนนี้ เคสจะค้างเป็น <b>รอยืนยันปิดเคส</b> และหน่วยบริการจะเริ่มคัดกรองหรือเพิ่มผู้ป่วยใหม่ไม่ได้จนกว่าจะปิดเคสนี้</p>
    </LeaveGuard>
  );
}

// The message for a form with typed data that is not saved yet.
export function UnsavedGuard({ armed }: { armed: boolean }) {
  return (
    <LeaveGuard armed={armed} title="ข้อมูลยังไม่ได้บันทึก" stayLabel="อยู่ต่อ" leaveLabel="ออกโดยไม่บันทึก">
      <p>ข้อมูลที่กรอกไว้ในหน้านี้ยังไม่ได้บันทึก ถ้าออกไปตอนนี้ข้อมูลจะหายไป</p>
    </LeaveGuard>
  );
}
