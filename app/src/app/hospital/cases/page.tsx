// /hospital/cases — every screening from every รพ.สต. (MVP core 2: the hospital keeps all cases
// for analysis, alert or not), with a CSV download in the hospital's own report layout.
// Can grow to tens of thousands of rows, so it is filtered and paged on the database side
// (25 per page) and the CSV download uses the same filters as the screen.
import Link from "next/link";
import { Card, PageHead, PagerBar } from "@/components/ui/card";
import { FilterGroup, FilterPanel } from "@/components/ui/filter-panel";
import { DownloadIcon } from "@/components/ui/icons";
import { Topbar } from "@/components/topbar";
import { audit } from "@/lib/audit";
import { hasFilters, queryFor, readFilters, whereFor } from "@/lib/case-filters";
import { db } from "@/lib/db";
import { ageFromThaiDob, thaiDateTime } from "@/lib/format";
import { PER_PAGE_CHOICES, PERIODS, num, pageInfo } from "@/lib/paging";
import { PerPage } from "@/components/ui/per-page";
import { withBack } from "@/lib/back-link";
import { requireHospital } from "@/lib/session";

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

  const activeFilters = [f.fac, f.period !== "all", f.result !== "all"].filter(Boolean).length;
  const resultLabel = (c: (typeof cases)[number]) =>
    c.alertKind === "dose" ? <span className="ui-badge hi">ใช้ยาเกินขนาด</span>
      : c.isAlert ? <span className="ui-badge warn">เสี่ยงทั่วไป</span>
      : <span className="ui-badge ok">ไม่แจ้งเตือน</span>;

  return (
    <>
      <Topbar menu="cases" crumb="ข้อมูลทุกเคส" />
      <main className="ui-page">
        <PageHead sticky title="ข้อมูลทุกเคส" subtitle="ผลคัดกรองทุกเคสจาก รพ.สต. ในเครือข่าย เก็บไว้ให้ รพ. วิเคราะห์" />

        <div className="ui-stats">
          <div className="ui-stat"><div className="label">{hasFilters(f) ? "คัดกรองตามตัวกรอง" : "คัดกรองทั้งหมด"}</div><div className="value">{num(total)}</div></div>
          <div className="ui-stat hi"><div className="label">แจ้งเตือน</div><div className="value">{num(alerts)}</div></div>
          <div className="ui-stat"><div className="label">รพ.สต. ที่ส่งข้อมูล</div><div className="value">{num(sending)}</div></div>
        </div>

        <FilterPanel action="/hospital/cases" hidden={per === 20 ? {} : { per: String(per) }} search={{ name: "q", value: f.q, placeholder: "ค้นหาชื่อหรือ HN" }} activeCount={activeFilters} clearHref="/hospital/cases">
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
          <FilterGroup label="ช่วงเวลาที่คัดกรอง">
            <select className="ui-select" name="period" defaultValue={f.period}>
              {PERIODS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
            </select>
          </FilterGroup>
        </FilterPanel>

        <Card
          title="รายการคัดกรอง"
          count={`${num(total)} เคส`}
          actions={<>
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
      </main>
    </>
  );
}
