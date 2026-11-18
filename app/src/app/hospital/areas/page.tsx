// /hospital/areas — painkillers / ยาชุด and herbs reported at screening, grouped by unit
// (17 Nov 2026): if one community keeps showing risk, the hospital team can go and look for a
// shared cause (the same ยาชุด shop, the same herbal remedy). Read-only, no export.
import Link from "next/link";
import { Topbar } from "@/components/topbar";
import { Card, PageHead } from "@/components/ui/card";
import { DateRange } from "@/components/date-range";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { thaiDate } from "@/lib/format";
import { num } from "@/lib/paging";
import { groupProducts, nameKey, type ProductGroup } from "@/lib/product-names";
import { CompactSearch } from "@/components/ui/compact-search";
import { rangeWords, readRange } from "@/lib/date-range";
import { requireHospital } from "@/lib/session";

import { PageAids } from "@/components/ui/page-aids";
export default async function AreasPage({ searchParams }: PageProps<"/hospital/areas">) {
  const user = await requireHospital();
  const sp = await searchParams;
  // "ตั้งแต่ … ถึง …" (screening date), empty = everything
  const range = readRange(sp);

  const rows = await db.screening.findMany({
    where: { OR: [{ nsaid: true }, { herbal: true }], ...(range.where ? { createdAt: range.where } : {}) },
    select: { id: true, facility: true, createdAt: true, nsaid: true, nsaidNote: true, herbal: true, herbalNote: true, isAlert: true, patientId: true },
    orderBy: { createdAt: "desc" },
    take: 2000,
  });

  // Search by any word of the name or source (e.g. "เสือดาว"), across all units.
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const qk = nameKey(q);
  const hit = (note: string | null) => !qk || nameKey(note ?? "").includes(qk);

  // Per unit: patients, counts per type, and the raw entries (grouped by similar name below).
  type Entry = { note: string | null; at: Date };
  type Group = { facility: string; nsaid: number; herbal: number; alerts: number; patients: Set<number>; drugs: Entry[]; herbs: Entry[] };
  const groups = new Map<string, Group>();
  for (const r of rows) {
    const drug = r.nsaid && hit(r.nsaidNote);
    const herb = r.herbal && hit(r.herbalNote);
    if (!drug && !herb) continue;
    const g = groups.get(r.facility) ?? { facility: r.facility, nsaid: 0, herbal: 0, alerts: 0, patients: new Set(), drugs: [], herbs: [] };
    g.patients.add(r.patientId);
    if (r.isAlert) g.alerts++;
    if (drug) { g.nsaid++; g.drugs.push({ note: r.nsaidNote, at: r.createdAt }); }
    if (herb) { g.herbal++; g.herbs.push({ note: r.herbalNote, at: r.createdAt }); }
    groups.set(r.facility, g);
  }
  const list = [...groups.values()].sort((a, b) => b.patients.size - a.patients.size);
  const top = (g: Group) => groupProducts([...g.drugs, ...g.herbs])[0];
  // the unit shown in detail: ?fac=, else the one with the most patients
  const facParam = typeof sp.fac === "string" ? sp.fac : "";
  const picked = list.find((g) => g.facility === facParam) ?? list[0];
  const href = (o: { from?: string; to?: string; fac?: string }) => {
    const u = new URLSearchParams({ ...(o.from ? { from: o.from } : {}), ...(o.to ? { to: o.to } : {}), ...(o.fac ? { fac: o.fac } : {}), ...(q ? { q } : {}) });
    return u.toString() ? `/hospital/areas?${u}` : "/hospital/areas";
  };
  // years (พ.ศ.) that have any screening, newest first, for the year dropdown
  const oldest = await db.screening.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } });
  const thisYear = new Date().getFullYear() + 543;
  const firstYear = oldest ? Number(oldest.createdAt.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }).slice(0, 4)) + 543 : thisYear;
  const years = Array.from({ length: thisYear - firstYear + 1 }, (_, i) => thisYear - i);
  const rangeText = rangeWords(range);
  await audit({ user, action: "hospital.cases.view", detail: `rows=${rows.length}` });

  return (
    <>
      <Topbar menu="areas" crumb="ยาและสมุนไพรรายพื้นที่" />
      <main className="ui-page">
        <PageHead
          sticky
          title="ยาและสมุนไพรรายพื้นที่"
          subtitle="สิ่งที่ผู้ป่วยแจ้งว่ากินร่วมด้วยตอนคัดกรอง แยกตามหน่วยบริการ ใช้ประกอบการลงพื้นที่หาสาเหตุร่วม"
        />

        <section className="ui-card dr-card" aria-label="ช่วงเวลาที่คัดกรอง">
          <DateRange key={`${range.from}|${range.to}`} action="/hospital/areas" hidden={{ ...(facParam ? { fac: facParam } : {}), ...(q ? { q } : {}) }}
            from={range.from} to={range.to} years={years} clearHref={href({ fac: facParam })} title="ช่วงเวลาที่คัดกรอง" current={rangeText} />
        </section>

        {list.length === 0 ? (
          <Card><div className="ui-empty">{q ? `ไม่พบ "${q}" ในช่วงเวลานี้` : "ยังไม่มีผู้ป่วยที่แจ้งว่ากินยาแก้ปวด ยาชุด หรือสมุนไพร ในช่วงเวลานี้"}</div>{q && <div style={{ textAlign: "center", paddingBottom: 16 }}><Link href={href({ from: range.from, to: range.to })} className="ui-btn secondary sm">ล้างคำค้นหา</Link></div>}</Card>
        ) : (
          <div className="ui-fade-rows" key={`${range.from}-${range.to}`} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* 1. one row per unit: compare units at a glance, click a row for its detail */}
            <Card title="ภาพรวมรายหน่วยบริการ" count={`${list.length} หน่วย ${rangeText}${q ? ` ที่พบ "${q}"` : ""}`}
              actions={<CompactSearch action="/hospital/areas" hidden={{ ...(range.from ? { from: range.from } : {}), ...(range.to ? { to: range.to } : {}) }}
                name="q" value={q} placeholder="ชื่อยา สมุนไพร หรือแหล่งที่ซื้อ" activeCount={0} clearHref={href({ from: range.from, to: range.to }).replace(/[?&]q=[^&]*/, "")} />}>
              <div className="ui-table-wrap">
                <table className="ui-table ar-table">
                  <thead>
                    <tr>
                      <th>หน่วยบริการ</th>
                      <th className="num">ผู้ป่วยที่แจ้ง</th>
                      <th className="num">ยาแก้ปวด / ยาชุด</th>
                      <th className="num">สมุนไพร / อาหารเสริม</th>
                      <th className="num">เข้าเกณฑ์แจ้งเตือน</th>
                      <th>พบบ่อยที่สุด</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((g) => {
                      const t = top(g);
                      const on = g.facility === picked?.facility;
                      return (
                        <tr key={g.facility} className={on ? "on" : undefined}>
                          <td><Link href={`${href({ from: range.from, to: range.to, fac: g.facility })}#ar-detail`} className="ar-unit" aria-current={on || undefined}>{g.facility}</Link></td>
                          <td className="num">{num(g.patients.size)} <small>คน</small></td>
                          <td className="num">{num(g.nsaid)} <small>ครั้ง</small></td>
                          <td className="num">{num(g.herbal)} <small>ครั้ง</small></td>
                          <td className="num">{g.alerts ? <span className="ui-badge hi">{num(g.alerts)} ครั้ง</span> : <span className="muted-inline">ไม่มี</span>}</td>
                          <td className="ar-top">{t ? <>{t.label} <small>({num(t.n)} ครั้ง)</small></> : ""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="ar-note">
                นับเป็นครั้งที่คัดกรองแล้วผู้ป่วยแจ้งว่าใช้ ผู้ป่วยคนเดียวอาจแจ้งหลายครั้ง
                <b> เข้าเกณฑ์แจ้งเตือน</b> คือจำนวนครั้งที่พบการใช้ยาหรือสมุนไพร และผลคัดกรองครั้งนั้นเข้าเกณฑ์แจ้งเตือนด้วย
              </p>
            </Card>

            {/* 2. the picked unit: drugs and herbs side by side, most reported first */}
            {picked && (<>
              <div id="ar-detail" className="ar-anchor" />
              <Card title={`รายละเอียด ${picked.facility}`} count={`ผู้ป่วย ${num(picked.patients.size)} คน`}>
                <div className="ar-split">
                  <ItemList title="ยาแก้ปวด / ยาชุด" total={picked.nsaid} items={groupProducts(picked.drugs)} />
                  <ItemList title="สมุนไพร / อาหารเสริม" total={picked.herbal} items={groupProducts(picked.herbs)} />
                </div>
              </Card>
            </>)}
          </div>
        )}
        <PageAids />
      </main>
    </>
  );
}

const SHOW = 8;

// One type's products, grouped by similar name, with a bar for how often each was reported.
// Each row can open to show every way it was typed and where it came from. Long lists fold.
function ItemList({ title, total, items }: { title: string; total: number; items: ProductGroup[] }) {
  const max = items[0]?.n ?? 1;
  const row = (it: ProductGroup) => {
    // open-able only when there is more than the line above already says
    const more = it.spellings.length > 1 || it.sources.length > 1;
    return (
      <li key={it.label}>
        <div className="ar-row">
          <span className="ar-name">{it.label}</span>
          <span className="ar-n">{num(it.n)} <small>ครั้ง</small></span>
        </div>
        <div className="ar-bar"><span style={{ width: `${Math.max(4, (it.n / max) * 100)}%` }} /></div>
        <div className="ar-last">
          ล่าสุด {thaiDate(it.last)}
          {it.sources[0] && <> แหล่งที่พบบ่อย {it.sources[0].text}</>}
        </div>
        {more && (
          <details className="ar-more">
            <summary>{[it.spellings.length > 1 && `กรอกต่างกัน ${it.spellings.length} แบบ`, it.sources.length > 1 && `แหล่งที่มา ${it.sources.length} แห่ง`].filter(Boolean).join(" และ ")}</summary>
            <div className="ar-more-body">
              {it.spellings.length > 1 && (
                <div><b>ที่กรอกมา</b>{it.spellings.map((x) => <span key={x.text} className="ar-tag">{x.text} <small>{x.n}</small></span>)}</div>
              )}
              {it.sources.length > 0 && (
                <div><b>แหล่งที่มา</b>{it.sources.map((x) => <span key={x.text} className="ar-tag">{x.text} <small>{x.n}</small></span>)}</div>
              )}
            </div>
          </details>
        )}
      </li>
    );
  };
  return (
    <section className="ar-col">
      <h3>{title} <span>{num(total)} ครั้ง {items.length} กลุ่ม</span></h3>
      {items.length === 0 ? <p className="muted-inline" style={{ margin: 0 }}>ไม่มี</p> : (
        <ol className="ar-items">
          {items.slice(0, SHOW).map(row)}
          {items.length > SHOW && (
            <li className="more">
              <details>
                <summary>ดูทั้งหมดอีก {items.length - SHOW} กลุ่ม</summary>
                <ol className="ar-items">{items.slice(SHOW).map(row)}</ol>
              </details>
            </li>
          )}
        </ol>
      )}
    </section>
  );
}
