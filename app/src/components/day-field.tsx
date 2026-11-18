"use client";
// One date for a plain GET filter form, picked on the พ.ศ. calendar (same button and calendar as
// the date filter on the areas and all-cases pages). Shows the day in words; sends one hidden
// input as "yyyy-mm-dd" (ค.ศ.), so the URL format of the page using it stays the same.
import { useState } from "react";
import { THAI_MONTHS } from "@/lib/format";
import { ThaiCalendar } from "./thai-calendar";

type Day = { day: number; month: number; yearBE: number };
const parse = (v: string): Day | null => {
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? { day: Number(m[3]), month: Number(m[2]), yearBE: Number(m[1]) + 543 } : null;
};
const iso = (d: Day) => `${d.yearBE - 543}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;

export function DayField({ name, label, value }: { name: string; label: string; value: string }) {
  const [v, setV] = useState<Day | null>(parse(value));
  const [open, setOpen] = useState(false);
  const now = new Date();
  return (
    <span className="dr-field">
      <span className="dr-lbl">{label}</span>
      <span className="dob-wrap">
        <button type="button" className={`dr-btn${v ? "" : " empty"}`} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {v ? `${v.day} ${THAI_MONTHS[v.month - 1]} ${v.yearBE}` : "เลือกวันที่"}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
        </button>
        {v && <button type="button" className="dr-x" aria-label={`ล้างวันที่${label}`} onClick={() => setV(null)}>×</button>}
        {open && (
          <ThaiCalendar downOnly label={`เลือกวันที่${label}`} selected={v} initial={v ? { month: v.month, yearBE: v.yearBE } : { month: now.getMonth() + 1, yearBE: now.getFullYear() + 543 }}
            onPick={(p) => { setV(p); setOpen(false); }} onClose={() => setOpen(false)} />
        )}
      </span>
      <input type="hidden" name={name} value={v ? iso(v) : ""} />
    </span>
  );
}
