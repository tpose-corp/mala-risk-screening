"use client";
// A submit button that first shows a "check before saving" popup. Used on the admin's patient page,
// where a save changes a patient's identity or a confirmed screening.
// It reads the form it sits in, so the page needs no extra code:
// - mode "changes": lists only the fields whose value differs from what the page loaded, old → new
// - mode "all": lists every filled field (for short forms such as "verify and add HN")
// A field named "reason" is always shown last as "เหตุผล". Labels come from <label for=…>.
// "ยืนยัน" sends the form as usual (requestSubmit), so required fields and the server checks still apply.
import { useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";

type Row = { label: string; from?: string; to: string };
type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const shown = (v: string) => (v.trim() === "" ? "ว่าง" : v);

function readRows(form: HTMLFormElement, mode: "changes" | "all") {
  const rows: Row[] = [];
  let reason = "";
  for (const el of Array.from(form.elements) as Field[]) {
    if (!el.name || el.type === "hidden" || el.type === "submit" || el.type === "button") continue;
    if (el.name === "reason") { reason = el.value; continue; }
    const label = (el.id && form.querySelector(`label[for="${el.id}"]`)?.textContent?.replace(/\s*\*\s*$/, "")) || el.getAttribute("placeholder") || el.name;
    let now: string, before: string;
    if (el instanceof HTMLSelectElement) {
      now = el.selectedOptions[0]?.text ?? "";
      before = (Array.from(el.options).find((o) => o.defaultSelected) ?? el.options[0])?.text ?? "";
    } else {
      now = el.value;
      before = el.defaultValue;
    }
    if (mode === "changes") {
      if (now.trim() !== before.trim()) rows.push({ label, from: shown(before), to: shown(now) });
    } else if (now.trim() !== "") rows.push({ label, to: now });
  }
  return { rows, reason };
}

export function ConfirmSubmit({ label, className, title, note, mode = "changes", confirmLabel = "ยืนยันบันทึก" }: {
  label: string;
  className: string;
  title: string;
  note?: string;
  mode?: "changes" | "all";
  confirmLabel?: string;
}) {
  const btn = useRef<HTMLButtonElement>(null);
  const [review, setReview] = useState<{ rows: Row[]; reason: string } | null>(null);

  function onClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    const form = btn.current!.form!;
    if (!form.reportValidity()) return; // empty required fields: the browser points at them first
    setReview(readRows(form, mode));
  }
  function confirm() {
    setReview(null);
    btn.current!.form!.requestSubmit(btn.current!); // fires "submit", not "click", so no loop
  }

  const nothing = review && mode === "changes" && review.rows.length === 0;
  return (
    <>
      <button ref={btn} type="submit" className={className} onClick={onClick}>{label}</button>
      {review && (
        <Modal title={title} onClose={() => setReview(null)} closeLabel={nothing ? "ปิด" : "กลับไปแก้ไข"}
          actions={nothing ? undefined : <button type="button" className="ui-btn primary" onClick={confirm}>{confirmLabel}</button>}>
          {nothing ? (
            <p>ยังไม่มีข้อมูลที่เปลี่ยน</p>
          ) : (
            <>
              {note && <p>{note}</p>}
              <dl className="ui-review">
                {review.rows.map((r) => (
                  <div key={r.label} style={{ display: "contents" }}>
                    <dt>{r.label}</dt>
                    <dd>{r.from !== undefined ? <><span className="ui-review-old">{r.from}</span> → {r.to}</> : r.to}</dd>
                  </div>
                ))}
                {review.reason.trim() && <><dt>เหตุผล</dt><dd>{review.reason}</dd></>}
              </dl>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
