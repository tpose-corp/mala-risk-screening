"use client";
// A small search that sits on a toolbar line: a "ค้นหา" button that opens into a search box,
// plus an optional "ตัวกรอง" button whose filter groups drop down under it.
// A plain GET form, so the search lives in the URL (reload and paging keep it).
// Opens by itself when a search or filter is already in use, so the user sees what is applied.
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { FilterIcon, SearchIcon } from "./icons";

export function CompactSearch(props: {
  action: string;
  hidden?: Record<string, string>;
  name: string;
  value: string;
  placeholder: string;
  activeCount: number; // filters in use besides the search text
  clearHref: string;
  children?: ReactNode; // <FilterGroup>s for the drop-down
}) {
  const anything = !!props.value || props.activeCount > 0;
  const [open, setOpen] = useState(anything);
  const [filters, setFilters] = useState(false);
  // closing plays the open animation backwards first, then removes the element
  const [closing, setClosing] = useState(false);
  const [dropClosing, setDropClosing] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLFormElement>(null);
  const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const closeDrop = () => {
    if (reduced()) return setFilters(false);
    setDropClosing(true);
    setTimeout(() => { setFilters(false); setDropClosing(false); }, 180);
  };
  const closeAll = () => {
    if (reduced()) { setFilters(false); return setOpen(false); }
    if (filters) setDropClosing(true);
    setClosing(true);
    setTimeout(() => { setFilters(false); setDropClosing(false); setOpen(false); setClosing(false); }, 220);
  };

  // close the filter drop-down on an outside click or Esc
  useEffect(() => {
    if (!filters) return;
    const down = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) closeDrop(); };
    const key = (e: KeyboardEvent) => e.key === "Escape" && closeDrop();
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); };
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps -- closeDrop only uses setters

  if (!open) {
    return (
      <button type="button" className="cs-open" onClick={() => { setOpen(true); setTimeout(() => input.current?.focus(), 0); }}>
        <SearchIcon /> ค้นหา
      </button>
    );
  }
  return (
    <form ref={box} className={`cs-form${closing ? " closing" : ""}`} action={props.action} role="search">
      {Object.entries(props.hidden ?? {}).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <span className="cs-box">
        <SearchIcon />
        <input ref={input} name={props.name} defaultValue={props.value} placeholder={props.placeholder} aria-label={props.placeholder} />
      </span>
      {props.children && (
        <span className="cs-filter-wrap">
          <button type="button" className={`cs-btn${props.activeCount ? " on" : ""}`} aria-expanded={filters} onClick={() => (filters ? closeDrop() : setFilters(true))}>
            <FilterIcon /> ตัวกรอง{props.activeCount > 0 && <span className="cs-count">{props.activeCount}</span>}
          </button>
          {/* kept in the DOM (hidden) so the chosen filters are still sent with the search */}
          <div className={`cs-drop${dropClosing ? " closing" : ""}`} hidden={!filters}>
            {props.children}
            <button type="submit" className="ui-btn primary sm">ใช้ตัวกรอง</button>
          </div>
        </span>
      )}
      <button type="submit" className="cs-btn primary">ค้นหา</button>
      {anything ? <Link href={props.clearHref} className="cs-clear">ล้าง</Link>
        : <button type="button" className="cs-clear" onClick={closeAll}>ปิด</button>}
    </form>
  );
}
