"use client";
// Screening-date filter on one line: a "ปี พ.ศ." dropdown (a whole year at once), or a custom
// "ตั้งแต่ [วันที่] ถึง [วันที่]" picked on the พ.ศ. calendar. A plain GET form, so the range lives in
// the URL as from / to = "dd/mm/yyyy" (พ.ศ.). Read on the server with readRange (src/lib/date-range.ts).
import { useRouter } from "next/navigation";
import { useState } from "react";
import { THAI_MONTHS } from "@/lib/format";
import { ThaiCalendar } from "./thai-calendar";

type Day = { day: number; month: number; yearBE: number };
const parse = (v: string): Day | null => {
  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? { day: Number(m[1]), month: Number(m[2]), yearBE: Number(m[3]) } : null;
};
const fmt = (d: Day) => `${String(d.day).padStart(2, "0")}/${String(d.month).padStart(2, "0")}/${d.yearBE}`;
const words = (d: Day) => `${d.day} ${THAI_MONTHS[d.month - 1]} ${d.yearBE}`;

export function DateRange({ action, hidden = {}, from, to, years, clearHref, title, current }: {
  action: string;
  hidden?: Record<string, string>;
  from: string; // "dd/mm/yyyy" (พ.ศ.) or ""
  to: string;
  years: number[]; // พ.ศ. years that have data, newest first
  clearHref: string; // the same page with no dates
  title: string;
  current: string; // the range now shown, in words
}) {
  const router = useRouter();
  const [a, setA] = useState<Day | null>(parse(from));
  const [b, setB] = useState<Day | null>(parse(to));
  const [open, setOpen] = useState<"a" | "b" | null>(null);
  const now = new Date();
  const today: Day = { day: now.getDate(), month: now.getMonth() + 1, yearBE: now.getFullYear() + 543 };
  const pick = (which: "a" | "b") => (p: Day) => { (which === "a" ? setA : setB)(p); setOpen(null); };

  const field = (which: "a" | "b", label: string, v: Day | null) => (
    <span className="dr-field">
      <span className="dr-lbl">{label}</span>
      <span className="dob-wrap">
        <button type="button" className={`dr-btn${v ? "" : " empty"}`} aria-expanded={open === which} onClick={() => setOpen(open === which ? null : which)}>
          {v ? words(v) : "เลือกวันที่"}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
        </button>
        {open === which && (
          <ThaiCalendar label={`เลือกวันที่${label}`} selected={v} initial={v ? { month: v.month, yearBE: v.yearBE } : { month: today.month, yearBE: today.yearBE }}
            onPick={pick(which)} onClose={() => setOpen(null)} />
        )}
      </span>
    </span>
  );

  const any = !!(a || b || from || to);
  // the year now shown, when the range is exactly one whole year
  const yearNow = (() => {
    const f = parse(from), t = parse(to);
    return f && t && f.day === 1 && f.month === 1 && t.day === 31 && t.month === 12 && f.yearBE === t.yearBE ? String(f.yearBE) : "";
  })();
  const go = (f: string, t: string) => {
    const u = new URLSearchParams({ ...hidden, ...(f ? { from: f } : {}), ...(t ? { to: t } : {}) });
    router.push(u.toString() ? `${action}?${u}` : action, { scroll: false });
  };
  const pickYear = (y: string) => (y ? go(`01/01/${y}`, `31/12/${y}`) : go("", ""));
  // "ล้าง": forget the dates picked here, and if a range is applied, show all time again
  const clear = () => { setA(null); setB(null); setOpen(null); if (from || to) router.push(clearHref, { scroll: false }); };

  return (
    <form className="dr" action={action}>
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <input type="hidden" name="from" value={a ? fmt(a) : ""} />
      <input type="hidden" name="to" value={b ? fmt(b) : ""} />
      <div className="dr-top">
        <span className="dr-title">{title}</span>
        <span className="dr-current">แสดง <b>{current}</b></span>
      </div>
      <div className="dr-bar">
        <label className="dr-year">
          <span className="dr-lbl">ปี พ.ศ.</span>
          <select className="ui-select" value={yearNow} onChange={(e) => pickYear(e.target.value)} aria-label="เลือกปี พ.ศ.">
            <option value="">{yearNow || !(from || to) ? "ทุกปี" : "ช่วงที่กำหนดเอง"}</option>
            {years.map((y) => <option key={y} value={String(y)}>{y}</option>)}
          </select>
        </label>
        <span className="dr-or">หรือ</span>
        <div className="dr-range">
          {field("a", "ตั้งแต่", a)}
          {field("b", "ถึง", b)}
        </div>
        <div className="dr-actions">
          <button type="submit" className="ui-btn primary sm" disabled={!a && !b}>ดูข้อมูล</button>
          {any && <button type="button" className="ui-btn secondary sm" onClick={clear}>ล้าง</button>}
        </div>
      </div>
    </form>
  );
}
