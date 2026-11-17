// /patients — list of patients at this facility, with a simple name/HN filter.
// Server Component: it reads the database directly, no API needed.
import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { Card, PageHead, PagerBar } from "@/components/ui/card";
import { PerPage } from "@/components/ui/per-page";
import type { Prisma } from "@/generated/prisma/client";
import { PER_PAGE_CHOICES, num, pageInfo } from "@/lib/paging";
import { FilterPanel } from "@/components/ui/filter-panel";
import { PlusIcon } from "@/components/ui/icons";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { ageFromThaiDob, thaiDate, thaiDateTime } from "@/lib/format";
import { requireFacilityStaff } from "@/lib/session";

export default async function PatientsPage({ searchParams }: PageProps<"/patients">) {
  const user = await requireFacilityStaff();
  const { q } = await searchParams; // Next.js 16: searchParams is a Promise → await it
  const query = typeof q === "string" ? q.trim() : "";

  const sp = await searchParams;
  const per = PER_PAGE_CHOICES.includes(Number(sp.per)) ? Number(sp.per) : 20;
  const where: Prisma.PatientWhereInput = {
    facility: user.facility,
    active: true,
    ...(query ? { OR: [{ name: { contains: query, mode: "insensitive" } }, { hn: { contains: query } }, { cardId: { endsWith: query.replace(/\D/g, "") || "x" } }] } : {}),
  };
  const total = await db.patient.count({ where });
  const pg = pageInfo(total, sp.page, per);
  const patients = await db.patient.findMany({
    where,
    include: { screenings: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
    skip: pg.skip,
    take: pg.take,
  });
  const href = (page: number) => {
    const u = new URLSearchParams({ ...(query ? { q: query } : {}), ...(per !== 20 ? { per: String(per) } : {}), ...(page > 1 ? { page: String(page) } : {}) });
    return u.toString() ? `/patients?${u}` : "/patients";
  };

  await audit({ user, action: "patient.list.view", detail: `rows=${patients.length}` });

  return (
    <>
      <Topbar menu="patients" step={0} crumb="ค้นหาผู้ป่วย" />
      <main className="ui-page">
        <PageHead
          sticky
          title="ค้นหาผู้ป่วย"
          subtitle={`เลือกผู้ป่วยเบาหวานที่รับยา Metformin เพื่อเริ่มคัดกรองความเสี่ยง MALA (${user.facility} วันที่ ${thaiDate(new Date())})`}
          actions={<Link href="/patients/new" className="ui-btn primary"><PlusIcon />เพิ่มผู้ป่วยใหม่</Link>}
        />

        {/* A plain GET form: submitting it just changes the URL to /patients?q=… */}
        <FilterPanel action="/patients" hidden={per !== 20 ? { per: String(per) } : {}} search={{ name: "q", value: query, placeholder: "ค้นหาด้วยชื่อ–สกุล, HN หรือเลขบัตร 4 หลักท้าย" }} activeCount={0} clearHref="/patients" />

        <Card title="ผู้ป่วยในหน่วยบริการ" count={`${num(total)} คน`} actions={<PerPage value={per} unit="คน" />} footer={<PagerBar pg={pg} href={href} unit="คน" />}>
          <div className="ui-table-wrap sticky-head" key={href(pg.page)}>
            <table className="ui-table">
              <thead>
                <tr><th>ผู้ป่วย</th><th>อายุ</th><th>หน่วยบริการ</th><th>สถานะคัดกรองล่าสุด</th><th /></tr>
              </thead>
              <tbody className="ui-fade-rows">
                {patients.map((p) => {
                  const last = p.screenings[0];
                  return (
                    <tr key={p.id}>
                      <td>
                        <b>{p.name}</b>
                        <span className="sub-line">HN {p.hn ?? "ยังไม่มี"} {p.status === "pending" && <span className="ui-badge warn">รอยืนยันตัวตน</span>}</span>
                      </td>
                      <td>{ageFromThaiDob(p.dob) ?? ""}</td>
                      <td>{p.facility}</td>
                      <td>
                        {!last ? (
                          <span className="ui-badge muted">ยังไม่คัดกรอง</span>
                        ) : (
                          <Link href={`/screenings/${last.id}`} className={`ui-badge ${last.alertKind === "dose" ? "hi" : last.isAlert ? "warn" : "ok"}`}>
                            {last.alertKind === "dose" ? "ใช้ยาเกินขนาด" : last.isAlert ? "เสี่ยง (ส่งต่อ รพ. แล้ว)" : "ไม่เสี่ยง"}
                          </Link>
                        )}
                        {last && <span className="sub-line">{thaiDateTime(last.createdAt)}{!last.confirmedAt && " ยังไม่ยืนยัน"}</span>}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Link href={`/patients/${p.id}/screen`} className="ui-btn primary sm">เริ่มคัดกรอง</Link>
                      </td>
                    </tr>
                  );
                })}
                {patients.length === 0 && <tr><td colSpan={5} className="ui-empty">{query ? "ไม่พบผู้ป่วยที่ค้นหา" : "ยังไม่มีผู้ป่วยในหน่วยบริการนี้"}</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
        <p className="ui-hint">แสดงเฉพาะข้อมูลที่จำเป็นต่อการคัดกรอง</p>
      </main>
    </>
  );
}
