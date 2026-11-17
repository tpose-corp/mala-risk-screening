// /admin/settings — switches the hospital can flip itself instead of asking a developer
// (17 Nov 2026): turn the system on/off per role, the message shown while it is off, and who to
// call when a confirmed record needs fixing.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Topbar } from "@/components/topbar";
import { PageHead } from "@/components/ui/card";
import { asActor } from "@/lib/actor";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { thaiDateTime } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { getSettings } from "@/lib/settings";

async function save(fd: FormData) {
  "use server";
  const admin = await requireAdmin();
  const values: Record<string, string> = {
    pcuEnabled: String(fd.get("pcuEnabled") === "on"),
    clinicianEnabled: String(fd.get("clinicianEnabled") === "on"),
    closedMessage: String(fd.get("closedMessage") ?? "").trim().slice(0, 300),
    adminContact: String(fd.get("adminContact") ?? "").trim().slice(0, 200),
  };
  const before = await getSettings();
  const changed = Object.keys(values).filter((k) => String(before[k as keyof typeof before]) !== values[k]);
  await asActor(admin.id, async (tx) => {
    for (const [key, value] of Object.entries(values)) {
      if (!value && (key === "closedMessage" || key === "adminContact")) continue; // keep the default
      await tx.setting.upsert({ where: { key }, create: { key, value, updatedById: admin.id }, update: { value, updatedById: admin.id } });
    }
  });
  await audit({ user: admin, action: "admin.settings.update", detail: `changed=${changed.join(",") || "none"}` });
  revalidatePath("/", "layout");
  redirect("/admin/settings?ok=1");
}

export default async function SettingsPage({ searchParams }: PageProps<"/admin/settings">) {
  await requireAdmin();
  const sp = await searchParams;
  const s = await getSettings();
  const last = await db.setting.findFirst({ orderBy: { updatedAt: "desc" } });
  return (
    <>
      <Topbar menu="settings" crumb="ตั้งค่าระบบ" />
      <main className="ui-page">
        <PageHead sticky title="ตั้งค่าระบบ" subtitle={<>{last ? `แก้ไขล่าสุด ${thaiDateTime(last.updatedAt)}` : "ยังใช้ค่าเริ่มต้นทั้งหมด"}</>} />
        {sp.ok && <div className="flash">บันทึกการตั้งค่าแล้ว</div>}
        <form action={save} className="card pad" style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 720 }}>
          <div className="sec-title" style={{ margin: 0 }}>เปิดหรือปิดการใช้งานตามบทบาท</div>
          <label className="kv" style={{ cursor: "pointer" }}>
            <span className="k">เจ้าหน้าที่ รพ.สต. เข้าใช้ระบบได้ (คัดกรองและบันทึกผล)</span>
            <input type="checkbox" className="ui-toggle" name="pcuEnabled" defaultChecked={s.pcuEnabled} />
          </label>
          <label className="kv" style={{ cursor: "pointer" }}>
            <span className="k">แพทย์ / พยาบาล เข้าใช้ระบบได้ (ดูข้อมูลและรับเรื่อง)</span>
            <input type="checkbox" className="ui-toggle" name="clinicianEnabled" defaultChecked={s.clinicianEnabled} />
          </label>
          <div className="note">ผู้ดูแลระบบใช้งานได้เสมอ เพื่อให้เปิดระบบกลับได้ ข้อมูลทั้งหมดไม่หายเมื่อปิด</div>
          <div>
            <label className="lbl" htmlFor="closedMessage">ข้อความที่แสดงเมื่อปิดระบบ</label>
            <textarea className="fld" id="closedMessage" name="closedMessage" rows={2} defaultValue={s.closedMessage} style={{ height: "auto" }} />
          </div>
          <div>
            <label className="lbl" htmlFor="adminContact">ช่องทางติดต่อผู้ดูแลระบบ (แสดงเมื่อแก้ไขผลที่ยืนยันแล้วไม่ได้)</label>
            <input className="fld" id="adminContact" name="adminContact" defaultValue={s.adminContact} placeholder="เช่น ศูนย์ข้อมูลยา โทร 0xx-xxx-xxxx ต่อ xxx" />
          </div>
          <div className="ui-savebar"><span className="ui-hint">การเปลี่ยนแปลงมีผลทันทีหลังบันทึก</span><button className="ui-btn primary" type="submit">บันทึกการตั้งค่า</button></div>
        </form>
      </main>
    </>
  );
}
