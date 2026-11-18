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
import { tasksFor } from "@/lib/advice";
import { openCaseWhere } from "@/lib/open-cases";
import { BlockedButton, BlockedPopup } from "@/components/open-cases-notice";

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
  // Cases this unit saved but never closed (staff left before "ยืนยันปิดเคส"). While any is open,
  // new screenings and new patients are blocked (src/lib/open-cases.ts), so list them all here.
  const openCases = await db.screening.findMany({
    where: openCaseWhere(user.facility),
    include: { patient: { select: { name: true, hn: true } } },
    orderBy: { createdAt: "asc" },
    take: 50,
  });
  const blocked = openCases.length > 0;

  const href = (page: number) => {
    const u = new URLSearchParams({ ...(query ? { q: query } : {}), ...(per !== 20 ? { per: String(per) } : {}), ...(page > 1 ? { page: String(page) } : {}) });
    return u.toString() ? `/patients?${u}` : "/patients";
  };

  await audit({ user, action: "patient.list.view", detail: `rows=${patients.length}` });

  return (
    <>
      <Topbar menu="patients" step={0} crumb="ค้นหาผู้ป่วย" hideOpenNotice />
      {blocked && sp.blocked === "1" && <BlockedPopup count={openCases.length} />}
      <main className="ui-page">
        <PageHead
          sticky
          title="ค้นหาผู้ป่วย"
          subtitle={`เลือกผู้ป่วยเบาหวานที่รับยา Metformin เพื่อเริ่มคัดกรองความเสี่ยง MALA (${user.facility} วันที่ ${thaiDate(new Date())})`}
          actions={blocked
            ? <BlockedButton count={openCases.length} className="ui-btn primary"><PlusIcon />เพิ่มผู้ป่วยใหม่</BlockedButton>
            : <Link href="/patients/new" className="ui-btn primary"><PlusIcon />เพิ่มผู้ป่วยใหม่</Link>}
        />

        {/* A plain GET form: submitting it just changes the URL to /patients?q=… */}
        {blocked && (
          <section className="ui-card open-cases" id="open-cases" aria-labelledby="open-cases-title">
            <div className="oc-head">
              <div>
                <h2 id="open-cases-title">เคสที่ยังไม่ยืนยันปิดเคส <span className="ui-badge warn">{num(openCases.length)} เคส</span></h2>
                <p>กรุณายืนยันปิดเคสให้ครบก่อน จึงจะเริ่มคัดกรองหรือเพิ่มผู้ป่วยใหม่ได้ ผลคัดกรองบันทึกแล้ว และแจ้ง รพ. แล้วถ้าเข้าเกณฑ์</p>
              </div>
            </div>
            <div className="ui-table-wrap">
              <table className="ui-table oc-table">
                <thead><tr><th>ผู้ป่วย</th><th>คัดกรองเมื่อ</th><th>ผล</th><th>ขั้นตอนที่เหลือ</th><th /></tr></thead>
                <tbody>
                  {openCases.map((c) => {
                    const adviceLeft = tasksFor(c).needsAdvice && !c.adviceGivenAt;
                    return (
                      <tr key={c.id}>
                        <td><b>{c.patient.name}</b><span className="sub-line">HN {c.patient.hn ?? "ยังไม่มี"}</span></td>
                        <td style={{ whiteSpace: "nowrap" }}>{thaiDateTime(c.createdAt)}</td>
                        <td><span className={`ui-badge ${c.alertKind === "dose" ? "hi" : c.isAlert ? "warn" : "ok"}`}>{c.alertKind === "dose" ? "ใช้ยาเกินขนาด" : c.isAlert ? "กลุ่มเสี่ยง" : "ไม่เสี่ยง"}</span></td>
                        <td>{adviceLeft ? "แจ้งคำแนะนำผู้ป่วย แล้วยืนยันปิดเคส" : "ลงชื่อยืนยันปิดเคส"}</td>
                        <td style={{ textAlign: "right" }}><Link href={`/screenings/${c.id}/confirm`} className="ui-btn primary sm">ทำต่อ</Link></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

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
                        {last && <span className="sub-line">{thaiDateTime(last.createdAt)}</span>}
                        {last && !last.confirmedAt && <Link href={`/screenings/${last.id}/confirm`} className="ui-badge warn" style={{ marginTop: 4 }}>รอยืนยันปิดเคส</Link>}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {blocked
                          ? <BlockedButton count={openCases.length} className="ui-btn primary sm">เริ่มคัดกรอง</BlockedButton>
                          : <Link href={`/patients/${p.id}/screen`} className="ui-btn primary sm">เริ่มคัดกรอง</Link>}
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
