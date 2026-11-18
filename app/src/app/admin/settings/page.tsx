// /admin/settings — switches the hospital can flip itself instead of asking a developer
// (17 Nov 2026): turn the system on/off per role, the message shown while it is off, and who to
// call when a confirmed record needs fixing. Every change is logged (admin.settings.update).
// The form (unsaved-changes guard, undo, review popup) is settings-form.tsx; saving is actions.ts.
import { Topbar } from "@/components/topbar";
import { PageHead } from "@/components/ui/card";
import { db } from "@/lib/db";
import { thaiDateTime } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { DEFAULT_SETTINGS, getSettings } from "@/lib/settings";
import { SettingsForm } from "./settings-form";

import { PageAids } from "@/components/ui/page-aids";
export default async function SettingsPage({ searchParams }: PageProps<"/admin/settings">) {
  await requireAdmin();
  const sp = await searchParams;
  const s = await getSettings();
  const last = await db.setting.findFirst({ orderBy: { updatedAt: "desc" } });
  const lastBy = last?.updatedById ? (await db.user.findUnique({ where: { id: last.updatedById }, select: { displayName: true } }))?.displayName : null;
  const counts = await db.user.groupBy({ by: ["role"], where: { active: true }, _count: { _all: true } });
  const count = (r: string) => counts.find((c) => c.role === r)?._count._all ?? 0;

  return (
    <>
      <Topbar menu="settings" crumb="ตั้งค่าระบบ" />
      <main className="ui-page">
        <PageHead sticky title="ตั้งค่าระบบ"
          subtitle={last ? `แก้ไขล่าสุด ${thaiDateTime(last.updatedAt)}${lastBy ? ` โดย ${lastBy}` : ""}` : "ยังใช้ค่าเริ่มต้นทั้งหมด"} />
        {sp.ok && <div className="flash">บันทึกการตั้งค่าแล้ว</div>}
        {/* key: after a save the form starts again from what is now stored */}
        <SettingsForm key={last?.updatedAt.toISOString() ?? "default"} saved={s} defaults={DEFAULT_SETTINGS}
          accounts={{ pcu: count("pcu"), clinician: count("clinician"), admin: count("admin") }} />
        <PageAids />
      </main>
    </>
  );
}
