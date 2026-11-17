// /admin/facilities — the รพ.สต. / ศสม. list. Renaming a unit updates every account, patient and
// screening that points at it. A unit that stops is closed, never deleted.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Topbar } from "@/components/topbar";
import { PageHead } from "@/components/ui/card";
import { asActor } from "@/lib/actor";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { thaiDateTime } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

async function saveFacility(id: number | null, fd: FormData) {
  "use server";
  const admin = await requireAdmin();
  const name = String(fd.get("name") ?? "").trim();
  const code = String(fd.get("code") ?? "").trim() || null;
  if (name.length < 3) redirect("/admin/facilities?err=name");
  const clash = await db.facility.findFirst({ where: { OR: [{ name }, ...(code ? [{ code }] : [])], ...(id ? { NOT: { id } } : {}) } });
  if (clash) redirect("/admin/facilities?err=dup");
  const f = await asActor(admin.id, (tx) =>
    id ? tx.facility.update({ where: { id }, data: { name, code } }) : tx.facility.create({ data: { name, code } }),
  );
  await audit({ user: admin, action: id ? "admin.facility.update" : "admin.facility.create", entity: "Facility", entityId: f.id });
  revalidatePath("/admin/facilities");
  redirect("/admin/facilities?ok=1");
}

async function toggleFacility(id: number, active: boolean) {
  "use server";
  const admin = await requireAdmin();
  await asActor(admin.id, (tx) => tx.facility.update({ where: { id }, data: { active } }));
  await audit({ user: admin, action: "admin.facility.update", entity: "Facility", entityId: id, detail: `changed=active` });
  revalidatePath("/admin/facilities");
}

const ERR: Record<string, string> = { name: "ชื่อหน่วยบริการสั้นเกินไป", dup: "ชื่อหรือรหัสหน่วยบริการนี้มีอยู่แล้ว" };

export default async function FacilitiesPage({ searchParams }: PageProps<"/admin/facilities">) {
  await requireAdmin();
  const sp = await searchParams;
  const list = await db.facility.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }], include: { _count: { select: { users: true, patients: true } } } });
  return (
    <>
      <Topbar menu="facilities" crumb="หน่วยบริการ" />
      <main className="ui-page">
        <PageHead sticky title="หน่วยบริการ" subtitle={<>รพ.สต. และ ศสม. ที่ใช้ระบบ หน่วยที่ปิดจะไม่แสดงในรายการให้เลือก แต่ข้อมูลเดิมยังอยู่ครบ</>} />
        {sp.ok && <div className="flash">บันทึกแล้ว</div>}
        {typeof sp.err === "string" && <div className="flash bad">{ERR[sp.err]}</div>}
        <form action={saveFacility.bind(null, null)} className="card pad" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 2, minWidth: 200 }}><label className="lbl" htmlFor="name">ชื่อหน่วยบริการ *</label><input className="fld" id="name" name="name" required placeholder="เช่น รพ.สต.บ้านใหม่" /></div>
          <div style={{ flex: 1, minWidth: 120 }}><label className="lbl" htmlFor="code">รหัสหน่วยบริการ</label><input className="fld mono" id="code" name="code" placeholder="5 หลัก" /></div>
          <button className="btn-s primary" type="submit">+ เพิ่มหน่วยบริการ</button>
        </form>
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="grid">
            <thead><tr><th>ชื่อและรหัส (แก้ไขได้)</th><th>บัญชี</th><th>ผู้ป่วยประจำ</th><th>แก้ไขล่าสุด</th><th>สถานะ</th></tr></thead>
            <tbody>
              {list.map((f) => (
                <tr key={f.id} className={f.active ? "" : "off"}>
                  <td>
                    <form action={saveFacility.bind(null, f.id)} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <input className="fld" name="name" defaultValue={f.name} style={{ flex: 2, minWidth: 160 }} aria-label="ชื่อหน่วยบริการ" />
                      <input className="fld mono" name="code" defaultValue={f.code ?? ""} style={{ width: 90 }} aria-label="รหัส" />
                      <button className="btn-s" type="submit">บันทึก</button>
                    </form>
                  </td>
                  <td>{f._count.users}</td>
                  <td>{f._count.patients}</td>
                  <td className="time">{thaiDateTime(f.updatedAt)}</td>
                  <td>
                    <form action={toggleFacility.bind(null, f.id, !f.active)}>
                      <button className="btn-s" type="submit">{f.active ? "ปิดหน่วยนี้" : "เปิดอีกครั้ง"}</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
