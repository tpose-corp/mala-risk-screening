"use client";
// Alcohol questions in everyday words. The screener asks what / how much / how often, and the
// app converts it to standard drinks (src/lib/alcohol.ts) to pre-answer the checklist's two
// questions. The screener can still change either answer (e.g. the session lasted > 2 hours).
//
// Sent to the server under the same names as before: drinksAlcohol, bingeDrinking, regularHeavyDrinking.

import { useEffect, useRef, useState } from "react";
import { DRINK_UNITS, assessDrinking, type DrinkRow } from "@/lib/alcohol";

const GROUPS = [...new Set(DRINK_UNITS.map((u) => u.group))];
const DAYS = [
  { v: 0.5, label: "นานๆ ครั้ง" },
  { v: 1, label: "1 วัน" },
  { v: 2, label: "2 วัน" },
  { v: 3, label: "3 วัน" },
  { v: 4, label: "4 วัน" },
  { v: 5, label: "5 วัน" },
  { v: 6, label: "เกือบทุกวัน" },
  { v: 7, label: "ทุกวัน" },
];

type YN = "yes" | "no";
type Row = { key: number; unitId: string; amount: string };
let nextKey = 1; // each row gets its own React key, so deleting a middle row can't mix rows up
const newRow = (): Row => ({ key: nextKey++, unitId: "", amount: "" });

export function AlcoholSection({ sex, error }: { sex: string; error?: string }) {
  const [drinks, setDrinks] = useState<YN>("no");
  const [rows, setRows] = useState<Row[]>(() => [newRow()]);
  const [days, setDays] = useState<number | null>(null);
  // Manual answers win over the calculated ones until the calculator inputs change again.
  const [override, setOverride] = useState<{ binge?: YN; regular?: YN }>({});
  const boxRef = useRef<HTMLDivElement>(null);

  // When "ดื่ม" is picked, the follow-up box slides in (CSS animation) and is scrolled into view
  // if it opened below the fold, so the screener sees the next questions without hunting.
  useEffect(() => {
    if (drinks !== "yes" || !boxRef.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    boxRef.current.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
  }, [drinks]);

  const filled: DrinkRow[] = rows.filter((r) => r.unitId && Number(r.amount) > 0).map((r) => ({ unitId: r.unitId, amount: Number(r.amount) }));
  const ready = filled.length > 0 && days !== null;
  const calc = ready ? assessDrinking(filled, days, sex) : null;
  const limit = calc?.limit ?? assessDrinking([], 0, sex).limit;

  const binge: YN | "" = override.binge ?? (calc ? (calc.binge ? "yes" : "no") : "");
  const regular: YN | "" = override.regular ?? (calc ? (calc.regularHeavy ? "yes" : "no") : "");

  function editRow(key: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    setOverride({});
  }
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

  return (
    <div className="alc">
      <Choice label="ดื่มเหล้า เบียร์ ไวน์ หรือสุราพื้นบ้านบ้างไหม" name="drinksAlcohol" value={drinks}
        onPick={(v) => setDrinks(v)} labels={["ไม่ดื่ม", "ดื่ม"]} />

      {drinks === "yes" && (
        <div className="alc-box" ref={boxRef}>
          <div className="alc-step">
            <div className="alc-q">ส่วนใหญ่ดื่มอะไร ครั้งหนึ่งประมาณเท่าไหร่</div>
            {rows.map((r) => {
              const unit = DRINK_UNITS.find((u) => u.id === r.unitId);
              return (
                <div key={r.key} className="alc-row">
                  <select className="fld" aria-label="เครื่องดื่ม" value={r.unitId} onChange={(e) => editRow(r.key, { unitId: e.target.value })}>
                    <option value="">เลือกเครื่องดื่ม</option>
                    {GROUPS.map((g) => (
                      <optgroup key={g} label={g}>
                        {DRINK_UNITS.filter((u) => u.group === g).map((u) => (
                          <option key={u.id} value={u.id}>{g} {u.label}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <input className="fld alc-amt" inputMode="decimal" aria-label="จำนวนต่อครั้ง" placeholder="จำนวน"
                    value={r.amount} onChange={(e) => editRow(r.key, { amount: e.target.value.replace(/[^\d.]/g, "") })} />
                  <span className="alc-unit">{unit ? unit.label.split(" ")[0] : ""}</span>
                  {rows.length > 1 && (
                    <button type="button" className="alc-x" aria-label="ลบเครื่องดื่มนี้"
                      onClick={() => { setRows((rs) => rs.filter((x) => x.key !== r.key)); setOverride({}); }}>×</button>
                  )}
                </div>
              );
            })}
            <button type="button" className="linkbtn" style={{ alignSelf: "flex-start", color: "var(--acc-d)" }}
              onClick={() => setRows((rs) => [...rs, newRow()])}>+ ดื่มอย่างอื่นด้วย</button>
          </div>

          <div className="alc-step">
            <div className="alc-q">ดื่มสัปดาห์ละกี่วัน</div>
            <div className="seg alc-days" role="radiogroup" aria-label="ดื่มสัปดาห์ละกี่วัน">
              {DAYS.map((d) => (
                <label key={d.v}>
                  <input type="radio" name="drinkDays" checked={days === d.v} onChange={() => { setDays(d.v); setOverride({}); }} />
                  {d.label}
                </label>
              ))}
            </div>
          </div>

          <div className="alc-result">
            {calc ? (
              <div className="alc-sum">
                ครั้งละประมาณ <b>{fmt(calc.perSession)}</b> ดื่มมาตรฐาน และสัปดาห์ละประมาณ <b>{fmt(calc.perWeek)}</b> ดื่มมาตรฐาน
              </div>
            ) : (
              <div className="note">กรอกเครื่องดื่มและจำนวนวัน ระบบจะตอบ 2 ข้อด้านล่างให้</div>
            )}
            <Choice label="ดื่มหนักในครั้งเดียวไหม" sub={`${sex} เกินเกณฑ์เมื่อดื่มมากกว่า ${limit.session} ดื่มมาตรฐาน ภายใน 2 ชั่วโมง`}
              name="bingeDrinking" value={binge} onPick={(v) => setOverride((o) => ({ ...o, binge: v }))} />
            <Choice label="ดื่มหนักต่อเนื่องไหม" sub={`${sex} เกินเกณฑ์เมื่อรวมทั้งสัปดาห์มากกว่า ${limit.week} ดื่มมาตรฐาน`}
              name="regularHeavyDrinking" value={regular} onPick={(v) => setOverride((o) => ({ ...o, regular: v }))} />
            {calc && <div className="note">ระบบเลือกให้จากที่กรอก แก้ได้ถ้าไม่ตรง เช่น ครั้งนั้นดื่มนานเกิน 2 ชั่วโมง</div>}
          </div>
        </div>
      )}
      {error && <div className="err">{error}</div>}
    </div>
  );
}

function Choice(props: { label: string; sub?: string; name: string; value: string; onPick: (v: YN) => void; labels?: [string, string] }) {
  const [noLabel, yesLabel] = props.labels ?? ["ไม่ใช่", "ใช่"];
  return (
    <div className="kv q-row">
      <span className="k">
        {props.label}
        {props.sub && <small className="q-sub">{props.sub}</small>}
      </span>
      <div className="seg" style={{ width: 150, flexShrink: 0 }} role="radiogroup" aria-label={props.label}>
        <label><input type="radio" name={props.name} value="no" checked={props.value === "no"} onChange={() => props.onPick("no")} />{noLabel}</label>
        <label><input type="radio" name={props.name} value="yes" checked={props.value === "yes"} onChange={() => props.onPick("yes")} />{yesLabel}</label>
      </div>
    </div>
  );
}
