// Page header, card with a header row, and pager for the UI kit.
import Link from "next/link";
import type { ReactNode } from "react";
import { num, type pageInfo } from "@/lib/paging";

// Page title row. `sticky` keeps it on screen under the app header while scrolling;
// `back` adds a "‹ กลับ" button in front of the title.
export function PageHead({ title, subtitle, actions, back, sticky }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; back?: string; sticky?: boolean }) {
  const head = (
    <div className="ui-head">
      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
        {back && <Link href={back} className="ui-btn secondary" title="กลับไปหน้าก่อนหน้า">‹ กลับ</Link>}
        <div style={{ minWidth: 0 }}>
          <h1 className="ui-title">{title}</h1>
          {subtitle && <p className="ui-subtitle">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="ui-card-actions">{actions}</div>}
    </div>
  );
  return sticky ? <div className="ui-sticky">{head}</div> : head;
}

export function Card({ title, count, actions, children, footer }: { title?: ReactNode; count?: ReactNode; actions?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <section className="ui-card">
      {(title || actions) && (
        <div className="ui-card-head">
          <div className="ui-card-title">{title}{count !== undefined && <span className="ui-card-count">{count}</span>}</div>
          {actions && <div className="ui-card-actions">{actions}</div>}
        </div>
      )}
      {children}
      {footer}
    </section>
  );
}

export function PagerBar({ pg, href, unit = "รายการ" }: { pg: ReturnType<typeof pageInfo>; href: (page: number) => string; unit?: string }) {
  if (pg.total === 0) return null;
  return (
    <nav className="ui-pager" aria-label="เลือกหน้า">
      <span>แสดง {num(pg.from)} ถึง {num(pg.to)} จาก {num(pg.total)} {unit}</span>
      <span className="btns">
        {pg.page > 1 ? <Link href={href(pg.page - 1)} className="ui-btn secondary sm">‹ ก่อนหน้า</Link> : <span className="ui-btn secondary sm off">‹ ก่อนหน้า</span>}
        <span>หน้า {num(pg.page)} จาก {num(pg.pages)}</span>
        {pg.page < pg.pages ? <Link href={href(pg.page + 1)} className="ui-btn secondary sm">ถัดไป ›</Link> : <span className="ui-btn secondary sm off">ถัดไป ›</span>}
      </span>
    </nav>
  );
}
