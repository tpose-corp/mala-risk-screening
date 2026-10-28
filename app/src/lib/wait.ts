// "How long has this alert been waiting" for the hospital inbox. Plain function, unit-tested.
// No "too slow" threshold: the hospital has not set one yet (see intent.md, alert SLA question).

export function waitText(from: Date, now = new Date()): string {
  const min = Math.max(0, Math.floor((now.getTime() - from.getTime()) / 60000));
  if (min < 1) return "เพิ่งเข้ามา";
  if (min < 60) return `${min} นาที`;
  const h = Math.floor(min / 60);
  if (h < 24) return min % 60 ? `${h} ชม. ${min % 60} นาที` : `${h} ชม.`;
  return `${Math.floor(h / 24)} วัน`;
}
