"use client";
// Modal for the UI kit (layout from the team's printing-request system): title, message, buttons
// on the right. `tone` turns it into a centred result popup with an icon.
// Uses the native <dialog>, so Esc, focus and the dimmed backdrop work without extra code.
import { useEffect, useRef, type ReactNode } from "react";

export function Modal(props: {
  title: string;
  tone?: "ok" | "warn" | "hi"; // set = result popup with an icon
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode; // extra buttons before "ตกลง"/"ปิด"
  closeLabel?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog ref={ref} className={`ui-modal${props.tone ? " result" : ""}`} onClose={props.onClose} aria-labelledby="ui-modal-title">
      {props.tone && <div className={`ui-modal-icon ${props.tone}`} aria-hidden="true">{props.tone === "ok" ? "✓" : "!"}</div>}
      <h2 id="ui-modal-title" className="ui-modal-title">{props.title}</h2>
      <div className="ui-modal-body">{props.children}</div>
      <div className="ui-modal-actions">
        {props.actions}
        <button type="button" className={`ui-btn ${props.actions ? "secondary" : "primary"}`} autoFocus onClick={() => ref.current?.close()}>
          {props.closeLabel ?? (props.actions ? "ปิด" : "ตกลง")}
        </button>
      </div>
    </dialog>
  );
}
