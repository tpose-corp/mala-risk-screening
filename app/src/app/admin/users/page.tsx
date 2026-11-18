// /admin/users: every staff account. ?new=1 opens the new-account form, ?edit=<id> opens one account.
import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { SegTabs } from "@/components/ui/seg-tabs";
import { Card, PageHead } from "@/components/ui/card";
import { PlusIcon } from "@/components/ui/icons";
import { db } from "@/lib/db";
import { ROLE_LABEL, thaiDate, thaiDateTime } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { setUserActive } from "./actions";
import { ResetPasswordButton, UserForm } from "./user-forms";

// "14:05 น." (the date goes on its own line so the table stays narrow)
const timeOf = (d: Date) => thaiDateTime(d).slice(thaiDate(d).length).trim();
const MUTED = { color: "var(--muted)" } as const;

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const role = typeof sp.role === "string" ? sp.role : "";
  const users = await db.user.findMany({ where: role ? { role } : {}, orderBy: [{ active: "desc" }, { role: "asc" }, { facility: "asc" }, { username: "asc" }] });
  const facilities = (await db.facility.findMany({ where: { active: true }, orderBy: { name: "asc" } })).map((f) => f.name);
  const editId = Number(sp.edit);
  const editing = users.find((u) => u.id === editId);
  const creating = !editing && sp.new === "1";
  const listHref = role ? `/admin/users?role=${role}` : "/admin/users";

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
              <Link href={listHref} className="btn-s">ปิดหน้าแก้ไข</Link>
            </div>
          </div>
        ) : creating ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <UserForm facilities={facilities} />
            <div><Link href={listHref} className="btn-s">ยกเลิก</Link></div>
          </div>
        ) : null}

        <Card title="บัญชีทั้งหมด" count={`${users.length} บัญชี`}
          actions={!creating && !editing && <Link href={`/admin/users?new=1${role ? `&role=${role}` : ""}`} className="ui-btn primary sm"><PlusIcon /> สร้างบัญชีใหม่</Link>}>
          <div className="ui-table-wrap sticky-head">
            <table className="ui-table">
              <thead><tr><th>ชื่อผู้ใช้</th><th>ชื่อ–นามสกุล</th><th>บทบาท</th><th>หน่วยบริการ</th><th>สถานะ</th><th>เข้าใช้ล่าสุด</th><th>สร้างเมื่อ</th><th /></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className={u.active ? "" : "off"}>
                    <td className="mono">{u.username}</td>
                    <td style={{ whiteSpace: "nowrap" }}><b>{u.displayName}</b>{u.position && <span className="sub-line">{u.position}{u.licenseNo ? ` เลขใบประกอบ ${u.licenseNo}` : ""}</span>}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{ROLE_LABEL[u.role] ?? u.role}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{u.facility ?? <span style={MUTED}>โรงพยาบาล</span>}</td>
                    <td>
                      {!u.active ? <span className="ui-badge muted">ปิดใช้งาน</span> : u.mustChangePassword ? <span className="ui-badge warn">รอตั้งรหัสผ่าน</span> : <span className="ui-badge ok">ใช้งานได้</span>}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>{u.lastLoginAt ? <>{thaiDate(u.lastLoginAt)}<span className="sub-line">{timeOf(u.lastLoginAt)}</span></> : <span style={MUTED}>ยังไม่เคย</span>}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{thaiDate(u.createdAt)}<span className="sub-line">{timeOf(u.createdAt)}</span></td>
                    <td style={{ textAlign: "right" }}><Link href={`/admin/users?edit=${u.id}${role ? `&role=${role}` : ""}`} className="ui-btn secondary sm">จัดการ</Link></td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan={8} className="ui-empty">ไม่มีบัญชีในกลุ่มนี้</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </>
  );
}
