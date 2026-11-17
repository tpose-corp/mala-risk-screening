"use client";
// Filter panel (layout from the team's printing-request system): a search box and a
// "ตัวกรอง" button on one line; the labelled filter groups slide open underneath.
// It is still a plain GET form, so the filters live in the URL (reload, paging, CSV keep them).
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ChevronDown, FilterIcon, SearchIcon } from "./icons";

export function FilterPanel(props: {
  action: string;
  hidden?: Record<string, string>;
  search?: { name: string; value: string; placeholder: string };
  activeCount: number; // filters in use besides the search box
  clearHref?: string; // shown when anything is filtered
  children?: ReactNode; // <FilterGroup>s
  note?: ReactNode;
}) {
  const [open, setOpen] = useState(props.activeCount > 0);
  const anything = props.activeCount > 0 || !!props.search?.value;
  return (
    <form className="ui-card ui-card-body" action={props.action} role="search">
      {Object.entries(props.hidden ?? {}).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <div className="ui-filter-top">
        {props.search && (
          <div className="ui-search">
            <SearchIcon />
            <input name={props.search.name} defaultValue={props.search.value} placeholder={props.search.placeholder} aria-label={props.search.placeholder} />
          </div>
        )}
        {props.children && (
          <button type="button" className="ui-btn secondary ui-filter-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <FilterIcon />
            ตัวกรอง
            {props.activeCount > 0 && <span className="ui-filter-count">{props.activeCount}</span>}
            <ChevronDown className="chev" />
          </button>
        )}
        <button type="submit" className="ui-btn primary">ค้นหา</button>
        {anything && props.clearHref && <Link href={props.clearHref} className="ui-link-btn">ล้างทั้งหมด</Link>}
      </div>
      {props.children && (
        <div className={`ui-collapse${open ? " open" : ""}`}>
          <div>
            <div className="ui-filter-row">{props.children}</div>
          </div>
        </div>
      )}
      {props.note && <p className="ui-filter-note">{props.note}</p>}
    </form>
  );
}

export function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="ui-filter-group">
      <span className="ui-filter-label">{label}</span>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}
