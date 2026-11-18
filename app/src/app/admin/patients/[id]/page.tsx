// /admin/patients/[id] — everything about one patient for the hospital admin: identity check,
// edit with a reason, every screening at every unit (each can be corrected with a reason), and
// the full change history with old and new values, dates and times.
import Link from "next/link";
import { notFound } from "next/navigation";
import { Topbar } from "@/components/topbar";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { ageFromThaiDob, cardIdChecksumOk, formatCardId, thaiDateTime } from "@/lib/format";
import { safeBack } from "@/lib/back-link";
import { requireAdmin } from "@/lib/session";
import { amendScreening, setPatientActive, updatePatient, verifyPatient } from "../actions";

const MSG: Record<string, string> = {
  verified: "ยืนยันตัวตนผู้ป่วยแล้ว", saved: "บันทึกแล้ว", nochange: "ไม่มีข้อมูลที่เปลี่ยน",
  reason: "กรุณากรอกเหตุผลที่แก้ไข", hn: "HN ใช้ได้เฉพาะตัวเลข คั่นด้วย - หรือ /", hndup: "HN นี้เป็นของผู้ป่วยคนอื่นแล้ว",
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
  const err = typeof sp.err === "string" ? MSG[sp.err] : null;
  const openScreening = Number(sp.s);
  // where "กลับ" goes: the exact list the admin came from (tab, search, page), else the full list
  const backTo = safeBack(sp.back, "/admin/patients") || "/admin/patients";
  const keep = `back=${encodeURIComponent(backTo)}`;
  const backField = <input type="hidden" name="back" value={backTo} />;

  return (
    <>
      <Topbar menu="apatients" crumb="จัดการข้อมูลผู้ป่วย" />
      <main className="page">
        {/* stays on screen while scrolling: who this is, and the way back */}
        <div className="ui-sticky">
          <div className="ui-head">
            <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
              <Link href={backTo} className="ui-btn secondary" title="กลับไปรายชื่อผู้ป่วย">‹ กลับ</Link>
              <div style={{ minWidth: 0 }}>
                <h1 className="ui-title" style={{ fontSize: 22 }}>{p.name}</h1>
                <p className="ui-subtitle">
                  {p.sex} อายุ {ageFromThaiDob(p.dob)} ปี HN {p.hn ?? "ยังไม่มี"} หน่วยประจำ {p.facility ?? "ยังไม่มี"}{" "}
                  {!p.active ? <span className="ui-badge muted">ปิดใช้งาน</span> : p.status === "pending" ? <span className="ui-badge warn">รอยืนยันตัวตน</span> : <span className="ui-badge ok">ยืนยันแล้ว</span>}
                </p>
              </div>
            </div>
            <Link href={`/hospital/patients/${p.id}`} className="ui-btn secondary">ดูมุมมองแพทย์</Link>
          </div>
        </div>
        {ok && <div className="flash">{ok}</div>}
        {err && <div className="flash bad">{err}</div>}

        <div className="card pad">
          <div className="sec-title">วันและเวลา</div>
          <ul className="timeline">
            <li><b>{thaiDateTime(p.registeredAt)}</b><span>ลงทะเบียนในระบบโดย {p.createdBy.displayName}</span></li>
            {p.verifiedAt && <li><b>{thaiDateTime(p.verifiedAt)}</b><span>ยืนยันตัวตนโดย {p.verifiedBy?.displayName}</span></li>}
            <li><b>{thaiDateTime(p.updatedAt)}</b><span>ข้อมูลผู้ป่วยแก้ไขล่าสุด</span></li>
          </ul>
        </div>

        {p.status === "pending" && (
          <form action={verifyPatient.bind(null, p.id)} className="card pad" style={{ display: "flex", flexDirection: "column", gap: 10, background: "var(--warn-soft)" }}>
            {backField}
            <div className="sec-title" style={{ margin: 0 }}>ยืนยันตัวตนผู้ป่วย</div>
            <div className="note">ตรวจเลขประจำตัวประชาชน <b className="mono">{formatCardId(p.cardId)}</b> {cardIdChecksumOk(p.cardId) ? "(เลขหลักสุดท้ายถูกต้องตามสูตร)" : "(เลขหลักสุดท้ายไม่ตรงตามสูตร กรุณาตรวจกับระบบ รพ.)"} กับระบบของ รพ. แล้วใส่ HN</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input className="fld mono" id="verifyHn" name="hn" required placeholder="HN จากระบบ รพ." defaultValue={p.hn ?? ""} style={{ maxWidth: 240 }} />
              <ConfirmSubmit mode="all" className="btn-s primary" label="ยืนยันตัวตนและบันทึก HN" title="ยืนยันตัวตนผู้ป่วย" confirmLabel="ยืนยันตัวตน"
                note={`${p.name} เลขบัตร ${formatCardId(p.cardId)} หลังยืนยันแล้ว เจ้าหน้าที่ รพ.สต. จะเห็นสถานะผู้ป่วยเป็นยืนยันแล้ว`} />
            </div>
          </form>
        )}

        <details className="box">
          <summary>แก้ไขข้อมูลผู้ป่วย หรือย้ายหน่วยบริการประจำ</summary>
          <form action={updatePatient.bind(null, p.id)} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
            {backField}
            <div className="form-grid">
              <div><label className="lbl" htmlFor="name">ชื่อ–นามสกุล</label><input className="fld" id="name" name="name" defaultValue={p.name} required /></div>
              <div><label className="lbl" htmlFor="cardId">เลขประจำตัวประชาชน</label><input className="fld mono" id="cardId" name="cardId" defaultValue={p.cardId} required inputMode="numeric" maxLength={17} pattern="[0-9๐-๙ \-]{13,17}" title="เลขประจำตัวประชาชน 13 หลัก" /></div>
              <div><label className="lbl" htmlFor="hn">HN</label><input className="fld mono" id="hn" name="hn" defaultValue={p.hn ?? ""} /></div>
              <div><label className="lbl" htmlFor="dob">วันเกิด (วว/ดด/ปปปป พ.ศ.)</label><input className="fld" id="dob" name="dob" defaultValue={p.dob} required /></div>
              <div>
                <label className="lbl" htmlFor="sex">เพศ</label>
                <select className="fld" id="sex" name="sex" defaultValue={p.sex}><option>หญิง</option><option>ชาย</option></select>
              </div>
              <div><label className="lbl" htmlFor="phone">เบอร์โทรศัพท์</label><input className="fld" id="phone" name="phone" defaultValue={p.phone ?? ""} /></div>
              <div>
                <label className="lbl" htmlFor="facility">หน่วยบริการประจำ</label>
                <select className="fld" id="facility" name="facility" defaultValue={p.facility ?? ""}>
                  <option value="">ยังไม่มี</option>
                  {facilities.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <div><label className="lbl" htmlFor="reason">เหตุผลที่แก้ไข *</label><input className="fld" id="reason" name="reason" required placeholder="เช่น รพ.สต. แจ้งว่าพิมพ์วันเกิดผิด / ผู้ป่วยย้ายที่อยู่" /></div>
            <ConfirmSubmit className="btn" label="บันทึกการแก้ไข" title="ตรวจสอบการแก้ไขข้อมูลผู้ป่วย" note="ค่าเดิมจะถูกเก็บไว้ในประวัติการแก้ไข" />
          </form>
        </details>

        <div className="card" style={{ overflowX: "auto" }}>
          <div className="sec-title" style={{ padding: "16px 16px 0" }}>ประวัติการคัดกรองทุกหน่วยบริการ ({p.screenings.length} ครั้ง)</div>
          <table className="grid">
            <thead><tr><th>คัดกรองเมื่อ</th><th>หน่วยที่ตรวจ</th><th>ค่าที่วัด</th><th>ผล</th><th>สถานะ</th><th /></tr></thead>
            <tbody>
              {p.screenings.map((s) => (
                <tr key={s.id}>
                  <td className="time">{thaiDateTime(s.createdAt)}<div className="note">โดย {s.screener.displayName}</div>{s.updatedAt.getTime() - s.createdAt.getTime() > 1000 && <div className="note">แก้ไข {thaiDateTime(s.updatedAt)}</div>}</td>
                  <td>{s.facility}</td>
                  <td>eGFR {s.egfr} ยา {s.doseMgDay} มก./วัน BMI {s.bmi.toFixed(1)}{(s.nsaidNote || s.herbalNote) && <div className="note">ระบุ: {[s.nsaidNote, s.herbalNote].filter(Boolean).join(", ")}</div>}</td>
                  <td><span className={`pill ${s.alertKind === "dose" ? "hi" : s.isAlert ? "warn" : "ok"}`}>{s.alertKind === "dose" ? "ใช้ยาเกินขนาด" : s.isAlert ? "เสี่ยงทั่วไป" : "ไม่แจ้งเตือน"}</span><div className="note">{s.riskScore} คะแนน เกณฑ์ {s.ruleVersion}</div></td>
                  <td className="time">
                    {s.confirmedAt ? `ยืนยัน ${thaiDateTime(s.confirmedAt)}` : "ยังไม่ยืนยัน"}
                    {s.acknowledgedAt && <div>รพ. รับเรื่อง {thaiDateTime(s.acknowledgedAt)}</div>}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link href={`/hospital/cases/${s.id}`} className="btn-s">ดูเคส</Link>{" "}
                    <Link href={`/admin/patients/${p.id}?s=${s.id}&${keep}#amend`} className="btn-s">แก้ไขผล</Link>
                  </td>
                </tr>
              ))}
              {p.screenings.length === 0 && <tr><td colSpan={6} className="note" style={{ textAlign: "center", padding: 20 }}>ยังไม่เคยคัดกรอง</td></tr>}
            </tbody>
          </table>
        </div>

        {p.screenings.filter((s) => s.id === openScreening).map((s) => (
          <form key={s.id} id="amend" action={amendScreening.bind(null, p.id, s.id)} className="card pad" style={{ display: "flex", flexDirection: "column", gap: 12, borderColor: "var(--acc-line)" }}>
            {backField}
            <div className="sec-title" style={{ margin: 0 }}>แก้ไขผลคัดกรองวันที่ {thaiDateTime(s.createdAt)} ({s.facility})</div>
            <div className="note">ระบบจะคำนวณผลใหม่ด้วยเกณฑ์เวอร์ชันเดิม ({s.ruleVersion}) และเก็บค่าเดิมไว้ในประวัติการแก้ไข</div>
            <div className="form-grid">
              <div><label className="lbl" htmlFor="weightKg">น้ำหนัก (กก.)</label><input className="fld" id="weightKg" name="weightKg" type="number" step="0.1" defaultValue={s.weightKg} required /></div>
              <div><label className="lbl" htmlFor="heightCm">ส่วนสูง (ซม.)</label><input className="fld" id="heightCm" name="heightCm" type="number" step="0.1" defaultValue={s.heightCm} required /></div>
              <div><label className="lbl" htmlFor="egfr">eGFR</label><input className="fld" id="egfr" name="egfr" type="number" step="0.1" defaultValue={s.egfr} required /></div>
              <div><label className="lbl" htmlFor="doseMgDay">ขนาดยา (มก./วัน)</label><input className="fld" id="doseMgDay" name="doseMgDay" type="number" step="250" defaultValue={s.doseMgDay} required /></div>
              {([["drinksAlcohol", "ดื่มแอลกอฮอล์"], ["bingeDrinking", "ดื่มหนักในครั้งเดียว"], ["regularHeavyDrinking", "ดื่มหนักต่อเนื่อง"], ["vomiting", "อาเจียน/ท้องเสีย"], ["lowIntake", "ทานได้น้อยลง"], ["nsaid", "ยาแก้ปวด/ยาชุด"], ["herbal", "สมุนไพร/อาหารเสริม"]] as const).map(([k, l]) => (
                <div key={k}>
                  <label className="lbl" htmlFor={k}>{l}</label>
                  <select className="fld" id={k} name={k} defaultValue={s[k] ? "yes" : "no"}><option value="no">ไม่ใช่</option><option value="yes">ใช่</option></select>
                </div>
              ))}
              <div><label className="lbl" htmlFor="nsaidNote">ชื่อยาที่ระบุ</label><input className="fld" id="nsaidNote" name="nsaidNote" defaultValue={s.nsaidNote ?? ""} /></div>
              <div><label className="lbl" htmlFor="herbalNote">สมุนไพรที่ระบุ</label><input className="fld" id="herbalNote" name="herbalNote" defaultValue={s.herbalNote ?? ""} /></div>
            </div>
            <div><label className="lbl" htmlFor="reason2">เหตุผลที่แก้ไข *</label><input className="fld" id="reason2" name="reason" required placeholder="เช่น รพ.สต. โทรแจ้งว่ากรอก eGFR ผิด" /></div>
            <div style={{ display: "flex", gap: 10 }}>
              <ConfirmSubmit className="btn" label="บันทึกการแก้ไขผลคัดกรอง" title="ตรวจสอบการแก้ไขผลคัดกรอง" note={`ระบบจะคำนวณผลใหม่ด้วยเกณฑ์ ${s.ruleVersion} และเก็บค่าเดิมไว้ในประวัติการแก้ไข`} />
              <Link href={`/admin/patients/${p.id}?${keep}`} className="btn-s">ยกเลิก</Link>
            </div>
          </form>
        ))}

        <div className="card" style={{ overflowX: "auto" }}>
          <div className="sec-title" style={{ padding: "16px 16px 0" }}>ประวัติการแก้ไขข้อมูล</div>
          <table className="grid">
            <thead><tr><th>เมื่อ</th><th>โดย</th><th>รายการ</th><th>ค่าเดิม</th><th>ค่าใหม่</th><th>เหตุผล</th></tr></thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td className="time">{thaiDateTime(h.at)}</td>
                  <td>{h.by.displayName}</td>
                  <td>{FIELD_TH[h.field] ?? h.field}{h.entity === "Screening" && <div className="note">ผลคัดกรอง #{h.entityId}</div>}</td>
                  <td className="note">{h.oldValue ?? "ว่าง"}</td>
                  <td>{h.newValue ?? "ว่าง"}</td>
                  <td>{h.reason}</td>
                </tr>
              ))}
              {history.length === 0 && <tr><td colSpan={6} className="note" style={{ textAlign: "center", padding: 20 }}>ยังไม่เคยแก้ไข</td></tr>}
            </tbody>
          </table>
        </div>

        <form action={setPatientActive.bind(null, p.id, !p.active)} className="card pad" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          {backField}
          <div style={{ flex: 1, minWidth: 240 }}>
            <label className="lbl" htmlFor="reason3">{p.active ? "ปิดใช้งานผู้ป่วยรายนี้ (ข้อมูลไม่ถูกลบ)" : "เปิดใช้งานผู้ป่วยรายนี้อีกครั้ง"} เหตุผล *</label>
            <input className="fld" id="reason3" name="reason" required placeholder="เช่น ลงทะเบียนซ้ำ / ผู้ป่วยเสียชีวิต" />
          </div>
          <ConfirmSubmit mode="all" className={`btn-s${p.active ? "" : " primary"}`} label={p.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
            title={p.active ? "ปิดใช้งานผู้ป่วยรายนี้" : "เปิดใช้งานผู้ป่วยรายนี้"} confirmLabel={p.active ? "ยืนยันปิดใช้งาน" : "ยืนยันเปิดใช้งาน"}
            note={p.active ? `${p.name} จะไม่แสดงในรายชื่อของ รพ.สต. ข้อมูลไม่ถูกลบ และเปิดใช้งานกลับได้` : `${p.name} จะกลับมาแสดงในรายชื่อของ รพ.สต.`} />
        </form>
      </main>
    </>
  );
}
