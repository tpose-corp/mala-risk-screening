// /patients — list of patients at this facility, with a simple name/HN filter.
// Server Component: it reads the database directly, no API needed.
import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { ageFromThaiDob, thaiDate } from "@/lib/format";
import { requireFacilityStaff } from "@/lib/session";

export default async function PatientsPage({ searchParams }: PageProps<"/patients">) {
  const user = await requireFacilityStaff();
  const { q } = await searchParams; // Next.js 16: searchParams is a Promise → await it
  const query = typeof q === "string" ? q.trim() : "";

  const patients = await db.patient.findMany({
    where: {
      facility: user.facility,
      ...(query ? { OR: [{ name: { contains: query } }, { hn: { contains: query } }] } : {}),
    },
    include: { screenings: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });

  await audit({ user, action: "patient.list.view", detail: `rows=${patients.length}` });

  return (
    <>
      <Topbar menu="patients" step={0} crumb="ค้นหาผู้ป่วย" />
      <main className="page">
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 className="h1">ค้นหาผู้ป่วย</h1>
            <div className="sub">เลือกผู้ป่วยเบาหวานที่รับยา Metformin เพื่อเริ่มคัดกรองความเสี่ยง MALA</div>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>{user.facility} วันที่ {thaiDate(new Date())}</div>
        </div>

        {/* A plain GET form: submitting it just changes the URL to /patients?q=… */}
        <form style={{ display: "flex", gap: 10 }}>
          <input className="fld" name="q" defaultValue={query} placeholder="ค้นหาด้วย HN หรือชื่อ–สกุล…" style={{ flex: 1 }} aria-label="ค้นหา" />
          <Link href="/patients/new" className="btn-s primary">+ เพิ่มผู้ป่วยใหม่</Link>
        </form>

        <div className="card" style={{ overflowX: "auto" }}>
          <table className="plist">
            <thead>
              <tr>
                <th>HN</th>
                <th>ชื่อ–สกุล</th>
                <th>อายุ</th>
                <th>หน่วยบริการ</th>
                <th>สถานะคัดกรองล่าสุด</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => {
                const last = p.screenings[0];
                return (
                  <tr key={p.id}>
                    <td className="mono" style={{ color: "var(--muted)" }}>{p.hn ?? "ยังไม่มี"}</td>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>{ageFromThaiDob(p.dob) ?? ""}</td>
                    <td style={{ color: "var(--ink-2)" }}>{p.facility}</td>
                    <td>
                      {!last ? (
                        <span className="pill warn">ยังไม่คัดกรอง</span>
                      ) : last.isAlert ? (
                        <Link href={`/screenings/${last.id}`} className="pill hi">เสี่ยง (ส่งต่อ รพ. แล้ว)</Link>
                      ) : (
                        <Link href={`/screenings/${last.id}`} className="pill ok">ไม่เสี่ยง</Link>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Link href={`/patients/${p.id}/screen`} className="btn-s primary">เริ่มคัดกรอง</Link>
                    </td>
                  </tr>
                );
              })}
              {patients.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>
                    ไม่พบผู้ป่วยที่ค้นหา
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="note">แสดงเฉพาะฟิลด์ที่จำเป็นต่อการคัดกรอง</div>
      </main>
    </>
  );
}
