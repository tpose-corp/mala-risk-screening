"use client";
// A small month calendar in พ.ศ. (the browser's own date picker only shows ค.ศ.).
// The month and year in the header are dropdowns, so jumping back 70 years is one click,
// not 840 presses of "previous month". Future dates are disabled (nobody is born tomorrow).

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { THAI_MONTHS_FULL, daysInMonth } from "@/lib/format";

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

type Picked = { day: number; month: number; yearBE: number };

export function ThaiCalendar(props: {
  selected: Picked | null;
  initial: { month: number; yearBE: number };
  onPick: (p: Picked) => void;
  onClose: () => void;
  label?: string;
  downOnly?: boolean; // always open below the field (e.g. under a sticky page head), scrolling into view if needed
}) {
  const today = new Date();
  const thisYearBE = today.getFullYear() + 543;
  const [view, setView] = useState(props.initial);
  const boxRef = useRef<HTMLDivElement>(null);
  const { onClose, downOnly } = props;

  // Close on Escape or on a click outside the calendar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [onClose]);

  // Open where there is room: below the field if it fits, otherwise above it (like the
  // printing-request system's date picker); if neither fits, scroll the page so it shows whole.
  // A sticky button bar at the bottom of the screen counts as "no room".
  const [up, setUp] = useState(false);
  useLayoutEffect(() => {
    const box = boxRef.current;
    const field = box?.parentElement;
    if (!box || !field) return;
    const f = field.getBoundingClientRect();
    const h = box.offsetHeight + 8;
    const bar = Array.from(document.querySelectorAll<HTMLElement>(".ui-form-actions, .ui-savebar"))
      .map((el) => el.getBoundingClientRect().top).filter((t) => t > f.bottom && t < window.innerHeight);
    const bottomLimit = bar.length ? Math.min(...bar) : window.innerHeight;
    // Nothing may hide it at the top: the top bar, the step bar, and a sticky page head (.ui-sticky,
    // e.g. the admin patient page) all count, whichever reaches lowest.
    const stuck = Array.from(document.querySelectorAll<HTMLElement>(".ui-sticky, .ui-steps"))
      .map((el) => el.getBoundingClientRect()).filter((r) => r.top < f.top && r.bottom > 0).map((r) => r.bottom);
    const topLimit = Math.max(64, ...stuck) + 8;
    // Not enough room either way: open below and scroll the page up just enough to show it whole.
    const scrollToFitBelow = () => {
      const need = f.bottom + h + 8 - bottomLimit;
      if (need > 0) window.scrollBy({ top: need, behavior: "smooth" });
    };
    if (downOnly) { scrollToFitBelow(); return; }
    if (f.bottom + h <= bottomLimit) setUp(false);
    else if (f.top - h >= topLimit) setUp(true);
    else scrollToFitBelow();
  }, [downOnly]);

  const { month, yearBE } = view;
  const firstWeekday = new Date(yearBE - 543, month - 1, 1).getDay(); // 0 = Sunday
  const total = daysInMonth(month, yearBE);
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];

  const isFuture = (d: number) => new Date(yearBE - 543, month - 1, d) > today;
  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() + 1 && yearBE === thisYearBE;
  const isSelected = (d: number) =>
    props.selected?.day === d && props.selected.month === month && props.selected.yearBE === yearBE;

  function step(delta: number) {
    let m = month + delta;
    let y = yearBE;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    if (y > thisYearBE || y < thisYearBE - 120) return;
    setView({ month: m, yearBE: y });
  }

  return (
    <div ref={boxRef} className={`cal${up ? " up" : ""}`} role="dialog" aria-label={props.label ?? "เลือกวันที่จากปฏิทิน"}>
      <div className="cal-head">
        <button type="button" className="cal-nav" aria-label="เดือนก่อนหน้า" onClick={() => step(-1)}>‹</button>
        <select className="fld" aria-label="เดือนในปฏิทิน" value={month}
          onChange={(e) => setView({ month: Number(e.target.value), yearBE })}>
          {THAI_MONTHS_FULL.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select className="fld" aria-label="ปี พ.ศ. ในปฏิทิน" value={yearBE}
          onChange={(e) => setView({ month, yearBE: Number(e.target.value) })}>
          {Array.from({ length: 121 }, (_, i) => thisYearBE - i).map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <button type="button" className="cal-nav" aria-label="เดือนถัดไป" onClick={() => step(1)}>›</button>
      </div>
      <div className="cal-grid">
        {WEEKDAYS.map((w) => <span key={w} className="cal-wd">{w}</span>)}
        {cells.map((d, i) =>
          d === null ? (
            <span key={`x${i}`} />
          ) : (
            <button
              key={d}
              type="button"
              className={`cal-day${isSelected(d) ? " on" : ""}${isToday(d) ? " today" : ""}`}
              disabled={isFuture(d)}
              aria-label={`${d} ${THAI_MONTHS_FULL[month - 1]} ${yearBE}`}
              onClick={() => props.onPick({ day: d, month, yearBE })}
            >
              {d}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
