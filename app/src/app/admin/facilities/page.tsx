// /admin/facilities — the รพ.สต. / ศสม. list, laid out like the users page. Units are never
// deleted: a unit that stops (or was added by mistake) is closed, and the admin chooses where its
// patients and staff accounts go. A wrong name is fixed with "แก้ไข" and every record follows.
// The list and its popups are facilities-manager.tsx; the rules are in actions.ts.
import { Topbar } from "@/components/topbar";
import { PageHead } from "@/components/ui/card";
import { SegTabs } from "@/components/ui/seg-tabs";
import { db } from "@/lib/db";
import { thaiDateTime } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { FacilitiesManager, type FacilityRow } from "./facilities-manager";

export default async function FacilitiesPage({ searchParams }: PageProps<"/admin/facilities">) {
  await requireAdmin();
  const sp = await searchParams;
  const show = sp.show === "active" || sp.show === "closed" ? sp.show : "";
  const all = await db.facility.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }], include: { _count: { select: { screenings: true } } } });
  const count = async (by: "users" | "patients" | "open") => {
    const g = by === "users"
      ? await db.user.groupBy({ by: ["facility"], where: { active: true, facility: { not: null } }, _count: { _all: true } })
      : by === "patients"
        ? await db.patient.groupBy({ by: ["facility"], where: { active: true, facility: { not: null } }, _count: { _all: true } })
        : await db.screening.groupBy({ by: ["facility"], where: { confirmedAt: null, patient: { active: true } }, _count: { _all: true } });
    return new Map(g.map((r) => [r.facility as string, r._count._all]));
  };
  const [users, patients, open] = await Promise.all([count("users"), count("patients"), count("open")]);

  const rows: FacilityRow[] = all
    .filter((f) => (show === "active" ? f.active : show === "closed" ? !f.active : true))
    .map((f) => ({
      id: f.id, name: f.name, code: f.code, active: f.active, updated: thaiDateTime(f.updatedAt),
      users: users.get(f.name) ?? 0, patients: patients.get(f.name) ?? 0, open: open.get(f.name) ?? 0, screenings: f._count.screenings,
    }));
  const activeUnits = all.filter((f) => f.active).map((f) => ({ id: f.id, name: f.name }));
  const nActive = activeUnits.length;

  return (
    <>
      <Topbar menu="facilities" crumb="หน่วยบริการ" />
      <main className="ui-page">
        <PageHead sticky title="หน่วยบริการ" subtitle="รพ.สต. และ ศสม. ที่ใช้ระบบ ระบบไม่ลบหน่วยบริการ หน่วยที่เลิกใช้ให้ปิด แล้วเลือกว่าจะย้ายผู้ป่วยและบัญชีไปหน่วยไหน"
          actions={<SegTabs label="สถานะ" active={show} tabs={[
            { key: "", label: `ทั้งหมด ${all.length}`, href: "/admin/facilities" },
            { key: "active", label: `เปิดใช้งาน ${nActive}`, href: "/admin/facilities?show=active" },
            { key: "closed", label: `ปิดแล้ว ${all.length - nActive}`, href: "/admin/facilities?show=closed" },
          ]} />} />
        <FacilitiesManager rows={rows} activeUnits={activeUnits} />
      </main>
    </>
  );
}
