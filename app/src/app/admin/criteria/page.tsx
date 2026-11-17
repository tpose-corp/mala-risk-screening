// /admin/criteria — the hospital changes the screening NUMBERS itself (17 Nov 2026), so nobody has
// to edit code after hand-over. Safety rails:
//   - which factors are scored stays fixed in code (src/lib/rules.ts); only the numbers change
//   - every save needs the approving doctor/pharmacist and a reason, and becomes a new version
//   - old screenings keep the version they were scored with; nothing is rescored silently
//   - impossible values are refused (paramProblems)
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Topbar } from "@/components/topbar";
import { PageHead } from "@/components/ui/card";
import { asActor } from "@/lib/actor";
import { audit } from "@/lib/audit";
import { currentCriteria } from "@/lib/criteria";
import { db } from "@/lib/db";
import { thaiDateTime } from "@/lib/format";
import { DEFAULT_PARAMS, PARAM_INFO, RULE_VERSION, paramProblems, type RuleParams } from "@/lib/rules";
import { requireAdmin } from "@/lib/session";

const KEYS = Object.keys(DEFAULT_PARAMS) as (keyof RuleParams)[];

async function save(fd: FormData) {
  "use server";
  const admin = await requireAdmin();
  const params = Object.fromEntries(KEYS.map((k) => [k, Number(fd.get(k))])) as RuleParams;
  const approvedBy = String(fd.get("approvedBy") ?? "").trim();
  const reason = String(fd.get("reason") ?? "").trim();
  const problems = paramProblems(params);
  if (!approvedBy || !reason) problems.push("กรุณากรอกชื่อผู้อนุมัติและเหตุผลที่แก้ไข");
  if (problems.length) redirect(`/admin/criteria?err=${encodeURIComponent(problems.join(" / "))}`);

  const count = await db.ruleSet.count();
  const version = `v${count + 2}-${new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" })}`;
  const row = await asActor(admin.id, (tx) =>
    tx.ruleSet.create({ data: { version, params, approvedBy: approvedBy.slice(0, 120), reason: reason.slice(0, 500), createdById: admin.id } }),
  );
  await audit({ user: admin, action: "admin.criteria.update", entity: "RuleSet", entityId: row.id, detail: `ruleVersion=${version}` });
  revalidatePath("/admin/criteria");
  redirect("/admin/criteria?ok=1");
}

export default async function CriteriaPage({ searchParams }: PageProps<"/admin/criteria">) {
  await requireAdmin();
  const sp = await searchParams;
  const cur = await currentCriteria();
  const history = await db.ruleSet.findMany({ orderBy: { createdAt: "desc" }, include: { createdBy: true } });
  const usedBy = new Map((await db.screening.groupBy({ by: ["ruleVersion"], _count: { _all: true } })).map((g) => [g.ruleVersion, g._count._all]));
  const parts = [...new Set(KEYS.map((k) => PARAM_INFO[k].part))];

  return (
    <>
      <Topbar menu="criteria" crumb="เกณฑ์การประเมิน" />
      <main className="ui-page">
        <PageHead sticky title="เกณฑ์การประเมิน" subtitle={<>ใช้อยู่ตอนนี้: <b>{cur.version}</b> การแก้ไขมีผลกับการคัดกรองครั้งต่อไปเท่านั้น ผลเก่ายังแสดงตามเกณฑ์ที่ใช้ตอนประเมิน</>} />
        {sp.ok && <div className="flash">บันทึกเกณฑ์เวอร์ชันใหม่แล้ว</div>}
        {typeof sp.err === "string" && <div className="flash bad">{sp.err}</div>}

        <div className="card pad" style={{ background: "var(--warn-soft)", fontSize: 13.5, lineHeight: 1.7 }}>
          <b>ก่อนแก้ไข</b> ตัวเลขเหล่านี้เป็นเกณฑ์ทางคลินิก ควรแก้ตามมติหรือเอกสารของทีมแพทย์และเภสัชกรเท่านั้น
          ค่าเริ่มต้นมาจากเอกสาร MALA outline ของ รพ. (ฉบับร่าง 8 ก.ย. 2569) ระบบเปลี่ยนได้เฉพาะตัวเลข
          ถ้าต้องการเพิ่มปัจจัยใหม่ เช่น ค่าแล็บตัวอื่น ต้องให้ผู้พัฒนาเพิ่มในโปรแกรม
        </div>

        <form action={save} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {parts.map((part) => (
            <div key={part} className="card pad">
              <div className="sec-title">{part}</div>
              <div className="form-grid">
                {KEYS.filter((k) => PARAM_INFO[k].part === part).map((k) => (
                  <div key={k}>
                    <label className="lbl" htmlFor={k}>{PARAM_INFO[k].label} ({PARAM_INFO[k].unit})</label>
                    <input className="fld" id={k} name={k} type="number" step="any" min={0} required defaultValue={cur.params[k]} />
                    <div className="note">ค่าเริ่มต้นตามเอกสาร รพ. {DEFAULT_PARAMS[k]}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="card pad form-grid">
            <div>
              <label className="lbl" htmlFor="approvedBy">แพทย์ / เภสัชกรผู้อนุมัติ *</label>
              <input className="fld" id="approvedBy" name="approvedBy" required placeholder="ชื่อและตำแหน่ง" />
            </div>
            <div>
              <label className="lbl" htmlFor="reason">เหตุผลหรือเอกสารอ้างอิง *</label>
              <input className="fld" id="reason" name="reason" required placeholder="เช่น มติคณะกรรมการ PTC ครั้งที่ ..." />
            </div>
          </div>
          <div className="ui-savebar"><span className="ui-hint">บันทึกแล้วจะเป็นเกณฑ์เวอร์ชันใหม่ ใช้กับการคัดกรองครั้งต่อไป</span><button className="ui-btn primary" type="submit">บันทึกเป็นเกณฑ์เวอร์ชันใหม่</button></div>
        </form>

        <div className="card" style={{ overflowX: "auto" }}>
          <div className="sec-title" style={{ padding: "16px 16px 0" }}>ประวัติเกณฑ์</div>
          <table className="grid">
            <thead><tr><th>เวอร์ชัน</th><th>บันทึกเมื่อ</th><th>ผู้อนุมัติ</th><th>เหตุผล</th><th>บันทึกโดย</th><th>ใช้ประเมินไปแล้ว</th></tr></thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td className="mono">{h.version}{h.version === cur.version && <span className="pill ok" style={{ marginLeft: 6 }}>ใช้อยู่</span>}</td>
                  <td className="time">{thaiDateTime(h.createdAt)}</td>
                  <td>{h.approvedBy}</td>
                  <td>{h.reason}</td>
                  <td>{h.createdBy?.displayName ?? ""}</td>
                  <td>{usedBy.get(h.version) ?? 0} ครั้ง</td>
                </tr>
              ))}
              <tr>
                <td className="mono">{RULE_VERSION}{history.length === 0 && <span className="pill ok" style={{ marginLeft: 6 }}>ใช้อยู่</span>}</td>
                <td className="time">ค่าเริ่มต้น</td>
                <td colSpan={3}>เอกสาร MALA outline prg.xlsx ของ รพ.</td>
                <td>{usedBy.get(RULE_VERSION) ?? 0} ครั้ง</td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
