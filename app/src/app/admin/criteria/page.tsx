// /admin/criteria — the hospital changes the screening NUMBERS itself (17 Nov 2026), so nobody has
// to edit code after hand-over. Safety rails:
//   - which factors are scored stays fixed in code (src/lib/rules.ts); only the numbers change
//   - every save needs the approving doctor/pharmacist and a reason, and becomes a new version
//   - old screenings keep the version they were scored with; nothing is rescored silently
//   - impossible values are refused (paramFieldProblems), on the page and again on the server
// The form itself (unsaved-changes guard, undo, jump to a wrong box) is criteria-form.tsx.
import { Topbar } from "@/components/topbar";
import { PageHead } from "@/components/ui/card";
import { currentCriteria } from "@/lib/criteria";
import { db } from "@/lib/db";
import { thaiDateTime } from "@/lib/format";
import { DEFAULT_PARAMS, RULE_VERSION, type RuleParams } from "@/lib/rules";
import { requireAdmin } from "@/lib/session";
import { CriteriaForm, type HistoryRow } from "./criteria-form";

export default async function CriteriaPage({ searchParams }: PageProps<"/admin/criteria">) {
  await requireAdmin();
  const sp = await searchParams;
  const cur = await currentCriteria();
  const rows = await db.ruleSet.findMany({ orderBy: { createdAt: "desc" }, include: { createdBy: true } });
  const usedBy = new Map((await db.screening.groupBy({ by: ["ruleVersion"], _count: { _all: true } })).map((g) => [g.ruleVersion, g._count._all]));
  const history: HistoryRow[] = [
    ...rows.map((h) => ({
      version: h.version, when: thaiDateTime(h.createdAt), approvedBy: h.approvedBy, reason: h.reason, by: h.createdBy?.displayName ?? "",
      used: usedBy.get(h.version) ?? 0, params: { ...DEFAULT_PARAMS, ...(h.params as Partial<RuleParams>) },
    })),
    { version: RULE_VERSION, when: "ค่าเริ่มต้น", approvedBy: "", reason: "", by: "", used: usedBy.get(RULE_VERSION) ?? 0, params: DEFAULT_PARAMS, isDefault: true },
  ];

  return (
    <>
      <Topbar menu="criteria" crumb="เกณฑ์การประเมิน" />
      <main className="ui-page">
        <PageHead sticky title="เกณฑ์การประเมิน" subtitle={<>ใช้อยู่ตอนนี้: <b>{cur.version}</b> การแก้ไขมีผลกับการคัดกรองครั้งต่อไปเท่านั้น ผลเก่ายังแสดงตามเกณฑ์ที่ใช้ตอนประเมิน</>} />
        {sp.ok && <div className="flash">บันทึกเกณฑ์เวอร์ชันใหม่แล้ว</div>}

        <div className="card pad" style={{ background: "var(--warn-soft)", fontSize: 13.5, lineHeight: 1.7 }}>
          <b>ก่อนแก้ไข</b> ตัวเลขเหล่านี้เป็นเกณฑ์ทางคลินิก ควรแก้ตามมติหรือเอกสารของทีมแพทย์และเภสัชกรเท่านั้น
          ค่าเริ่มต้นมาจากเอกสาร MALA outline ของ รพ. (ฉบับร่าง 8 ก.ย. 2569) ระบบเปลี่ยนได้เฉพาะตัวเลข
          ถ้าต้องการเพิ่มปัจจัยใหม่ เช่น ค่าแล็บตัวอื่น ต้องให้ผู้พัฒนาเพิ่มในโปรแกรม
        </div>

        {/* key: after a save the form starts again from the new version */}
        <CriteriaForm key={cur.version} version={cur.version} current={cur.params} history={history} />
      </main>
    </>
  );
}
