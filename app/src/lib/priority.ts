// Order of the hospital's "waiting" alert queue. Plain functions, unit-tested.
//
// Groups follow the hospital outline (`thresholds/MALA outline prg.xlsx`):
//   1. contraindicated: CPG says "ห้ามใช้ยา" (eGFR < 30) but the patient is on Metformin
//   2. dose too high: Part 1, Action "ระบบแจ้งเตือนอัตโนมัติไปยังแพทย์ผู้รับผิดชอบ"
//   3. risk score only: Part 2, Action "ระบบเก็บข้อมูล...เพื่อรอการจัดการทางคลินิก"
// Within a group, the alert that has waited longest comes first.
// The group order is OUR reading of the outline, not a written rule; it is listed as an open
// question for the hospital in app/README.md. Group names are facts, not "urgent / less urgent".

export type AlertGroup = 1 | 2 | 3;

export const GROUP_LABEL: Record<AlertGroup, string> = {
  1: "ห้ามใช้ยา",
  2: "ยาเกินเกณฑ์",
  3: "คะแนนเสี่ยงถึงเกณฑ์",
};

export function alertGroup(s: { doseCheck: string }): AlertGroup {
  if (s.doseCheck === "contraindicated") return 1;
  if (s.doseCheck === "exceeds") return 2;
  return 3;
}

export function sortWaiting<T extends { doseCheck: string; alertRaisedAt: Date | null }>(list: T[]): T[] {
  const t = (d: Date | null) => d?.getTime() ?? 0;
  return [...list].sort((a, b) => alertGroup(a) - alertGroup(b) || t(a.alertRaisedAt) - t(b.alertRaisedAt));
}

// [{ group, items }] in display order, empty groups left out.
export function groupWaiting<T extends { doseCheck: string; alertRaisedAt: Date | null }>(list: T[]) {
  const sorted = sortWaiting(list);
  return ([1, 2, 3] as AlertGroup[])
    .map((g) => ({ group: g, label: GROUP_LABEL[g], items: sorted.filter((s) => alertGroup(s) === g) }))
    .filter((g) => g.items.length > 0);
}
