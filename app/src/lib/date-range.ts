// Reads ?from= & ?to= ("dd/mm/yyyy", พ.ศ.) into a Bangkok-time range for a WHERE clause, and
// formats it in words. Empty or broken values mean "no limit on that side".
const TZ_OFFSET = "+07:00";

function toDate(v: unknown): Date | null {
  const m = typeof v === "string" ? v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/) : null;
  if (!m) return null;
  const d = new Date(`${Number(m[3]) - 543}-${m[2]}-${m[1]}T00:00:00${TZ_OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d;
}
const be = (d: Date) => {
  const [y, mo, da] = d.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }).split("-");
  return `${da}/${mo}/${Number(y) + 543}`;
};

export function readRange(sp: Record<string, string | string[] | undefined>) {
  let from = toDate(sp.from);
  let to = toDate(sp.to);
  if (from && to && from > to) [from, to] = [to, from]; // picked backwards: swap
  const end = to ? new Date(to.getTime() + 86_400_000) : null; // "ถึง" includes that whole day
  return {
    from: from ? be(from) : "",
    to: to ? be(to) : "",
    where: from || end ? { ...(from ? { gte: from } : {}), ...(end ? { lt: end } : {}) } : undefined,
  };
}

const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
// "01/10/2569" → "1 ต.ค. 2569"
export const beWords = (v: string) => {
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${Number(m[1])} ${MONTHS[Number(m[2]) - 1]} ${m[3]}` : v;
};
// the range in words for headings: "1 ต.ค. 2569 ถึง 18 พ.ย. 2569", or "ทุกช่วงเวลา"
export const rangeWords = (r: { from: string; to: string }) =>
  r.from && r.to ? `${beWords(r.from)} ถึง ${beWords(r.to)}` : r.from ? `ตั้งแต่ ${beWords(r.from)}` : r.to ? `ถึง ${beWords(r.to)}` : "ทุกช่วงเวลา";
