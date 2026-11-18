// /admin/users: every staff account. Search (name, username, position, unit, phone) and a status
// filter live in the URL; creating and managing an account happen in popups (user-forms.tsx), and
// every change is reviewed before it is saved (actions.ts).
import { Topbar } from "@/components/topbar";
import { PageHead } from "@/components/ui/card";
import { CompactSearch } from "@/components/ui/compact-search";
import { FilterGroup } from "@/components/ui/filter-panel";
import { SegTabs } from "@/components/ui/seg-tabs";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { thaiDate, thaiDateTime } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { UsersManager, type UserRow } from "./user-forms";

// "14:05 น." (the date goes on its own line so the table stays narrow)
const timeOf = (d: Date) => thaiDateTime(d).slice(thaiDate(d).length).trim();
const STATUS: Record<string, { label: string; where: Prisma.UserWhereInput }> = {
  ok: { label: "ใช้งานได้", where: { active: true, mustChangePassword: false } },
  pending: { label: "รอตั้งรหัสผ่าน", where: { active: true, mustChangePassword: true } },
  off: { label: "ปิดใช้งาน", where: { active: false } },
};

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const role = typeof sp.role === "string" && ["pcu", "clinician", "admin"].includes(sp.role) ? sp.role : "";
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  const st = typeof sp.st === "string" && sp.st in STATUS ? sp.st : "";
  const contains = { contains: q, mode: "insensitive" as const };
  const where: Prisma.UserWhereInput = {
    ...(role ? { role } : {}),
    ...(st ? STATUS[st].where : {}),
    ...(q ? { OR: [{ username: contains }, { displayName: contains }, { position: contains }, { facility: contains }, { phone: contains }, { licenseNo: contains }] } : {}),
  };
  const users = await db.user.findMany({ where, orderBy: [{ active: "desc" }, { role: "asc" }, { facility: "asc" }, { username: "asc" }] });
  const facilities = (await db.facility.findMany({ where: { active: true }, orderBy: { name: "asc" } })).map((f) => f.name);

  const rows: UserRow[] = users.map((u) => ({
    id: u.id, username: u.username, displayName: u.displayName, role: u.role, facility: u.facility ?? "",
    position: u.position ?? "", licenseNo: u.licenseNo ?? "", phone: u.phone ?? "",
    active: u.active, mustChangePassword: u.mustChangePassword,
    lastLogin: u.lastLoginAt ? { date: thaiDate(u.lastLoginAt), time: timeOf(u.lastLoginAt) } : null,
    created: { date: thaiDate(u.createdAt), time: timeOf(u.createdAt) },
  }));
  const keep = (extra: Record<string, string>) => {
    const u = new URLSearchParams({ ...(role ? { role } : {}), ...extra });
    return u.toString() ? `/admin/users?${u}` : "/admin/users";
  };

  return (
    <>
      <Topbar menu="users" crumb="บัญชีผู้ใช้" />
      <main className="ui-page">
        <PageHead sticky title="บัญชีผู้ใช้" subtitle="สร้างบัญชีได้ที่หน้านี้เท่านั้น ไม่มีการสมัครเอง บัญชีที่ไม่ใช้แล้วให้ปิดการใช้งาน ระบบไม่ลบบัญชี"
          actions={<SegTabs label="บทบาท" active={role} tabs={[["", "ทั้งหมด"], ["pcu", "รพ.สต."], ["clinician", "แพทย์ / พยาบาล"], ["admin", "ผู้ดูแลระบบ"]].map(([v, l]) => ({
            key: v, label: l, href: (() => { const u = new URLSearchParams({ ...(v ? { role: v } : {}), ...(q ? { q } : {}), ...(st ? { st } : {}) }); return u.toString() ? `/admin/users?${u}` : "/admin/users"; })(),
          }))} />} />

        <UsersManager rows={rows} facilities={facilities} meId={me.id}
          count={`${users.length} บัญชี${q ? ` ที่พบ "${q}"` : ""}${st ? ` ${STATUS[st].label}` : ""}`}
          search={
            <CompactSearch action="/admin/users" hidden={role ? { role } : {}} name="q" value={q}
              placeholder="ชื่อ ชื่อผู้ใช้ ตำแหน่ง หน่วยบริการ หรือเบอร์โทร" activeCount={st ? 1 : 0} clearHref={keep({})}>
              <FilterGroup label="สถานะบัญชี">
                <select className="ui-select" name="st" defaultValue={st}>
                  <option value="">ทุกสถานะ</option>
                  {Object.entries(STATUS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
                </select>
              </FilterGroup>
            </CompactSearch>
          } />
      </main>
    </>
  );
}
