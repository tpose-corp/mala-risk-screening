// /manuals — the manuals this user may read, in the same one-table layout as the admin page.
import { Topbar } from "@/components/topbar";
import { PageHead } from "@/components/ui/card";
import { db } from "@/lib/db";
import { thaiDateTime } from "@/lib/format";
import { MANUAL_AUDIENCES, audiencesFor, fmtSize } from "@/lib/manuals";
import { requireUser } from "@/lib/session";

export default async function ManualsPage() {
  const user = await requireUser();
  const manuals = await db.manual.findMany({
    where: { active: true, audience: { in: audiencesFor(user.role) } },
    select: { id: true, title: true, fileName: true, size: true, audience: true, uploadedAt: true },
    orderBy: { uploadedAt: "desc" },
  });
  const label = (a: string) => MANUAL_AUDIENCES.find((x) => x.key === a)?.label ?? "ทุกคน";
  return (
    <>
      <Topbar crumb="คู่มือการใช้งาน" />
      <main className="ui-page">
        <PageHead sticky title="คู่มือการใช้งาน" subtitle="คู่มือที่ผู้ดูแลระบบของ รพ. อัปโหลดไว้ กดชื่อไฟล์เพื่อเปิดอ่าน" />
        <section className="ui-card">
          <table className="ui-table mn-table">
            <thead><tr><th style={{ width: "28%" }}>คู่มือ</th><th>ไฟล์</th></tr></thead>
            <tbody>
              {manuals.map((m) => (
                <tr key={m.id}>
                  <th scope="row" className="mn-audience">{m.title}<span className="sub-line">สำหรับ{label(m.audience)}</span></th>
                  <td>
                    <div className="mn-cell">
                      <div className="mn-file">
                        <a className="mn-file-link" href={`/manuals/${m.id}`} target="_blank" rel="noopener noreferrer">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 4h6a4 4 0 014 4v13a3 3 0 00-3-3H2zM22 4h-6a4 4 0 00-4 4v13a3 3 0 013-3h7z" /></svg>
                          <span className="mn-file-name">{m.fileName}</span>
                        </a>
                        <span className="mn-file-size">{fmtSize(m.size)} อัปเดตเมื่อ {thaiDateTime(m.uploadedAt)}</span>
                      </div>
                      <div className="mn-actions"><a className="ui-btn secondary sm" href={`/manuals/${m.id}`} target="_blank" rel="noopener noreferrer">เปิดอ่าน</a></div>
                    </div>
                  </td>
                </tr>
              ))}
              {manuals.length === 0 && <tr><td colSpan={2} className="ui-empty">ยังไม่มีคู่มือสำหรับคุณ</td></tr>}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}
