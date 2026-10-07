"use client";
// Date of birth: [วัน] [เดือน ▾] [ปี พ.ศ.]
// - day and year are typed (numbers are faster to type than to scroll for)
// - month is picked by its Thai name, because many people remember "สิงหาคม" but not that it's 8
// - the date is read back in words with the age, so a wrong digit is caught by eye
// - a ค.ศ. year (e.g. 1958) gets a one-click fix to พ.ศ.
// - or click the calendar button and pick the day from a พ.ศ. calendar (ThaiCalendar)
//
// The visible fields have no `name`, so they are NOT sent. A hidden input sends one value,
// "dd/mm/yyyy", the same format the database already uses (and the server re-checks it).

import { useCallback, useRef, useState } from "react";
import { THAI_MONTHS_FULL, ageFromThaiDob, dobProblem } from "@/lib/format";
import { ThaiCalendar } from "./thai-calendar";

const digits = (s: string) => s.replace(/\D/g, "");

export function DobPicker({ error }: { error?: string }) {
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const monthRef = useRef<HTMLSelectElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const calBtnRef = useRef<HTMLButtonElement>(null);
  const [calOpen, setCalOpen] = useState(false);
  const closeCal = useCallback(() => {
    setCalOpen(false);
    calBtnRef.current?.focus();
  }, []);

  function changeDay(raw: string) {
    const v = digits(raw).slice(0, 2);
    setDay(v);
    // 2 digits, or a single digit 4–9 (no day starts with those) → day is complete
    if (v.length === 2 || /^[4-9]$/.test(v)) monthRef.current?.focus();
  }

  function changeMonth(v: string) {
    setMonth(v);
    if (v) yearRef.current?.focus();
  }

  // ---- read the typed date back ----
  const thisYearCE = new Date().getFullYear();
  const y = Number(year);
  const complete = day !== "" && month !== "" && year.length === 4;
  const looksLikeCE = complete && y >= thisYearCE - 120 && y <= thisYearCE;
  const problem = complete && !looksLikeCE ? dobProblem(Number(day), Number(month), y) : null;
  const valid = complete && !looksLikeCE && !problem;
  const dob = valid ? `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}` : "";
  const age = valid ? ageFromThaiDob(dob) : null;

  // Where the calendar opens: the typed date if there is one, else the typed year, else today.
  const now = new Date();
  const thisYearBE = now.getFullYear() + 543;
  const typedYearOk = year.length === 4 && y >= thisYearBE - 120 && y <= thisYearBE;
  const calInitial = valid
    ? { month: Number(month), yearBE: y }
    : { month: month ? Number(month) : typedYearOk ? 1 : now.getMonth() + 1, yearBE: typedYearOk ? y : thisYearBE };

  return (
    <fieldset className="dob">
      <legend className="lbl">วันเกิด *</legend>
      <div className="dob-wrap">
      <div className={`dob-box${problem || (error && !valid) ? " bad" : ""}`}>
        <input className="dob-day" inputMode="numeric" autoComplete="off" placeholder="วัน" aria-label="วันที่"
          value={day} onChange={(e) => changeDay(e.target.value)} />
        <select ref={monthRef} className={`dob-month${month ? "" : " empty"}`} aria-label="เดือน"
          value={month} onChange={(e) => changeMonth(e.target.value)}>
          <option value="">เดือน</option>
          {THAI_MONTHS_FULL.map((m, i) => (
            <option key={m} value={String(i + 1)}>{m}</option>
          ))}
        </select>
        <input ref={yearRef} className="dob-year" inputMode="numeric" autoComplete="off" placeholder="ปี พ.ศ." aria-label="ปี พ.ศ."
          value={year} onChange={(e) => setYear(digits(e.target.value).slice(0, 4))} />
        <button ref={calBtnRef} type="button" className="dob-cal-btn" aria-label="เลือกจากปฏิทิน"
          aria-expanded={calOpen} onClick={() => setCalOpen((o) => !o)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </button>
      </div>
      {calOpen && (
        <ThaiCalendar
          selected={valid ? { day: Number(day), month: Number(month), yearBE: y } : null}
          initial={calInitial}
          onClose={closeCal}
          onPick={(p) => {
            setDay(String(p.day));
            setMonth(String(p.month));
            setYear(String(p.yearBE));
            closeCal();
          }}
        />
      )}
      </div>
      <input type="hidden" name="dob" value={dob} />

      <div className="dob-msg">
        {valid ? (
          <span className="dob-read">{Number(day)} {THAI_MONTHS_FULL[Number(month) - 1]} {y} อายุ {age} ปี</span>
        ) : looksLikeCE ? (
          <span className="dob-chip warn">
            ปี {y} เป็น ค.ศ. หรือเปล่า{" "}
            <button type="button" onClick={() => setYear(String(y + 543))}>เปลี่ยนเป็น พ.ศ. {y + 543}</button>
          </span>
        ) : problem ? (
          <span className="err">{problem}</span>
        ) : error ? (
          <span className="err">{error}</span>
        ) : null}
      </div>
    </fieldset>
  );
}
