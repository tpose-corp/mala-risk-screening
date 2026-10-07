// /hospital/cases — every screening from every รพ.สต. (MVP core 2: the hospital keeps all cases
// for analysis, alert or not), with a CSV download in the hospital's own report layout.
// Can grow to tens of thousands of rows, so it is filtered and paged on the database side
// (25 per page) and the CSV download uses the same filters as the screen.
import Link from "next/link";
import { ListFilters, Pager } from "@/components/list-controls";
import { Topbar } from "@/components/topbar";
import { audit } from "@/lib/audit";
import { hasFilters, queryFor, readFilters, whereFor } from "@/lib/case-filters";
import { db } from "@/lib/db";
import { ageFromThaiDob, thaiDateTime } from "@/lib/format";
import { num, pageInfo } from "@/lib/paging";
import { requireHospital } from "@/lib/session";

export default async function AllCasesPage({ searchParams }: PageProps<"/hospital/cases">) {
  const user = await requireHospital();
  const sp = await searchParams;
  const f = readFilters(sp);
  const where = whereFor(f, "createdAt");

  const total = await db.screening.count({ where });
  const pg = pageInfo(total, sp.page);
  const cases = await db.screening.findMany({ where, include: { patient: true }, orderBy: { createdAt: "desc" }, skip: pg.skip, take: pg.take });

  // How many times each patient on this page has been screened (shown next to the name).
  const counts = new Map(
    (await db.screening.groupBy({ by: ["patientId"], where: { patientId: { in: cases.map((c) => c.patientId) } }, _count: { _all: true } }))
      .map((g) => [g.patientId, g._count._all]),
  );
  // Summary numbers for the whole selection, counted in the database (not from one page).
  const alerts = await db.screening.count({ where: { AND: [where, { isAlert: true }] } });
  const facilityRows = await db.patient.findMany({ distinct: ["facility"], select: { facility: true }, orderBy: { facility: "asc" } });
  const facilities = facilityRows.map((x) => x.facility);
  const sending = (await db.screening.findMany({ where, distinct: ["patientId"], select: { patient: { select: { facility: true } } } }))
    .reduce((set, s) => set.add(s.patient.facility), new Set<string>()).size;
  await audit({ user, action: "hospital.cases.view", detail: `total=${total} page=${pg.page}` });

  return (
    <>
      <Topbar menu="cases" crumb="ข้อมูลทุกเคส" />
      <main className="page">
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 className="h1">ข้อมูลทุกเคส</h1>
            <div className="sub">ผลคัดกรองทุกเคสจาก รพ.สต. ในเครือข่าย เก็บไว้ให้ รพ. วิเคราะห์</div>
          </div>
          {/* A plain link: the browser downloads the file the route handler returns, same filters as the screen. */}
          <a href={`/hospital/export${queryFor(f)}`} className="btn-s primary">
            ดาวน์โหลด Excel (CSV){hasFilters(f) ? ` ${num(total)} เคสที่กรอง` : ""}
          </a>
        </div>

        <div className="stats">
          <div className="card pad"><span>{hasFilters(f) ? "คัดกรองตามตัวกรอง" : "คัดกรองทั้งหมด"}</span><b>{num(total)}</b></div>
          <div className="card pad"><span>แจ้งเตือน</span><b style={{ color: "var(--hi)" }}>{num(alerts)}</b></div>
          <div className="card pad"><span>รพ.สต. ที่ส่งข้อมูล</span><b>{num(sending)}</b></div>
        </div>

        <ListFilters action="/hospital/cases" f={f} facilities={facilities} periodLabel="ช่วงเวลาที่คัดกรอง" withResult clearHref="/hospital/cases" />

        <div className="card" style={{ overflowX: "auto" }}>
          <table className="plist">
            <thead>
              <tr><th>วันที่คัดกรอง</th><th>HN</th><th>ชื่อ–สกุล</th><th>อายุ</th><th>eGFR</th><th>ขนาดยา</th><th>คะแนน</th><th>ผล</th><th>หน่วยบริการ</th><th /></tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{thaiDateTime(c.createdAt)}</td>
                  <td className="mono" style={{ color: "var(--muted)" }}>{c.patient.hn ?? "ยังไม่มี"}</td>
                  <td>
                    <Link href={`/hospital/patients/${c.patientId}`} className="name-link">{c.patient.name}</Link>
                    {(counts.get(c.patientId) ?? 0) > 1 && <div className="note">คัดกรอง {counts.get(c.patientId)} ครั้ง</div>}
                  </td>
                  <td>{ageFromThaiDob(c.patient.dob)}</td>
                  <td>{c.egfr}</td>
                  <td>{c.doseMgDay}</td>
                  <td>{c.riskScore}</td>
                  <td><span className={`pill ${c.isAlert ? "hi" : "ok"}`}>{c.isAlert ? "แจ้งเตือน" : "ไม่แจ้งเตือน"}</span></td>
                  <td style={{ color: "var(--ink-2)" }}>{c.patient.facility}</td>
                  <td style={{ textAlign: "right" }}><Link href={`/hospital/cases/${c.id}`} className="btn-s">ดูเคส</Link></td>
                </tr>
              ))}
              {cases.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", color: "var(--muted)", padding: 28 }}>
                    {hasFilters(f) ? "ไม่พบเคสตามที่ค้นหา" : "ยังไม่มีการคัดกรอง"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pager pg={pg} href={(page) => `/hospital/cases${queryFor(f, { page })}`} />
        <div className="note">ไฟล์ CSV ใช้คอลัมน์ตามชีต report ในเอกสารของ รพ. ทุกการดาวน์โหลดถูกบันทึกใน audit log</div>
      </main>
    </>
  );
}
