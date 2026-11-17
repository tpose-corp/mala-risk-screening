"use client";
// Date of a lab result (e.g. the eGFR), made quick to fill in:
// - the year starts as this year (พ.ศ.), so usually only the day and month are typed
// - "วันนี้" / "เมื่อวาน" fill it in one click
// - or pick it from the พ.ศ. calendar (no future dates)
// - the date is read back in words with how long ago it was, so a wrong digit is caught by eye
// Same look and keyboard flow as the date-of-birth picker. Optional: empty is allowed.
// The visible fields have no `name`; one hidden input sends "dd/mm/yyyy" (พ.ศ.).

import { useCallback, useRef, useState } from "react";
import { THAI_MONTHS_FULL, dobProblem } from "@/lib/format";
import { ThaiCalendar } from "./thai-calendar";

const digits = (s: string) => s.replace(/\D/g, "");

function parse(v: string | null | undefined) {
  const m = v?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? { day: String(Number(m[1])), month: String(Number(m[2])), year: m[3] } : null;
}

function daysAgo(day: number, month: number, yearBE: number) {
  const then = new Date(yearBE - 543, month - 1, day);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today.getTime() - then.getTime()) / 86_400_000);
}

export function LabDatePicker({ name, label, initial, error }: { name: string; label: string; initial?: string | null; error?: string }) {
  const thisYearBE = new Date().getFullYear() + 543;
  const start = parse(initial);
  const [day, setDay] = useState(start?.day ?? "");
  const [month, setMonth] = useState(start?.month ?? "");
  const [year, setYear] = useState(start?.year ?? String(thisYearBE));
  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLSelectElement>(null);
  const calBtnRef = useRef<HTMLButtonElement>(null);
  const [calOpen, setCalOpen] = useState(false);
  const closeCal = useCallback(() => { setCalOpen(false); calBtnRef.current?.focus(); }, []);

  const set = (d: Date) => {
    setDay(String(d.getDate()));
    setMonth(String(d.getMonth() + 1));
    setYear(String(d.getFullYear() + 543));
  };
  function changeDay(raw: string) {
    const v = digits(raw).slice(0, 2);
    setDay(v);
    if (v.length === 2 || /^[4-9]$/.test(v)) monthRef.current?.focus();
  }

  const y = Number(year);
  const complete = day !== "" && month !== "" && year.length === 4;
  const problem = complete ? dobProblem(Number(day), Number(month), y) : null;
  const valid = complete && !problem;
  const value = valid ? `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}` : "";
  const ago = valid ? daysAgo(Number(day), Number(month), y) : null;
  const agoText = ago === null ? "" : ago === 0 ? "วันนี้" : ago === 1 ? "เมื่อวาน" : ago < 60 ? `${ago} วันที่แล้ว` : `ประมาณ ${Math.round(ago / 30)} เดือนที่แล้ว`;
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);
  const isDay = (d: Date) => valid && Number(day) === d.getDate() && Number(month) === d.getMonth() + 1 && y === d.getFullYear() + 543;

  return (
    <fieldset className="dob lab-date">
      <legend className="lbl">{label}</legend>
      <div className="lab-quick">
        <button type="button" className={`ui-chip${isDay(today) ? " on" : ""}`} onClick={() => set(today)}>วันนี้</button>
        <button type="button" className={`ui-chip${isDay(yesterday) ? " on" : ""}`} onClick={() => set(yesterday)}>เมื่อวาน</button>
        <span className="lab-or">หรือกรอกวันที่</span>
      </div>
      <div className="dob-wrap">
        <div className={`dob-box${problem || error ? " bad" : ""}`}>
          <input ref={dayRef} className="dob-day" inputMode="numeric" autoComplete="off" placeholder="วัน" aria-label="วันที่"
            value={day} onChange={(e) => changeDay(e.target.value)} />
          <select ref={monthRef} className={`dob-month${month ? "" : " empty"}`} aria-label="เดือน" value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">เดือน</option>
            {THAI_MONTHS_FULL.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
          </select>
          <input className="dob-year" inputMode="numeric" autoComplete="off" placeholder="ปี พ.ศ." aria-label="ปี พ.ศ."
            value={year} onChange={(e) => setYear(digits(e.target.value).slice(0, 4))} />
          <button ref={calBtnRef} type="button" className="dob-cal-btn" aria-label="เลือกจากปฏิทิน" aria-expanded={calOpen} onClick={() => setCalOpen((o) => !o)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </button>
        </div>
        {calOpen && (
          <ThaiCalendar
            label="เลือกวันที่ตรวจจากปฏิทิน"
            selected={valid ? { day: Number(day), month: Number(month), yearBE: y } : null}
            initial={valid ? { month: Number(month), yearBE: y } : { month: today.getMonth() + 1, yearBE: thisYearBE }}
            onClose={closeCal}
            onPick={(p) => { setDay(String(p.day)); setMonth(String(p.month)); setYear(String(p.yearBE)); closeCal(); }}
          />
        )}
      </div>
      <input type="hidden" name={name} value={value} />
      <div className="dob-msg">
        {valid ? (
          <span className="dob-read">{Number(day)} {THAI_MONTHS_FULL[Number(month) - 1]} {y} ({agoText})</span>
        ) : problem ? (
          <span className="err">{problem === "วันเกิดอยู่ในอนาคต" ? "วันที่ตรวจอยู่ในอนาคต" : problem}</span>
        ) : error ? (
          <span className="err">{error}</span>
        ) : (
          <span className="ui-hint">ไม่บังคับ ถ้าไม่ทราบวันที่เว้นว่างได้</span>
        )}
      </div>
    </fieldset>
  );
}
