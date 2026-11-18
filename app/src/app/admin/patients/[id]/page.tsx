// /admin/patients/[id] — everything about one patient for the hospital admin: identity check,
// edit with a reason, every screening at every unit (each can be corrected with a reason), and
// the full change history with old and new values, dates and times.
// Layout (built to stay tidy as the history grows): a top row with who the patient is, the key
// dates and the on/off switch; below it, full width, the two histories as tabs, each table one or
// two lines per row and folded after 10 rows ("ดูเพิ่มอีก").
import Link from "next/link";
import { notFound } from "next/navigation";
import { Topbar } from "@/components/topbar";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { ageFromThaiDob, cardIdChecksumOk, formatCardId, thaiDate, thaiDateTime } from "@/lib/format";
import { AmendScreeningForm } from "./amend-form";
import { PatientEditCard } from "./patient-edit";
import { ActiveToggle, FoldRows, Tabs, Timeline, VerifyBox, type TimelineItem } from "./patient-panels";

// "14:05 น."
const timeOf = (d: Date) => thaiDateTime(d).slice(thaiDate(d).length).trim();
// errors from the edit form are shown at their box in the card, not in the banner
const EDIT_ERRORS = ["name", "dob", "sex", "card", "carddup", "hn", "hndup", "phone"];
import { safeBack } from "@/lib/back-link";
import { requireAdmin } from "@/lib/session";
import { amendScreening, setPatientActive, updatePatient, verifyPatient } from "../actions";

const MSG: Record<string, string> = {
  verified: "ยืนยันตัวตนผู้ป่วยแล้ว", saved: "บันทึกแล้ว", nochange: "ไม่มีข้อมูลที่เปลี่ยน",
  reason: "กรุณากรอกเหตุผลที่แก้ไข", hn: "HN ใช้ได้เฉพาะตัวเลข คั่นด้วย - หรือ / ยาวไม่เกิน 15 ตัว", phone: "เบอร์โทรต้องขึ้นต้นด้วย 0 และมี 9 หลัก (บ้าน) หรือ 10 หลัก (มือถือ)", hndup: "HN นี้เป็นของผู้ป่วยคนอื่นแล้ว",
  card: "เลขประจำตัวประชาชนต้องมี 13 หลัก", carddup: "เลขประจำตัวประชาชนนี้เป็นของผู้ป่วยคนอื่นแล้ว",
  name: "ชื่อไม่ถูกต้อง", dob: "วันเกิดต้องเป็น วว/ดด/ปปปป (พ.ศ.)", sex: "กรุณาเลือกเพศ", values: "ค่าที่กรอกไม่อยู่ในช่วงที่เป็นไปได้",
};
const FIELD_TH: Record<string, string> = {
  name: "ชื่อ", dob: "วันเกิด", sex: "เพศ", phone: "เบอร์โทร", cardId: "เลขประจำตัวประชาชน", hn: "HN", facility: "หน่วยประจำ", active: "สถานะใช้งาน",
  weightKg: "น้ำหนัก", heightCm: "ส่วนสูง", egfr: "eGFR", doseMgDay: "ขนาดยา", drinksAlcohol: "ดื่มแอลกอฮอล์", bingeDrinking: "ดื่มหนักครั้งเดียว",
  regularHeavyDrinking: "ดื่มหนักต่อเนื่อง", vomiting: "อาเจียน/ท้องเสีย", lowIntake: "ทานได้น้อย", nsaid: "ยาแก้ปวด/ยาชุด", herbal: "สมุนไพร",
  nsaidNote: "ชื่อยาที่ระบุ", herbalNote: "สมุนไพรที่ระบุ", isAlert: "แจ้งเตือน", alertKind: "ประเภทแจ้งเตือน", riskScore: "คะแนน", followUpNote: "การดำเนินการของแพทย์",
};

export default async function AdminPatient({ params, searchParams }: PageProps<"/admin/patients/[id]">) {
  const user = await requireAdmin();
  const id = Number((await params).id);
  const sp = await searchParams;
  const p = Number.isInteger(id)
    ? await db.patient.findUnique({
        where: { id },
        include: {
          createdBy: true, verifiedBy: true,
          screenings: { orderBy: { createdAt: "desc" }, include: { screener: true, confirmedBy: true, acknowledgedBy: true } },
        },
      })
    : null;
  if (!p) notFound();
  const history = await db.amendment.findMany({ where: { patientId: id }, orderBy: { at: "desc" }, include: { by: true } });
  const facilities = (await db.facility.findMany({ where: { active: true }, orderBy: { name: "asc" } })).map((f) => f.name);
  await audit({ user, action: "hospital.patient.history.view", entity: "Patient", entityId: id, detail: `screenings=${p.screenings.length}` });
  const ok = typeof sp.ok === "string" ? MSG[sp.ok] : null;
  const errCode = typeof sp.err === "string" ? sp.err : "";
  const editErr = EDIT_ERRORS.includes(errCode) ? MSG[errCode] : null;
  const verifyErr = errCode === "vhn" ? MSG.hn : errCode === "vhndup" ? MSG.hndup : null;
  const amendErr = Number(sp.s) > 0 && ["reason", "values"].includes(errCode);
  const err = errCode && !editErr && !verifyErr && !amendErr ? MSG[errCode] : null;
  const openScreening = Number(sp.s);
  // where "กลับ" goes: the exact list the admin came from (tab, search, page), else the full list
  const backTo = safeBack(sp.back, "/admin/patients") || "/admin/patients";
  const keep = `back=${encodeURIComponent(backTo)}`;

  const status = !p.active ? <span className="ui-badge muted">ปิดใช้งาน</span> : p.status === "pending" ? <span className="ui-badge warn">รอยืนยันตัวตน</span> : <span className="ui-badge ok">ยืนยันแล้ว</span>;
  const whenOf = new Map(p.screenings.map((s) => [s.id, thaiDate(s.createdAt)]));

  const screeningRows = p.screenings.map((s) => {
    const edited = s.updatedAt.getTime() - s.createdAt.getTime() > 1000;
    const notes = [s.nsaidNote, s.herbalNote].filter(Boolean).join(", ");
    return (
      <tr key={s.id}>
        <td><b>{thaiDate(s.createdAt)}</b><span className="sub-line">{timeOf(s.createdAt)} โดย {s.screener.displayName}</span></td>
        <td>{s.facility}{notes ? <span className="sub-line" title={notes}>ระบุยาหรือสมุนไพร</span> : null}</td>
        <td className="num">{s.egfr}</td>
        <td className="num">{s.doseMgDay}</td>
        <td className="num">{s.bmi.toFixed(1)}</td>
        <td>
          <span className={`ui-badge ${s.alertKind === "dose" ? "hi" : s.isAlert ? "warn" : "ok"}`}>{s.alertKind === "dose" ? "ใช้ยาเกินขนาด" : s.isAlert ? "เสี่ยงทั่วไป" : "ไม่แจ้งเตือน"}</span>
          <span className="sub-line" title={`เกณฑ์ ${s.ruleVersion}`}>{s.riskScore} คะแนน{edited ? " แก้ไขแล้ว" : ""}</span>
        </td>
        <td>
          {s.confirmedAt ? <span>ปิดเคสแล้ว</span> : <span className="pa-open">ยังไม่ปิดเคส</span>}
          <span className="sub-line">{s.acknowledgedAt ? "รพ. รับเรื่องแล้ว" : s.confirmedAt ? thaiDate(s.confirmedAt) : ""}</span>
        </td>
        <td>
          <div className="pa-row-btns">
            <Link href={`/hospital/cases/${s.id}`} className="ui-btn secondary sm">ดูเคส</Link>
            <Link href={`/admin/patients/${p.id}?s=${s.id}&${keep}`} scroll={false} className="ui-btn secondary sm">แก้ไขผล</Link>
          </div>
        </td>
      </tr>
    );
  });

  const historyRows = history.map((h) => (
    <tr key={h.id}>
      <td><b>{thaiDate(h.at)}</b><span className="sub-line">{timeOf(h.at)} โดย {h.by.displayName}</span></td>
      <td>{FIELD_TH[h.field] ?? h.field}<span className="sub-line">{h.entity === "Screening" ? `ผลคัดกรองวันที่ ${whenOf.get(h.entityId) ?? `#${h.entityId}`}` : "ข้อมูลผู้ป่วย"}</span></td>
      <td><span className="pa-old">{h.oldValue ?? "ว่าง"}</span><span className="pa-arrow">→</span><b>{h.newValue ?? "ว่าง"}</b></td>
      <td className="pa-reason" title={h.reason}>{h.reason}</td>
    </tr>
  ));

  const amending = p.screenings.find((s) => s.id === openScreening);

  // "วันและเวลา": every event, newest first. Edits saved together (same moment, same person)
  // are one line listing the fields; switching off / on is its own line.
  type Ev = TimelineItem & { t: number };
  const events: Ev[] = [
    { t: p.registeredAt.getTime(), at: p.registeredAt.toISOString(), when: thaiDateTime(p.registeredAt), text: "ลงทะเบียนในระบบ", who: p.createdBy.displayName, kind: "create" },
    ...(p.verifiedAt ? [{ t: p.verifiedAt.getTime(), at: p.verifiedAt.toISOString(), when: thaiDateTime(p.verifiedAt), text: "ยืนยันตัวตน", who: p.verifiedBy?.displayName, kind: "verify" as const }] : []),
    ...p.screenings.map((s) => ({ t: s.createdAt.getTime(), at: s.createdAt.toISOString(), when: thaiDateTime(s.createdAt), text: `คัดกรองที่ ${s.facility}`, who: s.screener.displayName, kind: "screen" as const })),
  ];
  const saves = new Map<string, typeof history>();
  for (const h of history) {
    if (h.field === "hn" && h.reason === "ยืนยันตัวตนผู้ป่วย") continue; // already the "ยืนยันตัวตน" line
    const key = `${Math.floor(h.at.getTime() / 2000)}|${h.byId}|${h.entity}|${h.entityId}`;
    saves.set(key, [...(saves.get(key) ?? []), h]);
  }
  for (const rows of saves.values()) {
    const h = rows[0];
    const onoff = rows.find((r) => r.field === "active");
    const fields = [...new Set(rows.filter((r) => r.field !== "active").map((r) => FIELD_TH[r.field] ?? r.field))];
    const what = onoff
      ? onoff.newValue === "false" ? "ปิดใช้งานผู้ป่วย" : "เปิดใช้งานผู้ป่วยอีกครั้ง"
      : h.entity === "Screening" ? `แก้ไขผลคัดกรองวันที่ ${whenOf.get(h.entityId) ?? `#${h.entityId}`} (${fields.join(", ")})` : `แก้ไข${/^[A-Za-z]/.test(fields[0] ?? "") ? " " : ""}${fields.join(", ")}`;
    events.push({ t: h.at.getTime(), at: h.at.toISOString(), when: thaiDateTime(h.at), text: what, who: h.by.displayName, kind: onoff ? (onoff.newValue === "false" ? "off" : "on") : "edit" });
  }
  const timeline: TimelineItem[] = events.sort((a, b) => b.t - a.t).map((e) => ({ at: e.at, when: e.when, text: e.text, who: e.who, kind: e.kind }));

  return (
    <>
      <Topbar menu="apatients" crumb="จัดการข้อมูลผู้ป่วย" />
      <main className="ui-page">
        {/* stays on screen while scrolling: who this is, and the way back */}
        <div className="ui-sticky">
          <div className="ui-head">
            <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
              <Link href={backTo} className="ui-btn secondary" title="กลับไปรายชื่อผู้ป่วย">‹ กลับ</Link>
              <div style={{ minWidth: 0 }}>
                <h1 className="ui-title" style={{ fontSize: 22 }}>{p.name}</h1>
                <p className="ui-subtitle pa-sub">{p.sex} อายุ {ageFromThaiDob(p.dob)} ปี {status}</p>
              </div>
            </div>
            <Link href={`/hospital/patients/${p.id}`} className="ui-btn secondary">ดูมุมมองแพทย์</Link>
          </div>
        </div>
        {ok && <div className="flash">{ok}</div>}
        {err && <div className="flash bad">{err}</div>}

        {/* top: who the patient is (left), key dates and on/off (right) */}
        <div className="pa-top">
            <PatientEditCard
              patient={{ name: p.name, cardId: p.cardId, hn: p.hn ?? "", dob: p.dob, sex: p.sex, phone: p.phone ?? "", facility: p.facility ?? "" }}
              facilities={facilities} action={updatePatient.bind(null, p.id)} backTo={backTo}
              serverError={editErr ? { code: String(sp.err), message: editErr } : undefined}
              notice={p.status === "pending" && p.active ? (
                <VerifyBox name={p.name} cardId={formatCardId(p.cardId)} checksumOk={cardIdChecksumOk(p.cardId)} hn={p.hn ?? ""}
                  action={verifyPatient.bind(null, p.id)} backTo={backTo} serverError={verifyErr ?? undefined} />
              ) : undefined}
              actions={<ActiveToggle active={p.active} name={p.name} action={setPatientActive.bind(null, p.id, !p.active)} backTo={backTo} />} />

            <div className="pa-side">
            <Timeline items={timeline} />

            </div>
        </div>

        {/* below, full width: what needs doing first, then the histories */}
        <div className="pa-main">

            {amending && (
              <AmendScreeningForm key={amending.id}
                screening={{
                  weightKg: amending.weightKg, heightCm: amending.heightCm, egfr: amending.egfr, doseMgDay: amending.doseMgDay,
                  drinksAlcohol: amending.drinksAlcohol, bingeDrinking: amending.bingeDrinking, regularHeavyDrinking: amending.regularHeavyDrinking,
                  vomiting: amending.vomiting, lowIntake: amending.lowIntake, nsaid: amending.nsaid, herbal: amending.herbal,
                  nsaidNote: amending.nsaidNote, herbalNote: amending.herbalNote,
                }}
                title={`แก้ไขผลคัดกรองวันที่ ${thaiDateTime(amending.createdAt)}`} facility={amending.facility} ruleVersion={amending.ruleVersion}
                action={amendScreening.bind(null, p.id, amending.id)} backTo={backTo} cancelHref={`/admin/patients/${p.id}?${keep}`}
                serverError={["reason", "values"].includes(errCode) ? MSG[errCode] : undefined} />
            )}

            <Tabs tabs={[
              {
                label: "ประวัติการคัดกรอง", count: p.screenings.length,
                body: (
                  <div className="ui-table-wrap">
                    <table className="ui-table pa-table">
                      <colgroup><col /><col style={{ width: 170 }} /><col style={{ width: 72 }} /><col style={{ width: 84 }} /><col style={{ width: 72 }} /><col style={{ width: 150 }} /><col style={{ width: 140 }} /><col style={{ width: 176 }} /></colgroup>
                      <thead><tr><th>คัดกรองเมื่อ</th><th>หน่วยที่ตรวจ</th><th className="num">eGFR</th><th className="num">ยา มก.</th><th className="num">BMI</th><th>ผล</th><th>สถานะเคส</th><th /></tr></thead>
                      <FoldRows rows={screeningRows} cols={8} empty="ยังไม่เคยคัดกรอง" />
                    </table>
                  </div>
                ),
              },
              {
                label: "ประวัติการแก้ไขข้อมูล", count: history.length,
                body: (
                  <div className="ui-table-wrap">
                    <table className="ui-table pa-table">
                      <colgroup><col style={{ width: 210 }} /><col style={{ width: 190 }} /><col /><col style={{ width: "28%" }} /></colgroup>
                      <thead><tr><th>เมื่อ</th><th>รายการ</th><th>ค่าเดิม → ค่าใหม่</th><th>เหตุผล</th></tr></thead>
                      <FoldRows rows={historyRows} cols={4} empty="ยังไม่เคยแก้ไข" />
                    </table>
                  </div>
                ),
              },
            ]} />
        </div>
      </main>
    </>
  );
}
