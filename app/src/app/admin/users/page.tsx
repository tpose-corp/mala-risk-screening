// /admin/users — every staff account. ?edit=<id> opens one account for editing.
import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { SegTabs } from "@/components/ui/seg-tabs";
import { PageHead } from "@/components/ui/card";
import { db } from "@/lib/db";
import { ROLE_LABEL, thaiDateTime } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { setUserActive } from "./actions";
import { ResetPasswordButton, UserForm } from "./user-forms";

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const role = typeof sp.role === "string" ? sp.role : "";
  const users = await db.user.findMany({ where: role ? { role } : {}, orderBy: [{ active: "desc" }, { role: "asc" }, { facility: "asc" }, { username: "asc" }] });
  const facilities = (await db.facility.findMany({ where: { active: true }, orderBy: { name: "asc" } })).map((f) => f.name);
  const editId = Number(sp.edit);
  const editing = users.find((u) => u.id === editId);

  return (
    <>
      <Topbar menu="users" crumb="บัญชีผู้ใช้" />
      <main className="ui-page">
        <PageHead sticky title="บัญชีผู้ใช้" subtitle="สร้างบัญชีได้ที่หน้านี้เท่านั้น ไม่มีการสมัครเอง บัญชีที่ไม่ใช้แล้วให้ปิดการใช้งาน ระบบไม่ลบบัญชี"
          actions={<SegTabs label="บทบาท" active={role} tabs={[["", "ทั้งหมด"], ["pcu", "รพ.สต."], ["clinician", "แพทย์ / พยาบาล"], ["admin", "ผู้ดูแลระบบ"]].map(([v, l]) => ({ key: v, label: l, href: v ? `/admin/users?role=${v}` : "/admin/users" }))} />} />

        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <UserForm key={editing.id} facilities={facilities} user={editing} />
            <div className="card pad" style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
              {editing.id === me.id ? (
                <Link href="/account/password" className="btn-s">เปลี่ยนรหัสผ่านของฉัน</Link>
              ) : (
                <ResetPasswordButton userId={editing.id} username={editing.username} />
              )}
              {editing.id !== me.id && (
                <form action={setUserActive.bind(null, editing.id, !editing.active)}>
                  <button className={`btn-s${editing.active ? "" : " primary"}`} type="submit">{editing.active ? "ปิดการใช้งานบัญชีนี้" : "เปิดการใช้งานอีกครั้ง"}</button>
                </form>
              )}
              <Link href="/admin/users" className="btn-s">ปิดหน้าแก้ไข</Link>
            </div>
          </div>
        ) : (
          <UserForm facilities={facilities} />
        )}

        <div className="card" style={{ overflowX: "auto" }}>
          <table className="grid">
            <thead><tr><th>ชื่อผู้ใช้</th><th>ชื่อ–นามสกุล</th><th>บทบาท</th><th>หน่วยบริการ</th><th>สถานะ</th><th>เข้าใช้ล่าสุด</th><th>สร้างเมื่อ</th><th /></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className={u.active ? "" : "off"}>
                  <td className="mono">{u.username}</td>
                  <td>{u.displayName}{u.position && <div className="note">{u.position}{u.licenseNo ? ` เลขใบประกอบ ${u.licenseNo}` : ""}</div>}</td>
                  <td>{ROLE_LABEL[u.role] ?? u.role}</td>
                  <td>{u.facility ?? "รพ.เชียงรายประชานุเคราะห์"}</td>
                  <td>
                    {!u.active ? <span className="pill warn">ปิดใช้งาน</span> : u.mustChangePassword ? <span className="pill warn">รอตั้งรหัสผ่าน</span> : <span className="pill ok">ใช้งานได้</span>}
                  </td>
                  <td className="time">{u.lastLoginAt ? thaiDateTime(u.lastLoginAt) : "ยังไม่เคย"}</td>
                  <td className="time">{thaiDateTime(u.createdAt)}</td>
                  <td style={{ textAlign: "right" }}><Link href={`/admin/users?edit=${u.id}${role ? `&role=${role}` : ""}`} className="btn-s">จัดการ</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
