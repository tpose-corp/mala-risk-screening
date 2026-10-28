"use client";
// Shown once right after the case is confirmed (the URL carries ?saved=1). It only tells the
// user it worked; where to go next is left to the buttons already on the page, so nothing repeats.
// Closing it removes ?saved from the URL, so a reload does not show it again.

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function SavedPopup({ name, time }: { name: string; time: string }) {
  const [open, setOpen] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const okRef = useRef<HTMLButtonElement>(null);

  function close() {
    setOpen(false);
    router.replace(pathname, { scroll: false }); // drop ?saved=1
  }

  useEffect(() => {
    okRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!open) return null;

  return (
    <div className="popup-backdrop" onClick={close}>
      <div className="popup" role="dialog" aria-modal="true" aria-labelledby="saved-title" onClick={(e) => e.stopPropagation()}>
        <div className="popup-icon" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h2 id="saved-title">ปิดเคสเรียบร้อยแล้ว</h2>
        <p>บันทึกการยืนยันของ {name} แล้ว เมื่อ {time}</p>
        <button ref={okRef} type="button" className="btn popup-ok" onClick={close}>ตกลง</button>
      </div>
    </div>
  );
}
