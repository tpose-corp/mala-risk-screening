// /audit — read-only audit log viewer, admin role only (rule.md: logs restricted to authorised staff).
// There is deliberately no edit/delete button, and the database itself blocks UPDATE/DELETE.
// Computer Crime Act §26 (rule.md), what this page covers:
//   kept at least 90 days, never deleted     → retention box (oldest row, days covered)
//   linked to a real user/account            → "ใคร" column (name, role, facility)
//   administrators can retrieve the logs     → filters (person, type, date range, failures) + CSV
// Repeats in a row (e.g. the inbox auto-refresh) are shown as one line with a count; every raw
// row is still stored and is in the CSV.
import Link from "next/link";
import { redirect } from "next/navigation";
import { Pager } from "@/components/list-controls";
import { Topbar } from "@/components/topbar";
import { PerPage } from "@/components/ui/per-page";
import { PageHead } from "@/components/ui/card";
import { FilterGroup, FilterPanel } from "@/components/ui/filter-panel";
import { DownloadIcon } from "@/components/ui/icons";
import { audit } from "@/lib/audit";
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
  const where = auditWhere(f);

  const total = await db.auditLog.count({ where });
  const per = PER_PAGE_CHOICES.includes(Number(sp.per)) ? Number(sp.per) : PER_PAGE;
  const pg = pageInfo(total, sp.page, per);
  const logs = await db.auditLog.findMany({ where, orderBy: { id: "desc" }, skip: pg.skip, take: pg.take });
  const users = await db.user.findMany({ orderBy: [{ facility: "asc" }, { displayName: "asc" }] });

  // Retention box: counted over the whole log, not the filtered view.
  const allRows = await db.auditLog.count();
  const oldest = (await db.auditLog.findFirst({ orderBy: { id: "asc" }, select: { at: true } }))?.at ?? null;
  const kept = retentionStatus(oldest);
  const since30 = periodStart("30d");
  const warn30 = await db.auditLog.count({ where: { action: { in: WARN_ACTIONS }, ...(since30 ? { at: { gte: since30 } } : {}) } });
  await audit({ user, action: "audit.view" });

  const lines = collapse(logs);

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

        <FilterPanel action="/audit" hidden={per !== PER_PAGE ? { per: String(per) } : {}} activeCount={[f.who, f.cat, f.from || f.to, f.warn].filter(Boolean).length} clearHref="/audit">
          <FilterGroup label="ผู้ใช้">
            <select className="ui-select" name="who" defaultValue={f.who}>
              <option value="">ทุกคน</option>
              {users.map((u) => <option key={u.id} value={u.username}>{u.displayName} ({u.facility ?? "รพ."})</option>)}
            </select>
          </FilterGroup>
          <FilterGroup label="ประเภท">
            <select className="ui-select" name="cat" defaultValue={f.cat}>
              <option value="">ทุกประเภท</option>
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </FilterGroup>
          <FilterGroup label="ช่วงวันที่">
            <input className="ui-select" type="date" name="from" defaultValue={f.from} aria-label="ตั้งแต่" />
            <span className="ui-hint" style={{ alignSelf: "center" }}>ถึง</span>
            <input className="ui-select" type="date" name="to" defaultValue={f.to} aria-label="ถึง" />
          </FilterGroup>
          <FilterGroup label="ตัวเลือก">
            <label className="ui-chip"><input type="checkbox" name="warn" value="1" defaultChecked={f.warn} />เฉพาะที่ไม่สำเร็จหรือถูกปฏิเสธ</label>
          </FilterGroup>
        </FilterPanel>

        <div className="card" style={{ overflowX: "auto" }}>
          <table className="plist audit">
            <thead>
              <tr><th>เวลา</th><th>ใคร</th><th>ทำอะไร</th><th>ที่ไหน</th><th>รายละเอียด</th></tr>
            </thead>
            <tbody>
              {lines.length === 0 && (
                <tr><td colSpan={5} className="note" style={{ textAlign: "center", padding: 28 }}>ไม่พบรายการ</td></tr>
              )}
              {lines.map(({ row: l, count, firstAt }, i) => {
                const d = describeRow(l, users);
                const newDay = i === 0 || dayKey(lines[i - 1].row.at) !== dayKey(l.at);
                return [
                  newDay && <tr key={`d${l.id}`} className="day"><td colSpan={5}>{dayLabel(l.at)}</td></tr>,
                  <tr key={l.id} className={d.warn ? "warn" : undefined}>
                    <td className="t">
                      {count > 1 && time(firstAt) !== time(l.at) ? `${time(firstAt)} ถึง ${time(l.at)}` : time(l.at)}
                    </td>
                    <td>
                      <b>{d.who}</b>
                      {d.whoNote && <div className="note">{d.whoNote}</div>}
                    </td>
                    <td>
                      {d.warn ? <span className="pill warn">{d.what}</span> : d.what}
                      {d.target && <div className="note">{d.target}</div>}
                    </td>
                    <td>
                      {d.facility}
                      {d.device && <div className="note">{d.device}</div>}
                    </td>
                    <td className="d">
                      {d.detail}
                      {count > 1 && <div className="note">ซ้ำ {count} ครั้งติดกัน</div>}
                    </td>
                  </tr>,
                ];
              })}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}><PerPage value={per} /><Pager pg={pg} href={(p) => `/audit${auditQuery(f, { ...(per !== PER_PAGE ? { per } : {}), ...(p > 1 ? { page: p } : {}) })}`} unit="รายการ" /></div>
        <div className="note">เวลาทั้งหมดเป็นเวลาประเทศไทย (UTC+7) ตามนาฬิกาของเซิร์ฟเวอร์</div>
      </main>
    </>
  );
}
