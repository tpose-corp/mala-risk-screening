"use client";
// The unit list on /admin/facilities, laid out like the users page. Every change goes through a
// popup that says what will happen before it happens:
// - "เพิ่มหน่วยบริการ": name and 5-digit code
// - "แก้ไข": fix a wrong name or code; the popup counts the accounts, patients and screenings
//   that will show the new name
// - "ปิดหน่วย": choose where the unit's patients and staff accounts go (see actions.ts);
//   refused while the unit has an open case
// - "เปิดอีกครั้ง": a short confirm
// A wrong or empty box is marked, focused and shaken; the mark clears as soon as it is fixed.
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { Modal } from "@/components/ui/modal";
import { PlusIcon } from "@/components/ui/icons";
import { closeFacility, createFacility, renameFacility, reopenFacility, type FacilityResult } from "./actions";

export type FacilityRow = {
  id: number; name: string; code: string | null; active: boolean; updated: string;
  users: number; patients: number; open: number; screenings: number;
};
type Dialog =
  | { kind: "add" }
  | { kind: "edit"; f: FacilityRow }
  | { kind: "close"; f: FacilityRow }
  | { kind: "reopen"; f: FacilityRow };

// scroll to the first marked box inside the popup, focus it and make it shake
function useJumpToError(errors: Record<string, string>) {
  const ref = useRef<HTMLDivElement>(null);
  const key = Object.keys(errors).join(",");
  useEffect(() => {
    if (!key) return;
    const first = ref.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (!first) return;
    const box = (first.closest(".fac-field") ?? first) as HTMLElement;
    box.scrollIntoView({ block: "nearest" });
    box.classList.remove("err-flash");
    void box.offsetWidth;
    box.classList.add("err-flash");
    first.focus({ preventScroll: true });
  }, [key]);
  return ref;
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="fac-field">
      <label className="lbl" htmlFor={id}>{label}</label>
      {children}
      {error && <div className="err">{error}</div>}
    </div>
  );
}

export function FacilitiesManager({ rows, activeUnits }: { rows: FacilityRow[]; activeUnits: { id: number; name: string }[] }) {
  const router = useRouter();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const done = (msg: string) => { setDialog(null); setFlash(msg); router.refresh(); };

  return (
    <>
      {flash && <div className="flash" role="status">{flash}</div>}
      <section className="ui-card">
        <div className="ui-card-head">
          <div className="ui-card-title">หน่วยบริการทั้งหมด<span className="ui-card-count">{rows.length} หน่วย</span></div>
          <div className="ui-card-actions">
            <button type="button" className="ui-btn primary sm" onClick={() => { setFlash(null); setDialog({ kind: "add" }); }}><PlusIcon /> เพิ่มหน่วยบริการ</button>
          </div>
        </div>
        <div className="ui-table-wrap sticky-head">
          <table className="ui-table">
            <thead><tr><th>หน่วยบริการ</th><th>สถานะ</th><th>บัญชีเจ้าหน้าที่</th><th>ผู้ป่วยประจำ</th><th>เคสค้าง</th><th>แก้ไขล่าสุด</th><th /></tr></thead>
            <tbody>
              {rows.map((f) => (
                <tr key={f.id} className={f.active ? "" : "off"}>
                  <td style={{ whiteSpace: "nowrap" }}><b>{f.name}</b><span className="sub-line">{f.code ? `รหัส ${f.code}` : "ไม่มีรหัสหน่วย"}</span></td>
                  <td>{f.active ? <span className="ui-badge ok">เปิดใช้งาน</span> : <span className="ui-badge muted">ปิดแล้ว</span>}</td>
                  <td>{f.users} บัญชี</td>
                  <td>{f.patients} คน</td>
                  <td>{f.open ? <span className="ui-badge warn">{f.open} เคส</span> : <span className="fac-none">ไม่มี</span>}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{f.updated}</td>
                  <td>
                    <div className="fac-actions">
                      <button type="button" className="ui-btn secondary sm" onClick={() => { setFlash(null); setDialog({ kind: "edit", f }); }}>แก้ไข</button>
                      {f.active
                        ? <button type="button" className="ui-btn secondary sm fac-close" onClick={() => { setFlash(null); setDialog({ kind: "close", f }); }}>ปิดหน่วย</button>
                        : <button type="button" className="ui-btn secondary sm" onClick={() => { setFlash(null); setDialog({ kind: "reopen", f }); }}>เปิดอีกครั้ง</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="ui-empty">ไม่มีหน่วยบริการในกลุ่มนี้</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {dialog?.kind === "add" && <EditDialog onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.kind === "edit" && <EditDialog f={dialog.f} onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.kind === "close" && <CloseDialog f={dialog.f} units={activeUnits.filter((u) => u.id !== dialog.f.id)} onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.kind === "reopen" && <ReopenDialog f={dialog.f} onClose={() => setDialog(null)} onDone={done} />}
    </>
  );
}

// Add a unit, or fix the name/code of one.
function EditDialog({ f, onClose, onDone }: { f?: FacilityRow; onClose: () => void; onDone: (msg: string) => void }) {
  const [name, setName] = useState(f?.name ?? "");
  const [code, setCode] = useState(f?.code ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const ref = useJumpToError(errors);
  const clear = (k: string) => setErrors((e) => { const n = { ...e }; delete n[k]; delete n.form; return n; });

  const nameChanged = !!f && name.trim() !== f.name;
  function submit() {
    const local: Record<string, string> = {};
    if (name.trim().length < 3) local.name = "กรุณากรอกชื่อหน่วยบริการ อย่างน้อย 3 ตัวอักษร";
    if (code.trim() && !/^\d{5}$/.test(code.trim())) local.code = "รหัสหน่วยบริการต้องเป็นตัวเลข 5 หลัก หรือเว้นว่าง";
    if (Object.keys(local).length) { setErrors(local); return; }
    start(async () => {
      const r: FacilityResult = f ? await renameFacility({ id: f.id, name, code }) : await createFacility({ name, code });
      if (r.errors) setErrors(r.errors); else onDone(r.ok ?? "บันทึกแล้ว");
    });
  }

  return (
    <Modal title={f ? `แก้ไขหน่วยบริการ` : "เพิ่มหน่วยบริการ"} onClose={onClose} closeLabel="ยกเลิก"
      actions={<button type="button" className="ui-btn primary" disabled={pending} onClick={submit}>{pending ? "กำลังบันทึก..." : f ? "บันทึกการแก้ไข" : "เพิ่มหน่วยบริการ"}</button>}>
      <div ref={ref} className="fac-form" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}>
        <Field id="fac-name" label="ชื่อหน่วยบริการ *" error={errors.name}>
          <input className={`fld${errors.name ? " bad" : ""}`} id="fac-name" value={name} maxLength={120} placeholder="เช่น รพ.สต.บ้านใหม่" autoFocus
            onChange={(e) => { setName(e.target.value); clear("name"); }} aria-invalid={!!errors.name} />
        </Field>
        <Field id="fac-code" label="รหัสหน่วยบริการ 5 หลัก" error={errors.code}>
          <input className={`fld mono${errors.code ? " bad" : ""}`} id="fac-code" value={code} inputMode="numeric" maxLength={5} placeholder="ถ้ามี"
            onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); clear("code"); }} aria-invalid={!!errors.code} />
        </Field>
        {f && nameChanged && (
          <p className="fac-impact">
            ชื่อใหม่จะแสดงแทนชื่อเดิมทันที ทั้งในบัญชีเจ้าหน้าที่ {f.users} บัญชี ผู้ป่วยประจำ {f.patients} คน
            และผลคัดกรอง {f.screenings} รายการของหน่วยนี้ ใช้สำหรับแก้ชื่อที่พิมพ์ผิดหรือหน่วยที่เปลี่ยนชื่อ
            ถ้าเป็นคนละหน่วยกัน ให้เพิ่มหน่วยใหม่แทน
          </p>
        )}
        {errors.form && <div className="flash bad" role="alert">{errors.form}</div>}
      </div>
    </Modal>
  );
}

// Close a unit: what happens to its patients and accounts, then confirm.
function CloseDialog({ f, units, onClose, onDone }: { f: FacilityRow; units: { id: number; name: string }[]; onClose: () => void; onDone: (msg: string) => void }) {
  const [patients, setPatients] = useState<"move" | "keep">("move");
  const [accounts, setAccounts] = useState<"move" | "disable">("move");
  const [target, setTarget] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const ref = useJumpToError(errors);
  const clear = (k: string) => setErrors((e) => { const n = { ...e }; delete n[k]; return n; });

  if (f.open > 0) {
    return (
      <Modal title={`ยังปิด ${f.name} ไม่ได้`} tone="warn" onClose={onClose} closeLabel="เข้าใจแล้ว">
        <p>หน่วยนี้ยังมีเคสที่ยังไม่ยืนยันปิดเคส <b>{f.open} เคส</b> ต้องให้เจ้าหน้าที่ของหน่วยปิดเคสให้ครบก่อน แล้วจึงปิดหน่วยได้</p>
      </Modal>
    );
  }

  const needTarget = (patients === "move" && f.patients > 0) || (accounts === "move" && f.users > 0);
  function submit() {
    const local: Record<string, string> = {};
    if (needTarget && !target) local.target = "กรุณาเลือกหน่วยบริการที่จะย้ายไป";
    if (!reason.trim()) local.reason = "กรุณากรอกเหตุผลที่ปิดหน่วย";
    if (Object.keys(local).length) { setErrors(local); return; }
    start(async () => {
      const r = await closeFacility({ id: f.id, patients, accounts, target: target ? Number(target) : null, reason });
      if (r.errors) setErrors(r.errors); else onDone(r.ok ?? "ปิดหน่วยแล้ว");
    });
  }

  return (
    <Modal title={`ปิด ${f.name}`} onClose={onClose} closeLabel="ยกเลิก" closePrimary
      actions={<button type="button" className="ui-btn secondary fac-close" disabled={pending} onClick={submit}>{pending ? "กำลังปิด..." : "ยืนยันปิดหน่วย"}</button>}>
      <div ref={ref} className="fac-form">
        <p>หน่วยที่ปิดจะไม่อยู่ในรายการให้เลือกอีก ข้อมูลไม่ถูกลบ และเปิดกลับได้ภายหลัง</p>

        <div className="fac-two">
        {f.patients > 0 && (
          <fieldset className="fac-choice">
            <legend>ผู้ป่วยประจำหน่วยนี้ {f.patients} คน</legend>
            <label className="ui-chip"><input type="radio" name="patients" checked={patients === "move"} onChange={() => setPatients("move")} />ย้ายไปหน่วยอื่น</label>
            <label className="ui-chip"><input type="radio" name="patients" checked={patients === "keep"} onChange={() => setPatients("keep")} />เก็บไว้กับหน่วยนี้</label>
            {patients === "keep" && <p className="fac-hint">ผู้ป่วยจะยังอยู่กับหน่วยที่ปิดแล้ว ไม่มี รพ.สต. ไหนคัดกรองได้ จนกว่าจะย้ายทีละคนที่หน้าจัดการผู้ป่วย</p>}
          </fieldset>
        )}
        {f.users > 0 && (
          <fieldset className="fac-choice">
            <legend>บัญชีเจ้าหน้าที่ที่ใช้งานอยู่ {f.users} บัญชี</legend>
            <label className="ui-chip"><input type="radio" name="accounts" checked={accounts === "move"} onChange={() => setAccounts("move")} />ย้ายไปหน่วยอื่น</label>
            <label className="ui-chip"><input type="radio" name="accounts" checked={accounts === "disable"} onChange={() => setAccounts("disable")} />ปิดการใช้งานบัญชี</label>
            {accounts === "disable" && <p className="fac-hint">เจ้าหน้าที่จะถูกออกจากระบบทันทีและเข้าใช้ไม่ได้ เปิดบัญชีกลับได้ที่หน้าบัญชีผู้ใช้</p>}
          </fieldset>
        )}
        </div>
        <div className="fac-two">
        {needTarget && (
          <Field id="fac-target" label="ย้ายไปที่หน่วยบริการ *" error={errors.target}>
            <select className={`fld${errors.target ? " bad" : ""}`} id="fac-target" value={target} onChange={(e) => { setTarget(e.target.value); clear("target"); }} aria-invalid={!!errors.target}>
              <option value="">เลือกหน่วยบริการ</option>
              {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </Field>
        )}
        <Field id="fac-reason" label="เหตุผลที่ปิดหน่วย *" error={errors.reason}>
          <input className={`fld${errors.reason ? " bad" : ""}`} id="fac-reason" value={reason} maxLength={300} placeholder="เช่น เพิ่มซ้ำ ใช้ รพ.สต.บ้านดู่ แทน"
            onChange={(e) => { setReason(e.target.value); clear("reason"); }} aria-invalid={!!errors.reason} />
        </Field>
        </div>
        <p className="fac-hint">ผลคัดกรอง {f.screenings} รายการไม่ย้าย ยังบันทึกว่าคัดกรองที่ {f.name} ตามจริง</p>
        {errors.form && <div className="flash bad" role="alert">{errors.form}</div>}
      </div>
    </Modal>
  );
}

function ReopenDialog({ f, onClose, onDone }: { f: FacilityRow; onClose: () => void; onDone: (msg: string) => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <Modal title={`เปิด ${f.name} อีกครั้ง?`} onClose={onClose} closeLabel="ยกเลิก"
      actions={<button type="button" className="ui-btn primary" disabled={pending} onClick={() => start(async () => {
        const r = await reopenFacility({ id: f.id });
        if (r.errors) setError(r.errors.form ?? "เปิดหน่วยไม่สำเร็จ"); else onDone(r.ok ?? "เปิดหน่วยแล้ว");
      })}>{pending ? "กำลังเปิด..." : "เปิดหน่วยนี้"}</button>}>
      <p>หน่วยนี้จะกลับมาอยู่ในรายการให้เลือกตอนสร้างบัญชีและย้ายผู้ป่วย</p>
      <p>ผู้ป่วยหรือบัญชีที่เคยย้ายออกไปจะไม่ย้ายกลับเอง ถ้าต้องการให้ย้ายกลับ ต้องย้ายเองที่หน้าจัดการผู้ป่วยและหน้าบัญชีผู้ใช้</p>
      {error && <div className="flash bad" role="alert">{error}</div>}
    </Modal>
  );
}
