// /hospital — the referral hospital's in-app alert inbox (MVP core 3, in-app channel).
// Every alert case from every รพ.สต. lands here the moment the result is computed.
import Link from "next/link";
import { Fragment } from "react";
import { AutoRefresh } from "@/components/auto-refresh";
import { Topbar } from "@/components/topbar";
import { audit } from "@/lib/audit";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { ageFromThaiDob, thaiDateTime } from "@/lib/format";
import { alertReasons } from "@/lib/reasons";
import { PageHead, PagerBar } from "@/components/ui/card";
import { FilterGroup } from "@/components/ui/filter-panel";
import { CompactSearch } from "@/components/ui/compact-search";
import { hasFilters, queryFor, readFilters, whereFor } from "@/lib/case-filters";
import { PER_PAGE_CHOICES, PERIODS, num, pageInfo } from "@/lib/paging";
import { PerPage } from "@/components/ui/per-page";
import { SegTabs } from "@/components/ui/seg-tabs";
import { withBack } from "@/lib/back-link";
import { groupWaiting } from "@/lib/priority";
import { waitText } from "@/lib/wait";
import { requireHospital } from "@/lib/session";
import { ackSummary } from "@/lib/ack-summary";
import { AcknowledgeButton } from "./acknowledge-button";

// "วันนี้ 08:40" for today, the full Thai date and time otherwise.
function whenText(d: Date) {
  const tz = "Asia/Bangkok";
  const day = (x: Date) => x.toLocaleDateString("en-CA", { timeZone: tz });
  if (day(d) === day(new Date())) {
    return `วันนี้ ${d.toLocaleTimeString("th-TH", { timeZone: tz, hour: "2-digit", minute: "2-digit" })}`;
  }
  return thaiDateTime(d);
}

export default async function AlertInbox({ searchParams }: PageProps<"/hospital">) {
  const user = await requireHospital();
  const sp = await searchParams;
  const done = sp.show === "done";
  // Two main tabs (17 Nov 2026): ใช้ยาเกินขนาด first (the doctor acts on these first), then เสี่ยงทั่วไป.
  const kind: "dose" | "risk" = sp.kind === "risk" ? "risk" : "dose";
  const f = readFilters(sp); // q, fac, period (src/lib/case-filters.ts)

  const waitingDose = await db.screening.count({ where: { isAlert: true, alertKind: "dose", acknowledgedAt: null } });
  const waitingRisk = await db.screening.count({ where: { isAlert: true, alertKind: "risk", acknowledgedAt: null } });
  const waiting = kind === "dose" ? waitingDose : waitingRisk;

  // Waiting tab: grouped by the outline and longest wait first (src/lib/priority.ts).
  // "รับเรื่องแล้ว" tab: can grow to tens of thousands, so it is filtered and paged on the
  // database side (one page of 25 per request), newest acknowledgement first.
  const doneWhere = whereFor({ ...f, result: "all" }, "acknowledgedAt", { isAlert: true, alertKind: kind, acknowledgedAt: { not: null } });
  const doneTotal = done ? await db.screening.count({ where: doneWhere }) : 0;
  const per = PER_PAGE_CHOICES.includes(Number(sp.per)) ? Number(sp.per) : 20;
  const pg = pageInfo(doneTotal, sp.page, per);
  const perQ: Record<string, number> = per === 20 ? {} : { per };
  const alerts = done
    ? await db.screening.findMany({ where: doneWhere, include: ROW_INCLUDE, orderBy: { acknowledgedAt: "desc" }, skip: pg.skip, take: pg.take })
    : await db.screening.findMany({
        where: whereFor({ ...f, result: "all", period: "all" }, "acknowledgedAt", { isAlert: true, alertKind: kind, acknowledgedAt: null }),
        include: ROW_INCLUDE, orderBy: { alertRaisedAt: "asc" }, take: WAITING_LIMIT,
      });
  const facilities = (await db.facility.findMany({ select: { name: true }, orderBy: { name: "asc" } })).map((x) => x.name);
  const pageHref = (page: number) => `/hospital${queryFor({ ...f, result: "all" }, { show: "done", kind, ...perQ, page })}`;
  // Summary numbers for the top of the page.
  const oldest = await db.screening.findFirst({
    where: { isAlert: true, alertKind: kind, acknowledgedAt: null },
    orderBy: { alertRaisedAt: "asc" },
    select: { alertRaisedAt: true },
  });
  const startOfToday = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }) + "T00:00:00+07:00");
  const ackToday = await db.screening.count({ where: { isAlert: true, acknowledgedAt: { gte: startOfToday } } });
  await audit({ user, action: "hospital.inbox.view", detail: `rows=${alerts.length}` });

  const tab = (k: "dose" | "risk", show: boolean) => `/hospital?kind=${k}${show ? "&show=done" : ""}${show && per !== 20 ? `&per=${per}` : ""}`;
  // this exact view, so "กลับ" on a case or patient page returns here
  const here = done ? pageHref(pg.page) : tab(kind, false);
  const activeFilters = [f.fac, done && f.period !== "all"].filter(Boolean).length;

  return (
    <>
      <Topbar menu="alerts" crumb="กล่องแจ้งเตือน" />
      {!done && <AutoRefresh seconds={10} />}
      <main className="ui-page">
        <PageHead
          sticky
          title="กล่องแจ้งเตือน"
          subtitle="เคสเสี่ยงจาก รพ.สต. ในเครือข่าย เข้ามาทันทีที่ผลประเมินออก"
          actions={
            <SegTabs label="สถานะ" active={done ? "done" : "waiting"} tabs={[
              { key: "waiting", label: "รอรับเรื่อง", href: tab(kind, false), count: waitingDose + waitingRisk },
              { key: "done", label: "รับเรื่องแล้ว", href: tab(kind, true) },
            ]} />
          }
        />

        {!done && !hasFilters(f) && waiting > alerts.length && (
          <div className="flash bad">
            แสดง {num(alerts.length)} เคสที่รอนานที่สุด ยังมีเคสรออีก {num(waiting - alerts.length)} เคส รับเรื่องเคสด้านบนแล้วเคสที่เหลือจะขึ้นมาเอง
          </div>
        )}

        {/* One card: pick the alert type (tabs), see the two numbers (chips), then the cases. */}
        <section className="ui-card inbox-card">
          <div className="kind-switch" role="tablist" aria-label="เลือกประเภทการแจ้งเตือน">
            {([
              { k: "dose", t: "ใช้ยาเกินขนาด", d: "ขนาดยาเกินเกณฑ์ eGFR หรือห้ามใช้ยา ควรพิจารณาก่อน", n: waitingDose },
              { k: "risk", t: "เกณฑ์เสี่ยงทั่วไป", d: "คะแนนความเสี่ยง MALA ถึงเกณฑ์ แต่ขนาดยายังเหมาะสม", n: waitingRisk },
            ] as const).map((x) => (
              <Link key={x.k} href={tab(x.k, done)} scroll={false} role="tab" aria-selected={kind === x.k} className={`${x.k}${kind === x.k ? " on" : ""}`}>
                <span className="radio" aria-hidden="true" />
                <span className="body">
                  <span className="t">{x.t}</span>
                  <span className="d">{x.d}</span>
                </span>
                <span className={`n${x.n ? "" : " zero"}`}>{x.n ? `${num(x.n)} รอรับเรื่อง` : "ไม่มีเคสรอ"}</span>
              </Link>
            ))}
          </div>

          <div className="inbox-meta">
            <span className="title">{done ? "เคสที่รับเรื่องแล้ว" : "เคสที่รอรับเรื่อง"} <b>{num(done ? pg.total : alerts.length)} เคส</b></span>
            <span className={`chip${oldest ? " hi" : ""}`}>⏱ รอนานที่สุด <b>{oldest?.alertRaisedAt ? waitText(oldest.alertRaisedAt) : "ไม่มีเคสรอ"}</b></span>
            <span className="chip">✓ รับเรื่องแล้ววันนี้ <b>{num(ackToday)} เคส</b> <small>(ทั้ง 2 ประเภท)</small></span>
            <span className="end">
              <CompactSearch action="/hospital" hidden={{ kind, ...(done ? { show: "done" } : {}), ...(done && per !== 20 ? { per: String(per) } : {}) }}
                name="q" value={f.q} placeholder="ชื่อหรือ HN" activeCount={activeFilters} clearHref={tab(kind, done)}>
                <FilterGroup label="หน่วยบริการที่คัดกรอง">
                  <select className="ui-select" name="fac" defaultValue={f.fac}>
                    <option value="">ทุกหน่วยบริการ</option>
                    {facilities.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                </FilterGroup>
                {done && (
                  <FilterGroup label="ช่วงเวลาที่รับเรื่อง">
                    <select className="ui-select" name="period" defaultValue={f.period}>
                      {PERIODS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                    </select>
                  </FilterGroup>
                )}
              </CompactSearch>
              {done ? <PerPage value={per} unit="เคส" /> : <span className="auto">อัปเดตเองทุก 10 วินาที</span>}
            </span>
          </div>

          <div className="ui-table-wrap sticky-head" key={here}>
            <table className="ui-table">
              <thead>
                <tr>
                  <th>เวลาแจ้ง</th>
                  <th>ผู้ป่วย</th>
                  <th>จากหน่วยบริการ</th>
                  <th>เหตุผลที่แจ้งเตือน</th>
                  <th style={{ textAlign: "right" }}>{done ? "รับเรื่องโดย" : ""}</th>
                </tr>
              </thead>
              <tbody className="ui-fade-rows">
                {done
                  ? alerts.map((s) => <AlertRow key={s.id} s={s} from={here} me={user.displayName} />)
                  : groupWaiting(alerts).map((g) => (
                      <Fragment key={g.group}>
                        <tr className="grp"><td colSpan={5}>{g.label} <span>{g.items.length} เคส</span></td></tr>
                        {g.items.map((s) => <AlertRow key={s.id} s={s} from={here} me={user.displayName} />)}
                      </Fragment>
                    ))}
                {alerts.length === 0 && (
                  <tr><td colSpan={5} className="ui-empty">{done ? (hasFilters(f) ? "ไม่พบเคสตามที่ค้นหา" : "ยังไม่มีเคสที่รับเรื่อง") : (hasFilters(f) ? "ไม่พบเคสตามที่ค้นหา" : "ไม่มีเคสที่รอรับเรื่อง")}</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {done && <PagerBar pg={pg} href={pageHref} unit="เคส" />}
        </section>
      </main>
    </>
  );
}

// "รอ 25 นาที", or just "เพิ่งเข้ามา" for an alert under a minute old.
function waitedText(d: Date) {
  const w = waitText(d);
  return w === "เพิ่งเข้ามา" ? w : `รอ ${w}`;
}

const ROW_INCLUDE = { patient: true, screener: true, acknowledgedBy: true } as const;
// The waiting queue should stay short; if it ever grows past this, the page says so.
const WAITING_LIMIT = 200;

type Alert = Prisma.ScreeningGetPayload<{ include: typeof ROW_INCLUDE }>;

function AlertRow({ s, from, me }: { s: Alert; from: string; me: string }) {
  return (
    <tr>
      <td style={{ whiteSpace: "nowrap" }}>
        {s.alertRaisedAt ? whenText(s.alertRaisedAt) : ""}
        {!s.acknowledgedAt && s.alertRaisedAt && <span className="sub-line waited">{waitedText(s.alertRaisedAt)}</span>}
      </td>
      <td>
        <Link href={withBack(`/hospital/patients/${s.patientId}`, from)} className="name-link">{s.patient.name}</Link>
        <span className="sub-line">HN {s.patient.hn ?? "ยังไม่มี"} {s.patient.sex} {ageFromThaiDob(s.patient.dob)} ปี</span>
        {(s.nsaidNote || s.herbalNote) && <span className="sub-line">ใช้ร่วม: {[s.nsaidNote, s.herbalNote].filter(Boolean).join(", ")}</span>}
      </td>
      <td>
        {s.facility}
        <span className="sub-line">{s.screener.displayName}</span>
        {s.patient.facility && s.patient.facility !== s.facility && <span className="sub-line">หน่วยประจำ {s.patient.facility}</span>}
      </td>
      <td>
        <ul className="ui-reasons">
          {alertReasons(s).map((r) => (
            // Dose problems (Part 1) need the doctor first: red.
            <li key={r} className={r.startsWith("เสี่ยง MALA") ? undefined : "dose"}>{r}</li>
          ))}
        </ul>
      </td>
      <td>
        <div className="ui-row-actions">
          {s.acknowledgedAt ? (
            <span className="sub-line" style={{ textAlign: "right" }}>{s.acknowledgedBy?.displayName}<br />{thaiDateTime(s.acknowledgedAt)}</span>
          ) : (
            <AcknowledgeButton id={s.id} me={me} summary={ackSummary(s)} className="ui-btn solid-danger sm" />
          )}
          <Link href={withBack(`/hospital/cases/${s.id}`, from)} className="ui-btn secondary sm">ดูเคส</Link>
        </div>
      </td>
    </tr>
  );
}
