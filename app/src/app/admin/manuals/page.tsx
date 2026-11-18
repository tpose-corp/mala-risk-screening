// /admin/manuals — one PDF manual per group of users, laid out like the printing-request
// system's manuals page: one table, a row per group, one file each (single language).
import { Topbar } from "@/components/topbar";
import { PageHead } from "@/components/ui/card";
import { db } from "@/lib/db";
import { thaiDateTime } from "@/lib/format";
import { MANUAL_AUDIENCES, MANUAL_MAX_MB, fmtSize } from "@/lib/manuals";
import { requireAdmin } from "@/lib/session";
import { ManualCell, ResultModal } from "./manual-cell";

import { PageAids } from "@/components/ui/page-aids";
const ERR: Record<string, string> = {
  missing: "กรุณาเลือกไฟล์", type: "รองรับเฉพาะไฟล์ PDF", size: `ไฟล์ใหญ่เกิน ${MANUAL_MAX_MB} MB`, audience: "ไม่พบกลุ่มผู้ใช้นี้",
};

export default async function AdminManualsPage({ searchParams }: PageProps<"/admin/manuals">) {
  await requireAdmin();
  const sp = await searchParams;
  const current = await db.manual.findMany({
    where: { active: true },
    select: { id: true, fileName: true, size: true, audience: true, uploadedAt: true, uploadedBy: { select: { displayName: true } } },
    orderBy: { uploadedAt: "desc" },
  });
  const slot = (key: string) => current.find((m) => m.audience === key) ?? null;
  const groupName = (k: unknown) => MANUAL_AUDIENCES.find((a) => a.key === k)?.title ?? "คู่มือ";
  const result = sp.ok === "uploaded" ? { ok: true, message: `อัปโหลด${groupName(sp.a)}แล้ว` }
    : sp.ok === "removed" ? { ok: true, message: `ลบ${groupName(sp.a)}แล้ว` }
    : typeof sp.err === "string" ? { ok: false, message: ERR[sp.err] ?? "กรุณาลองใหม่อีกครั้ง" } : null;

  return (
    <>
      <Topbar menu="amanuals" crumb="จัดการคู่มือ" />
      <main className="ui-page">
        <PageHead sticky title="คู่มือการใช้งาน" subtitle="อัปโหลดคู่มือ (ไฟล์ PDF) ให้แต่ละกลุ่มผู้ใช้ ผู้ใช้เปิดอ่านได้จากปุ่มคู่มือมุมขวาล่าง และจากเมนูคู่มือการใช้งาน" />
        <section className="ui-card">
          <table className="ui-table mn-table">
            <thead><tr><th style={{ width: "28%" }}>คู่มือ</th><th>ไฟล์</th></tr></thead>
            <tbody>
              {MANUAL_AUDIENCES.map((a) => {
                const m = slot(a.key);
                return (
                  <tr key={a.key}>
                    <th scope="row" className="mn-audience">{a.title}<span className="sub-line">สำหรับ{a.label}</span></th>
                    <td>
                      <ManualCell audience={a.key} label={a.title}
                        file={m ? { id: m.id, fileName: m.fileName, size: fmtSize(m.size), uploaded: `อัปโหลดโดย ${m.uploadedBy.displayName} เมื่อ ${thaiDateTime(m.uploadedAt)}` } : null} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
        <p className="ui-hint">รับเฉพาะไฟล์ PDF ไม่เกิน {MANUAL_MAX_MB} MB ต่อไฟล์ เปลี่ยนไฟล์ได้ตลอด ไฟล์เดิมจะถูกเก็บไว้ ถ้ายังไม่ได้อัปโหลด ผู้ใช้กลุ่มนั้นจะไม่เห็นปุ่มคู่มือ</p>
        {result && <ResultModal ok={result.ok} message={result.message} />}
        <PageAids />
      </main>
    </>
  );
}
