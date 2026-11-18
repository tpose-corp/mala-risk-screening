// /admin/patients — every patient in the system, with the "waiting for identity check" queue.
// The list state (tab, search, unit, page, page size) lives in the URL; the detail page gets it
// as ?back= so its "กลับ" button returns to exactly this view.
import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { Card, PagerBar } from "@/components/ui/card";
import { CompactSearch } from "@/components/ui/compact-search";
import { FilterGroup } from "@/components/ui/filter-panel";
import { PageAids } from "@/components/ui/page-aids";
import { PerPage } from "@/components/ui/per-page";
import { SegTabs } from "@/components/ui/seg-tabs";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { ageFromThaiDob, formatCardId, thaiDate, thaiDateTime } from "@/lib/format";

// "14:05 น." (shown on hover; the table keeps one date per cell)
const timeOf = (d: Date) => thaiDateTime(d).slice(thaiDate(d).length).trim();
import { PER_PAGE_CHOICES, num, pageInfo } from "@/lib/paging";
import { requireAdmin } from "@/lib/session";

const TAB_LABEL: Record<string, string> = { "": "ผู้ป่วยทั้งหมด", pending: "ผู้ป่วยรอยืนยันตัวตน", inactive: "ผู้ป่วยที่ปิดใช้งาน" };

export default async function AdminPatients({ searchParams }: PageProps<"/admin/patients">) {
  const user = await requireAdmin();
  const sp = await searchParams;
  const one = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const status = ["pending", "inactive"].includes(one(sp.status)) ? one(sp.status) : "";
  const fac = one(sp.fac);
  const q = one(sp.q);
  const per = PER_PAGE_CHOICES.includes(Number(sp.per)) ? Number(sp.per) : 20;
  const digits = q.replace(/\D/g, "");

  const base: Prisma.PatientWhereInput = {
    ...(fac ? { facility: fac } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { hn: { contains: q } }, ...(digits.length >= 4 ? [{ cardId: { contains: digits } }] : [])] } : {}),
  };
  const byTab: Record<string, Prisma.PatientWhereInput> = { "": { active: true }, pending: { status: "pending", active: true }, inactive: { active: false } };
  const [nAll, nPending, nInactive] = await Promise.all(["", "pending", "inactive"].map((k) => db.patient.count({ where: { ...base, ...byTab[k] } })));
  const total = status === "pending" ? nPending : status === "inactive" ? nInactive : nAll;
  const pg = pageInfo(total, sp.page, per);
  const list = await db.patient.findMany({
    where: { ...base, ...byTab[status] }, orderBy: { registeredAt: "desc" }, skip: pg.skip, take: pg.take,
    include: { screenings: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true, isAlert: true, alertKind: true } }, _count: { select: { screenings: true } } },
  });
  const facilities = (await db.facility.findMany({ orderBy: { name: "asc" } })).map((f) => f.name);
  await audit({ user, action: "patient.list.view", detail: `total=${total} page=${pg.page}` });

  const href = (extra: Record<string, string | number | undefined>) => {
    const all = { status, fac, q, per: per === 20 ? undefined : per, ...extra };
    const u = new URLSearchParams(Object.entries(all).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)]));
    const s = u.toString();
    return s ? `/admin/patients?${s}` : "/admin/patients";
  };
  const here = href({ page: pg.page > 1 ? pg.page : undefined });

  return (
    <>
      <Topbar menu="apatients" crumb="จัดการผู้ป่วย" />
      <main className="ui-page">
        {/* stays on screen while scrolling, so you always see which list you are in */}
        <div className="ui-sticky">
          <div className="ui-head">
            <div>
              <h1 className="ui-title">จัดการผู้ป่วย</h1>
              <p className="ui-subtitle">ผู้ป่วยที่ รพ.สต. เพิ่มเข้ามาจะรอผู้ดูแลระบบยืนยันตัวตนและเพิ่ม HN</p>
            </div>
            <SegTabs label="สถานะผู้ป่วย" active={status} tabs={[
              { key: "", label: "ทั้งหมด", href: href({ status: "", page: undefined }), count: nAll },
              { key: "pending", label: "รอยืนยันตัวตน", href: href({ status: "pending", page: undefined }), count: nPending },
              { key: "inactive", label: "ปิดใช้งาน", href: href({ status: "inactive", page: undefined }), count: nInactive },
            ]} />
          </div>
        </div>


        <Card
          title={TAB_LABEL[status]}
          count={`${num(total)} คน${q ? ` ที่พบ "${q}"` : ""}${fac ? ` ใน ${fac}` : ""}`}
          actions={<>
            <CompactSearch action="/admin/patients" hidden={{ ...(status ? { status } : {}), ...(per !== 20 ? { per: String(per) } : {}) }}
              name="q" value={q} placeholder="ชื่อ HN หรือเลขบัตรอย่างน้อย 4 หลัก" activeCount={fac ? 1 : 0} clearHref={href({ q: "", fac: "", page: undefined })}>
              <FilterGroup label="หน่วยบริการประจำ">
                <select className="ui-select" name="fac" defaultValue={fac}>
                  <option value="">ทุกหน่วยบริการ</option>
                  {facilities.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </FilterGroup>
            </CompactSearch>
            <PerPage value={per} unit="คน" />
          </>}
          footer={<PagerBar pg={pg} href={(page) => href({ page })} unit="คน" />}
        >
          {/* key = which list: switching tab or page remounts the body and plays the fade-in */}
          <div className="ui-table-wrap sticky-head" key={`${status}|${pg.page}|${per}|${q}|${fac}`}>
            <table className="ui-table pt-table">
              <colgroup>
                <col className="c-name" /><col className="c-id" /><col className="c-unit" /><col className="c-status" />
                <col className="c-count" /><col className="c-last" /><col className="c-reg" /><col className="c-act" />
              </colgroup>
              <thead>
                <tr><th>ผู้ป่วย</th><th>เลขบัตรประชาชน / HN</th><th>หน่วยประจำ</th><th>สถานะ</th><th className="num">คัดกรอง</th><th>คัดกรองล่าสุด</th><th>ลงทะเบียน</th><th /></tr>
              </thead>
              <tbody className="ui-fade-rows">
                {list.map((p) => {
                  const last = p.screenings[0];
                  const open = `/admin/patients/${p.id}?back=${encodeURIComponent(here)}`;
                  return (
                    <tr key={p.id} className={p.active ? "" : "off"}>
                      <td>
                        <Link href={open} className="pt-name">{p.name}</Link>
                        <span className="sub-line">{p.sex} {ageFromThaiDob(p.dob)} ปี</span>
                      </td>
                      <td>
                        <span className="mono">{formatCardId(p.cardId)}</span>
                        <span className="sub-line">{p.hn ? <>HN <span className="mono">{p.hn}</span></> : "ยังไม่มี HN"}</span>
                      </td>
                      <td>{p.facility ?? <span className="pt-muted">ยังไม่มี</span>}</td>
                      <td>
                        {!p.active ? <span className="ui-badge muted">ปิดใช้งาน</span> : p.status === "pending" ? <span className="ui-badge warn">รอยืนยันตัวตน</span> : <span className="ui-badge ok">ยืนยันแล้ว</span>}
                      </td>
                      <td className="num">{p._count.screenings ? `${p._count.screenings} ครั้ง` : <span className="pt-muted">0 ครั้ง</span>}</td>
                      <td>
                        {last ? (
                          <>
                            <span title={timeOf(last.createdAt)}>{thaiDate(last.createdAt)}</span>
                            <span className="sub-line">
                              {last.isAlert
                                ? <span className={`pt-result ${last.alertKind === "dose" ? "hi" : "warn"}`}>{last.alertKind === "dose" ? "ใช้ยาเกินขนาด" : "เสี่ยงทั่วไป"}</span>
                                : <span className="pt-result">ไม่แจ้งเตือน</span>}
                            </span>
                          </>
                        ) : <span className="pt-muted">ยังไม่เคย</span>}
                      </td>
                      <td><span title={timeOf(p.registeredAt)}>{thaiDate(p.registeredAt)}</span></td>
                      <td style={{ textAlign: "right" }}><Link href={open} className="ui-btn secondary sm">จัดการ</Link></td>
                    </tr>
                  );
                })}
                {list.length === 0 && <tr><td colSpan={8} className="ui-empty">{q || fac ? "ไม่พบผู้ป่วยตามที่ค้นหา" : "ไม่มีผู้ป่วยในรายการนี้"}</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
        <PageAids />
      </main>
    </>
  );
}
