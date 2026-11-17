"use client";
// Segmented tabs with a sliding highlight (printing-request system's tab-nav-thumb idea): the
// coloured thumb glides to the tab you click right away, while the new list loads.
import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";

export type SegTab = { key: string; label: string; href: string; count?: number };

export function SegTabs({ tabs, active, label }: { tabs: SegTab[]; active: string; label: string }) {
  const [current, setCurrent] = useState(active);
  const [synced, setSynced] = useState(active);
  if (synced !== active) { setSynced(active); setCurrent(active); } // follow the server after navigation
  const nav = useRef<HTMLElement>(null);
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const el = nav.current?.querySelector<HTMLElement>(`[data-key="${CSS.escape(current)}"]`);
    if (el) setThumb({ left: el.offsetLeft, width: el.offsetWidth });
  }, [current]);

  return (
    <nav className="ui-seg" aria-label={label} ref={nav}>
      {thumb && <span className="ui-seg-thumb" style={{ transform: `translateX(${thumb.left - 4}px)`, width: thumb.width }} aria-hidden="true" />}
      {tabs.map((t) => (
        <Link key={t.key} data-key={t.key} href={t.href} className={current === t.key ? "on" : ""} aria-current={current === t.key ? "page" : undefined}
          onClick={() => setCurrent(t.key)} scroll={false}>
          {t.label}
          {t.count !== undefined && <span className="n">{t.count.toLocaleString("th-TH")}</span>}
        </Link>
      ))}
    </nav>
  );
}
