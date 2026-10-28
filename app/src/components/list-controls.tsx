// Search/filter bar and pager shared by the hospital's long lists.
// Plain GET form and links: no client JavaScript needed, and the URL always shows the filters.
import Link from "next/link";
import type { CaseFilters } from "@/lib/case-filters";
import { hasFilters } from "@/lib/case-filters";
import { PERIODS, num, type pageInfo } from "@/lib/paging";

export function ListFilters(props: {
  action: string;
  hidden?: Record<string, string>;
  f: CaseFilters;
  facilities: string[];
  periodLabel: string;
  withResult?: boolean;
  clearHref: string;
}) {
  const { f } = props;
  return (
    <form className="filters" action={props.action}>
      {Object.entries(props.hidden ?? {}).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <input className="fld" name="q" defaultValue={f.q} placeholder="ค้นหาชื่อหรือ HN" aria-label="ค้นหาชื่อหรือ HN" />
      <select className="fld" name="fac" defaultValue={f.fac} aria-label="หน่วยบริการ">
        <option value="">ทุก รพ.สต.</option>
        {props.facilities.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
      {props.withResult && (
        <select className="fld" name="result" defaultValue={f.result} aria-label="ผลประเมิน">
          <option value="all">ทุกผล</option>
          <option value="alert">แจ้งเตือน</option>
          <option value="noalert">ไม่แจ้งเตือน</option>
        </select>
      )}
      <select className="fld" name="period" defaultValue={f.period} aria-label={props.periodLabel}>
        {PERIODS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
      </select>
      <button className="btn-s primary" type="submit">ค้นหา</button>
      {hasFilters(f) && <Link href={props.clearHref} className="btn-s">ล้างตัวกรอง</Link>}
    </form>
  );
}

export function Pager({ pg, href, unit = "เคส" }: { pg: ReturnType<typeof pageInfo>; href: (page: number) => string; unit?: string }) {
  if (pg.total === 0) return null;
  return (
    <nav className="pager" aria-label="เลือกหน้า">
      <span>แสดง {num(pg.from)} ถึง {num(pg.to)} จาก {num(pg.total)} {unit}</span>
      <span className="pager-btns">
        {pg.page > 1 ? <Link href={href(pg.page - 1)} className="btn-s">ก่อนหน้า</Link> : <span className="btn-s off">ก่อนหน้า</span>}
        <span className="pager-n">หน้า {num(pg.page)} จาก {num(pg.pages)}</span>
        {pg.page < pg.pages ? <Link href={href(pg.page + 1)} className="btn-s">ถัดไป</Link> : <span className="btn-s off">ถัดไป</span>}
      </span>
    </nav>
  );
}
