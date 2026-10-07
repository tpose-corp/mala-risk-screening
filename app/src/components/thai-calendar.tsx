"use client";
// A small month calendar in พ.ศ. (the browser's own date picker only shows ค.ศ.).
// The month and year in the header are dropdowns, so jumping back 70 years is one click,
// not 840 presses of "previous month". Future dates are disabled (nobody is born tomorrow).

import { useEffect, useRef, useState } from "react";
import { THAI_MONTHS_FULL, daysInMonth } from "@/lib/format";

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

type Picked = { day: number; month: number; yearBE: number };

export function ThaiCalendar(props: {
  selected: Picked | null;
  initial: { month: number; yearBE: number };
  onPick: (p: Picked) => void;
  onClose: () => void;
}) {
  const today = new Date();
  const thisYearBE = today.getFullYear() + 543;
  const [view, setView] = useState(props.initial);
  const boxRef = useRef<HTMLDivElement>(null);
  const { onClose } = props;

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
    <div ref={boxRef} className="cal" role="dialog" aria-label="เลือกวันเกิดจากปฏิทิน">
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
