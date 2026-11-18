// /audit — read-only audit log viewer, admin role only (rule.md: logs restricted to authorised staff).
// There is deliberately no edit/delete button, and the database itself blocks UPDATE/DELETE.
// Computer Crime Act §26 (rule.md), what this page covers:
//   kept at least 90 days, never deleted     → retention box (oldest row, days covered)
//   linked to a real user/account            → "ใคร" column (name, role, facility)
//   administrators can retrieve the logs     → search box, filters (type, date range, failures) + CSV
// Repeats in a row (e.g. the inbox auto-refresh) are shown as one line with a count; every raw
// row is still stored and is in the CSV.
import Link from "next/link";
import { redirect } from "next/navigation";
import { Pager } from "@/components/list-controls";
import { DayField } from "@/components/day-field";
import { Topbar } from "@/components/topbar";
import { PerPage } from "@/components/ui/per-page";
import { PageHead } from "@/components/ui/card";
import { CompactSearch } from "@/components/ui/compact-search";
import { FilterGroup } from "@/components/ui/filter-panel";
import { PageAids } from "@/components/ui/page-aids";
import { DownloadIcon } from "@/components/ui/icons";
import { audit } from "@/lib/audit";
import { auditTargetNames } from "@/lib/audit-names";
import { auditQuery, auditWhere, hasAuditFilters, readAuditFilters } from "@/lib/audit-filters";
import { AUDIT_RETENTION_DAYS, CATEGORY_LABEL, WARN_ACTIONS, collapse, describeRow, retentionStatus } from "@/lib/audit-text";
import { db } from "@/lib/db";
import { thaiDate } from "@/lib/format";
import { PER_PAGE_CHOICES, num, pageInfo, periodStart } from "@/lib/paging";
import { requireUser } from "@/lib/session";

const PER_PAGE = 100;
const TZ = "Asia/Bangkok";
const time = (d: Date) => d.toLocaleTimeString("th-TH", { timeZone: TZ, hour: "2-digit", minute: "2-digit", second: "2-digit" });
const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });
const dayLabel = (d: Date) => d.toLocaleDateString("th-TH", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" });

export default async function AuditPage({ searchParams }: PageProps<"/audit">) {
  const user = await requireUser();
  if (user.role !== "admin") {
    await audit({ user, action: "audit.view.denied" });
    redirect("/patients");
  }

  const sp = await searchParams;
  const f = readAuditFilters(sp);
  const users = await db.user.findMany({ orderBy: [{ facility: "asc" }, { displayName: "asc" }] });
  const where = auditWhere(f, users);

  const total = await db.auditLog.count({ where });
  const per = PER_PAGE_CHOICES.includes(Number(sp.per)) ? Number(sp.per) : PER_PAGE;
  const pg = pageInfo(total, sp.page, per);
  const logs = await db.auditLog.findMany({ where, orderBy: { id: "desc" }, skip: pg.skip, take: pg.take });

  // Retention box: counted over the whole log, not the filtered view.
  const allRows = await db.auditLog.count();
  const oldest = (await db.auditLog.findFirst({ orderBy: { id: "asc" }, select: { at: true } }))?.at ?? null;
  const kept = retentionStatus(oldest);
  const since30 = periodStart("30d");
  const warn30 = await db.auditLog.count({ where: { action: { in: WARN_ACTIONS }, ...(since30 ? { at: { gte: since30 } } : {}) } });
  await audit({ user, action: "audit.view" });

  const lines = collapse(logs);
  const names = await auditTargetNames(logs);
  const perDay = new Map<string, number>();
  for (const { row } of lines) perDay.set(dayKey(row.at), (perDay.get(dayKey(row.at)) ?? 0) + 1);
  const pageHref = (p: number) => `/audit${auditQuery(f, { ...(per !== PER_PAGE ? { per } : {}), ...(p > 1 ? { page: p } : {}) })}`;

  return (
    <>
      <Topbar menu="audit" crumb="บันทึกการใช้งาน" />
      <main className="ui-page">
        <PageHead sticky title="บันทึกการใช้งาน" subtitle="ใครทำอะไรในระบบ เมื่อไหร่ จากหน่วยบริการและอุปกรณ์ไหน ตาม พ.ร.บ. คอมพิวเตอร์ มาตรา 26 ไม่มีชื่อผู้ป่วยหรือค่าแล็บในบันทึก"
          actions={<a href={`/audit/export${auditQuery(f)}`} className="ui-export"><DownloadIcon />ส่งออก CSV{hasAuditFilters(f) ? ` ${num(total)} รายการที่กรอง` : ""}</a>} />

        <div className="stats">
          <div className="card pad">
            <span>บันทึกทั้งหมด</span><b>{num(allRows)}</b>
            <div className="note">แก้ไขหรือลบไม่ได้ ไม่มีการลบอัตโนมัติ</div>
          </div>
          <div className="card pad">
            <span>เก็บย้อนหลัง</span><b>{num(kept.days)} วัน</b>
            <div className="note">
              {oldest ? `ตั้งแต่ ${thaiDate(oldest)} ` : ""}
              {kept.full ? `ครบขั้นต่ำ ${AUDIT_RETENTION_DAYS} วันตามกฎหมายแล้ว` : `กฎหมายกำหนดอย่างน้อย ${AUDIT_RETENTION_DAYS} วัน ระบบเก็บทุกรายการตั้งแต่เริ่มใช้งาน`}
            </div>
          </div>
          <div className="card pad">
            <span>ไม่สำเร็จหรือถูกปฏิเสธ 30 วันล่าสุด</span><b style={warn30 ? { color: "var(--warn)" } : undefined}>{num(warn30)}</b>
            <div className="note"><Link href="/audit?warn=1" className="name-link">ดูเฉพาะรายการเหล่านี้</Link></div>
          </div>
        </div>

        {/* the log: its toolbar, column heads and day heading stay on screen while scrolling */}
        <section className="au-card">
          <div className="au-tools">
            <div className="au-count">
              <b>{num(total)} รายการ</b>
              {hasAuditFilters(f) && <Link href="/audit" className="au-clear">ล้างการค้นหา</Link>}
            </div>
            <CompactSearch action="/audit" hidden={per !== PER_PAGE ? { per: String(per) } : {}} name="q" value={f.q}
              placeholder="ชื่อผู้ใช้ หน่วยบริการ สิ่งที่ทำ หรือเลขเคส" activeCount={[f.cat, f.from || f.to, f.warn].filter(Boolean).length} clearHref="/audit">
              <FilterGroup label="ประเภท">
                <select className="ui-select" name="cat" defaultValue={f.cat}>
                  <option value="">ทุกประเภท</option>
                  {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </FilterGroup>
              <FilterGroup label="ช่วงวันที่">
                <div className="dr-range au-dates">
                  <DayField name="from" label="ตั้งแต่" value={f.from} />
                  <DayField name="to" label="ถึง" value={f.to} />
                </div>
              </FilterGroup>
              <FilterGroup label="ตัวเลือก">
                <label className="ui-chip"><input type="checkbox" name="warn" value="1" defaultChecked={f.warn} />เฉพาะที่ไม่สำเร็จหรือถูกปฏิเสธ</label>
              </FilterGroup>
            </CompactSearch>
            <nav className="au-pages" aria-label="เลือกหน้า">
              {pg.page > 1 ? <Link href={pageHref(pg.page - 1)} className="au-pg" aria-label="หน้าก่อนหน้า">‹</Link> : <span className="au-pg off">‹</span>}
              <span>หน้า {num(pg.page)} / {num(pg.pages)}</span>
              {pg.page < pg.pages ? <Link href={pageHref(pg.page + 1)} className="au-pg" aria-label="หน้าถัดไป">›</Link> : <span className="au-pg off">›</span>}
            </nav>
          </div>

          <table className="au-table">
            <colgroup><col className="c-t" /><col className="c-what" /><col className="c-who" /><col className="c-where" /><col /></colgroup>
            <thead>
              <tr><th>เวลา</th><th>ทำอะไร</th><th>ใคร</th><th>ที่ไหน</th><th>รายละเอียด</th></tr>
            </thead>
            <tbody>
              {lines.length === 0 && (
                <tr><td colSpan={5} className="au-empty">ไม่พบรายการ{hasAuditFilters(f) ? " ลองเปลี่ยนคำค้นหรือตัวกรอง" : ""}</td></tr>
              )}
              {lines.map(({ row: l, count, firstAt }, i) => {
                const d = describeRow(l, users, names);
                const newDay = i === 0 || dayKey(lines[i - 1].row.at) !== dayKey(l.at);
                return [
                  newDay && (
                    <tr key={`d${l.id}`} className="au-day">
                      <td colSpan={5}>{dayLabel(l.at)}<span>{perDay.get(dayKey(l.at))} รายการในหน้านี้</span></td>
                    </tr>
                  ),
                  <tr key={l.id} className={d.warn ? "warn" : undefined}>
                    <td className="au-time">
                      {time(l.at)}
                      {count > 1 && time(firstAt) !== time(l.at) && <span className="sub">ตั้งแต่ {time(firstAt)}</span>}
                    </td>
                    <td>
                      {d.warn ? <span className="pill warn">{d.what}</span> : <b className="au-what">{d.what}</b>}
                      {d.target && <span className="sub">{d.target}</span>}
                    </td>
                    <td>
                      <span className="au-who">{d.who}</span>
                      {d.whoNote && <span className="sub">{d.whoNote}</span>}
                    </td>
                    <td>
                      {d.facility || <span className="au-none">ไม่ทราบ</span>}
                      {d.device && <span className="sub">{d.device}</span>}
                    </td>
                    <td className="au-detail">
                      {d.detail}
                      {count > 1 && <span className="sub">ซ้ำ {count} ครั้งติดกัน</span>}
                    </td>
                  </tr>,
                ];
              })}
            </tbody>
          </table>
          <div className="au-foot"><PerPage value={per} /><Pager pg={pg} href={pageHref} unit="รายการ" /></div>
        </section>
        <div className="note">เวลาทั้งหมดเป็นเวลาประเทศไทย (UTC+7) ตามนาฬิกาของเซิร์ฟเวอร์</div>
        <PageAids />
      </main>
    </>
  );
}
