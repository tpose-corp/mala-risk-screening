// /hospital/areas — painkillers / ยาชุด and herbs reported at screening, grouped by unit
// (17 Nov 2026): if one community keeps showing risk, the hospital team can go and look for a
// shared cause (the same ยาชุด shop, the same herbal remedy). Read-only, no export.
import { Topbar } from "@/components/topbar";
import { Card, PageHead } from "@/components/ui/card";
import { SegTabs } from "@/components/ui/seg-tabs";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { thaiDate } from "@/lib/format";
import { PERIODS, periodStart } from "@/lib/paging";
import { requireHospital } from "@/lib/session";

export default async function AreasPage({ searchParams }: PageProps<"/hospital/areas">) {
  const user = await requireHospital();
  const sp = await searchParams;
  const period = typeof sp.period === "string" && PERIODS.some((p) => p.id === sp.period) ? sp.period : "all";
  const since = periodStart(period);

  const rows = await db.screening.findMany({
    where: { OR: [{ nsaid: true }, { herbal: true }], ...(since ? { createdAt: { gte: since } } : {}) },
    select: { id: true, facility: true, createdAt: true, nsaid: true, nsaidNote: true, herbal: true, herbalNote: true, isAlert: true, patientId: true },
    orderBy: { createdAt: "desc" },
    take: 2000,
  });

  type Group = { facility: string; nsaid: number; herbal: number; alerts: number; patients: Set<number>; items: Map<string, { kind: string; n: number; last: Date }> };
  const groups = new Map<string, Group>();
  for (const r of rows) {
    const g = groups.get(r.facility) ?? { facility: r.facility, nsaid: 0, herbal: 0, alerts: 0, patients: new Set(), items: new Map() };
    g.patients.add(r.patientId);
    if (r.isAlert) g.alerts++;
    const add = (kind: string, note: string | null) => {
      const key = `${kind}|${(note ?? "ไม่ได้ระบุ").trim()}`;
      const it = g.items.get(key) ?? { kind, n: 0, last: r.createdAt };
      it.n++;
      if (r.createdAt > it.last) it.last = r.createdAt;
      g.items.set(key, it);
    };
    if (r.nsaid) { g.nsaid++; add("ยาแก้ปวด / ยาชุด", r.nsaidNote); }
    if (r.herbal) { g.herbal++; add("สมุนไพร / อาหารเสริม", r.herbalNote); }
    groups.set(r.facility, g);
  }
  const list = [...groups.values()].sort((a, b) => b.patients.size - a.patients.size);
  await audit({ user, action: "hospital.cases.view", detail: `rows=${rows.length}` });

  return (
    <>
      <Topbar menu="areas" crumb="ยาและสมุนไพรรายพื้นที่" />
      <main className="ui-page">
        <PageHead
          sticky
          title="ยาและสมุนไพรรายพื้นที่"
          subtitle="สิ่งที่ผู้ป่วยแจ้งว่ากินร่วมด้วยตอนคัดกรอง แยกตามหน่วยบริการ ใช้ประกอบการลงพื้นที่หาสาเหตุร่วม"
          actions={
            <SegTabs label="ช่วงเวลา" active={period} tabs={PERIODS.map((p) => ({ key: p.id, label: p.label, href: `/hospital/areas?period=${p.id}` }))} />
          }
        />
        <div className="ui-fade-rows" key={period} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {list.map((g) => (
          <Card key={g.facility} title={g.facility}
            count={`ผู้ป่วย ${g.patients.size} คน`}
            actions={<>
              <span className="ui-badge acc">ยาแก้ปวด/ยาชุด {g.nsaid} ครั้ง</span>
              <span className="ui-badge acc">สมุนไพร {g.herbal} ครั้ง</span>
              {g.alerts > 0 && <span className="ui-badge hi">แจ้งเตือน {g.alerts} ครั้ง</span>}
            </>}>
            <div className="ui-table-wrap">
              <table className="ui-table">
                <thead><tr><th>ประเภท</th><th>ที่ผู้ป่วยระบุ</th><th className="num">จำนวนครั้ง</th><th>ล่าสุด</th></tr></thead>
                <tbody>
                  {[...g.items.entries()].sort((a, b) => b[1].n - a[1].n).map(([key, it]) => (
                    <tr key={key}><td>{it.kind}</td><td>{key.split("|")[1]}</td><td className="num">{it.n}</td><td>{thaiDate(it.last)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ))}
        </div>
        {list.length === 0 && <Card><div className="ui-empty">ยังไม่มีผู้ป่วยที่แจ้งว่ากินยาแก้ปวด ยาชุด หรือสมุนไพร</div></Card>}
      </main>
    </>
  );
}
