// /hospital/cases — every screening from every รพ.สต. (MVP core 2: the hospital keeps all cases
// for analysis, alert or not), with a CSV download in the hospital's own report layout.
// Can grow to tens of thousands of rows, so it is filtered and paged on the database side
// (25 per page) and the CSV download uses the same filters as the screen.
import Link from "next/link";
import { Card, PageHead, PagerBar } from "@/components/ui/card";
import { FilterGroup } from "@/components/ui/filter-panel";
import { CompactSearch } from "@/components/ui/compact-search";
import { DateRange } from "@/components/date-range";
import { rangeWords } from "@/lib/date-range";
import { DownloadIcon } from "@/components/ui/icons";
import { Topbar } from "@/components/topbar";
import { audit } from "@/lib/audit";
import { hasFilters, queryFor, readFilters, whereFor } from "@/lib/case-filters";
import { db } from "@/lib/db";
import { ageFromThaiDob, thaiDateTime } from "@/lib/format";
import { PER_PAGE_CHOICES, num, pageInfo } from "@/lib/paging";
import { PerPage } from "@/components/ui/per-page";
import { withBack } from "@/lib/back-link";
import { requireHospital } from "@/lib/session";

import { PageAids } from "@/components/ui/page-aids";
export default async function AllCasesPage({ searchParams }: PageProps<"/hospital/cases">) {
  const user = await requireHospital();
  const sp = await searchParams;
  const f = readFilters(sp);
  const where = whereFor(f, "createdAt");

  const total = await db.screening.count({ where });
  const per = PER_PAGE_CHOICES.includes(Number(sp.per)) ? Number(sp.per) : 20;
  const pg = pageInfo(total, sp.page, per);
  const perQ: Record<string, number> = per === 20 ? {} : { per };
  const here = `/hospital/cases${queryFor(f, { ...perQ, ...(pg.page > 1 ? { page: pg.page } : {}) })}`;
  const cases = await db.screening.findMany({ where, include: { patient: true }, orderBy: { createdAt: "desc" }, skip: pg.skip, take: pg.take });

  // How many times each patient on this page has been screened (shown next to the name).
  const counts = new Map(
    (await db.screening.groupBy({ by: ["patientId"], where: { patientId: { in: cases.map((c) => c.patientId) } }, _count: { _all: true } }))
      .map((g) => [g.patientId, g._count._all]),
  );
  // Summary numbers for the whole selection, counted in the database (not from one page).
  const alerts = await db.screening.count({ where: { AND: [where, { isAlert: true }] } });
  const facilities = (await db.facility.findMany({ select: { name: true }, orderBy: { name: "asc" } })).map((x) => x.name);
  const sending = (await db.screening.findMany({ where, distinct: ["facility"], select: { facility: true } })).length;
  // Doctors and nurses look but do not take data out (17 Nov 2026); only the admin downloads.
  const canExport = user.role === "admin";
  await audit({ user, action: "hospital.cases.view", detail: `total=${total} page=${pg.page}` });

  const activeFilters = [f.fac, f.result !== "all"].filter(Boolean).length;
  // years (พ.ศ.) with any screening, newest first, for the date filter
  const oldest = await db.screening.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } });
  const thisYear = new Date().getFullYear() + 543;
  const firstYear = oldest ? Number(oldest.createdAt.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }).slice(0, 4)) + 543 : thisYear;
  const years = Array.from({ length: thisYear - firstYear + 1 }, (_, i) => thisYear - i);
  // the date filter keeps the other filters; the search keeps the dates
  const keep = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v));
  const resultLabel = (c: (typeof cases)[number]) =>
    c.alertKind === "dose" ? <span className="ui-badge hi">ใช้ยาเกินขนาด</span>
      : c.isAlert ? <span className="ui-badge warn">เสี่ยงทั่วไป</span>
      : <span className="ui-badge ok">ไม่แจ้งเตือน</span>;

  return (
    <>
      <Topbar menu="cases" crumb="ข้อมูลทุกเคส" />
      <main className="ui-page">
        <PageHead sticky title="ข้อมูลทุกเคส" subtitle="ผลคัดกรองทุกเคสจาก รพ.สต. ในเครือข่าย เก็บไว้ให้ รพ. วิเคราะห์" />

        <section className="ui-card dr-card" aria-label="ช่วงเวลาที่คัดกรอง">
          <DateRange key={`${f.from}|${f.to}`} action="/hospital/cases" years={years} title="ช่วงเวลาที่คัดกรอง" current={rangeWords(f)}
            hidden={keep({ q: f.q, fac: f.fac, result: f.result === "all" ? "" : f.result, per: per === 20 ? "" : String(per) })}
            from={f.from} to={f.to} clearHref={`/hospital/cases${queryFor({ ...f, from: "", to: "", period: "all" }, perQ)}`} />
        </section>

        <Card
          title="รายการคัดกรอง"
          count={<>{num(total)} เคส <span className="cs-mini hi">แจ้งเตือน {num(alerts)}</span> <span className="cs-mini">จาก {num(sending)} หน่วยบริการ</span></>}
          actions={<>
            <CompactSearch action="/hospital/cases" name="q" value={f.q} placeholder="ชื่อหรือ HN" activeCount={activeFilters}
              hidden={keep({ from: f.from, to: f.to, per: per === 20 ? "" : String(per) })}
              clearHref={`/hospital/cases${queryFor({ ...f, q: "", fac: "", result: "all" }, perQ)}`}>
              <FilterGroup label="หน่วยบริการที่คัดกรอง">
                <select className="ui-select" name="fac" defaultValue={f.fac}>
                  <option value="">ทุกหน่วยบริการ</option>
                  {facilities.map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </FilterGroup>
              <FilterGroup label="ผลประเมิน">
                <select className="ui-select" name="result" defaultValue={f.result}>
                  <option value="all">ทุกผล</option>
                  <option value="alert">แจ้งเตือน</option>
                  <option value="noalert">ไม่แจ้งเตือน</option>
                </select>
              </FilterGroup>
            </CompactSearch>
            <PerPage value={per} unit="เคส" />
            {canExport && (
              // A plain link: the browser downloads the file the route handler returns, same filters as the screen.
              <a href={`/hospital/export${queryFor(f)}`} className="ui-export"><DownloadIcon />ส่งออก Excel (CSV)</a>
            )}
          </>}
          footer={<PagerBar pg={pg} href={(page) => `/hospital/cases${queryFor(f, { ...perQ, page })}`} unit="เคส" />}
        >
          <div className="ui-table-wrap sticky-head" key={here}>
            <table className="ui-table">
              <thead>
                <tr><th>วันที่คัดกรอง</th><th>ผู้ป่วย</th><th>อายุ</th><th className="num">eGFR</th><th className="num">ขนาดยา</th><th className="num">คะแนน</th><th>ผล</th><th>หน่วยบริการ</th><th /></tr>
              </thead>
              <tbody className="ui-fade-rows">
                {cases.map((c) => (
                  <tr key={c.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{thaiDateTime(c.createdAt)}</td>
                    <td>
                      <Link href={withBack(`/hospital/patients/${c.patientId}`, here)} className="name-link">{c.patient.name}</Link>
                      <span className="sub-line">HN {c.patient.hn ?? "ยังไม่มี"}{(counts.get(c.patientId) ?? 0) > 1 ? ` คัดกรอง ${counts.get(c.patientId)} ครั้ง` : ""}</span>
                    </td>
                    <td>{ageFromThaiDob(c.patient.dob)}</td>
                    <td className="num">{c.egfr}</td>
                    <td className="num">{c.doseMgDay}</td>
                    <td className="num">{c.riskScore}</td>
                    <td>{resultLabel(c)}</td>
                    <td>{c.facility}</td>
                    <td style={{ textAlign: "right" }}><Link href={withBack(`/hospital/cases/${c.id}`, here)} className="ui-btn secondary sm">ดูเคส</Link></td>
                  </tr>
                ))}
                {cases.length === 0 && (
                  <tr><td colSpan={9} className="ui-empty">{hasFilters(f) ? "ไม่พบเคสตามที่ค้นหา" : "ยังไม่มีการคัดกรอง"}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
        <p className="ui-subtitle">{canExport ? "ไฟล์ CSV ใช้คอลัมน์ตามชีต report ในเอกสารของ รพ. ทุกการดาวน์โหลดถูกบันทึกใน audit log" : "การดาวน์โหลดข้อมูลทำได้เฉพาะผู้ดูแลระบบของ รพ."}</p>
        <PageAids />
      </main>
    </>
  );
}
