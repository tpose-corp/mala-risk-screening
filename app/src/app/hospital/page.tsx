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
import { ListFilters, Pager } from "@/components/list-controls";
import { hasFilters, queryFor, readFilters, whereFor } from "@/lib/case-filters";
import { num, pageInfo } from "@/lib/paging";
import { groupWaiting } from "@/lib/priority";
import { waitText } from "@/lib/wait";
import { requireHospital } from "@/lib/session";
import { acknowledgeAlert } from "./actions";

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
  const f = readFilters(sp); // q, fac, period (src/lib/case-filters.ts)

  const waiting = await db.screening.count({ where: { isAlert: true, acknowledgedAt: null } });

  // Waiting tab: grouped by the outline and longest wait first (src/lib/priority.ts).
  // "รับเรื่องแล้ว" tab: can grow to tens of thousands, so it is filtered and paged on the
  // database side (one page of 25 per request), newest acknowledgement first.
  const doneWhere = whereFor({ ...f, result: "all" }, "acknowledgedAt", { isAlert: true, acknowledgedAt: { not: null } });
  const doneTotal = done ? await db.screening.count({ where: doneWhere }) : 0;
  const pg = pageInfo(doneTotal, sp.page);
  const alerts = done
    ? await db.screening.findMany({ where: doneWhere, include: ROW_INCLUDE, orderBy: { acknowledgedAt: "desc" }, skip: pg.skip, take: pg.take })
    : await db.screening.findMany({ where: { isAlert: true, acknowledgedAt: null }, include: ROW_INCLUDE, orderBy: { alertRaisedAt: "asc" }, take: WAITING_LIMIT });
  const facilities = done
    ? (await db.patient.findMany({ distinct: ["facility"], select: { facility: true }, orderBy: { facility: "asc" } })).map((x) => x.facility)
    : [];
  const pageHref = (page: number) => `/hospital${queryFor({ ...f, result: "all" }, { show: "done", page })}`;
  // Summary numbers for the top of the page.
  const oldest = await db.screening.findFirst({
    where: { isAlert: true, acknowledgedAt: null },
    orderBy: { alertRaisedAt: "asc" },
    select: { alertRaisedAt: true },
  });
  const startOfToday = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }) + "T00:00:00+07:00");
  const ackToday = await db.screening.count({ where: { isAlert: true, acknowledgedAt: { gte: startOfToday } } });
  await audit({ user, action: "hospital.inbox.view", detail: `rows=${alerts.length}` });

  return (
    <>
      <Topbar menu="alerts" crumb="กล่องแจ้งเตือน" />
      {!done && <AutoRefresh seconds={10} />}
      <main className="page">
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 className="h1">กล่องแจ้งเตือน</h1>
            <div className="sub">เคสเสี่ยงจาก รพ.สต. ในเครือข่าย เข้ามาทันทีที่ผลประเมินออก</div>
          </div>
          <div className="tabs">
            <Link href="/hospital" className={done ? "" : "on"}>รอรับเรื่อง</Link>
            <Link href="/hospital?show=done" className={done ? "on" : ""}>รับเรื่องแล้ว</Link>
          </div>
        </div>

        <div className="inbox-stats">
          <div className={`card pad urgent${waiting ? " live" : ""}`}>
            <span className="label">{waiting > 0 && <i className="pulse" aria-hidden="true" />}รอรับเรื่อง</span>
            <b>{waiting}</b>
            <span className="unit">เคส</span>
          </div>
          <div className="card pad">
            <span className="label">รอนานที่สุด</span>
            <b className="small">{oldest?.alertRaisedAt ? waitText(oldest.alertRaisedAt) : "ไม่มี"}</b>
          </div>
          <div className="card pad">
            <span className="label">รับเรื่องแล้ววันนี้</span>
            <b>{ackToday}</b>
            <span className="unit">เคส</span>
          </div>
        </div>

        {done && (
          <ListFilters action="/hospital" hidden={{ show: "done" }} f={f} facilities={facilities}
            periodLabel="ช่วงเวลาที่รับเรื่อง" clearHref="/hospital?show=done" />
        )}

        {!done && waiting > alerts.length && (
          <div className="card pad" style={{ color: "var(--hi)", fontWeight: 600 }}>
            แสดง {num(alerts.length)} เคสที่รอนานที่สุด ยังมีเคสรออีก {num(waiting - alerts.length)} เคส รับเรื่องเคสด้านบนแล้วเคสที่เหลือจะขึ้นมาเอง
          </div>
        )}

        {/* One table, like an institutional work list: no coloured side bars, reasons as plain text. */}
        <div className="card" style={{ overflowX: "auto" }}>
          <table className={`plist inbox${done ? "" : " urgent"}`}>
            <thead>
              <tr>
                <th>เวลาแจ้ง</th>
                <th>ผู้ป่วย</th>
                <th>จาก</th>
                <th>เหตุผลที่แจ้งเตือน</th>
                <th style={{ textAlign: "right" }}>{done ? "รับเรื่อง" : ""}</th>
              </tr>
            </thead>
            <tbody>
              {done
                ? alerts.map((s) => <AlertRow key={s.id} s={s} />)
                : groupWaiting(alerts).map((g) => (
                    <Fragment key={g.group}>
                      <tr className="grp">
                        <td colSpan={5}>{g.label} <span>{g.items.length} เคส</span></td>
                      </tr>
                      {g.items.map((s) => <AlertRow key={s.id} s={s} />)}
                    </Fragment>
                  ))}
              {alerts.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "var(--muted)", padding: 28 }}>
                    {done ? (hasFilters(f) ? "ไม่พบเคสตามที่ค้นหา" : "ยังไม่มีเคสที่รับเรื่อง") : "ไม่มีเคสที่รอรับเรื่อง"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {done && <Pager pg={pg} href={pageHref} />}
        {!done && <div className="note">หน้านี้อัปเดตเองทุก 10 วินาที ช่องทาง LINE รอ รพ. ยืนยันกลุ่มผู้รับ</div>}
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

function AlertRow({ s }: { s: Alert }) {
  return (
    <tr>
      <td className="when">
        {s.alertRaisedAt ? whenText(s.alertRaisedAt) : ""}
        {!s.acknowledgedAt && s.alertRaisedAt && <div className="waited">{waitedText(s.alertRaisedAt)}</div>}
      </td>
      <td>
        <Link href={`/hospital/patients/${s.patientId}`} className="name-link">{s.patient.name}</Link>
        <div className="note">HN {s.patient.hn ?? "ยังไม่มี"} {s.patient.sex} {ageFromThaiDob(s.patient.dob)} ปี</div>
      </td>
      <td>
        {s.patient.facility}
        <div className="note">{s.screener.displayName}</div>
      </td>
      <td>
        <ul className="reasons">
          {alertReasons(s).map((r) => (
            // Dose problems (Part 1) need the doctor first: bold red.
            <li key={r} className={r.startsWith("เสี่ยง MALA") ? undefined : "dose"}>{r}</li>
          ))}
        </ul>
      </td>
      <td className="act">
        {s.acknowledgedAt ? (
          <div className="note" style={{ textAlign: "right" }}>
            {s.acknowledgedBy?.displayName}
            <br />
            {thaiDateTime(s.acknowledgedAt)}
          </div>
        ) : (
          <form action={acknowledgeAlert.bind(null, s.id)}>
            <button className="btn-s take" type="submit">รับเรื่อง</button>
          </form>
        )}
        <Link href={`/hospital/cases/${s.id}`} className="btn-s">ดูเคส</Link>
      </td>
    </tr>
  );
}
