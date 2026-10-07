// Page-number maths for long lists (hospital "รับเรื่องแล้ว" tab). Plain functions, unit-tested.
// The database is only asked for one page at a time (skip/take), so a list of 10,000 cases
// costs the same to show as a list of 25.

export const PAGE_SIZE = 25;

export function pageInfo(total: number, requested: unknown, size = PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(total / size));
  const n = Math.floor(Number(requested));
  const page = Number.isFinite(n) ? Math.min(Math.max(n, 1), pages) : 1;
  const from = total === 0 ? 0 : (page - 1) * size + 1;
  const to = Math.min(page * size, total);
  return { page, pages, skip: (page - 1) * size, take: size, from, to, total };
}

// Periods for the date filter. Days are counted back from now.
export const PERIODS = [
  { id: "today", label: "วันนี้", days: 0 },
  { id: "7d", label: "7 วัน", days: 7 },
  { id: "30d", label: "30 วัน", days: 30 },
  { id: "all", label: "ทั้งหมด", days: null },
] as const;
export type PeriodId = (typeof PERIODS)[number]["id"];

// Start of the period in Bangkok time, or null for "all".
export function periodStart(id: string, now = new Date()): Date | null {
  const p = PERIODS.find((x) => x.id === id) ?? PERIODS[3];
  if (p.days === null) return null;
  const today = now.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
  const start = new Date(`${today}T00:00:00+07:00`);
  start.setDate(start.getDate() - p.days);
  return start;
}

const nf = new Intl.NumberFormat("th-TH");
export const num = (n: number) => nf.format(n);
