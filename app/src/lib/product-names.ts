// Free-text drug / herb names from the screening form (nsaidNote, herbalNote), grouped so the
// same product typed in different ways is counted together:
// - the place it came from is split off ("ยาแก้อักเสบจากรถเร่" = "ยาแก้อักเสบ" + source "รถเร่")
// - names are compared without spaces, punctuation or case, and Thai digits become 0-9
// - a name that contains a shorter, specific name joins it ("ยาแก้ไอตราเสือดาว" joins "ยาแก้ไอ");
//   very general words ("ยา", "ยาชุด", "สมุนไพร" …) never act as a group, so unrelated items stay apart
// Every original spelling and source is kept, so nothing is hidden by the grouping.

// where-it-came-from words, earliest one wins
const SOURCE_MARKERS = ["ซื้อจาก", "ซื้อที่", "ซื้อเอง", "จากร้าน", "จาก", "ร้าน", "ตลาด", "รถเร่"];
// too general to be a group of their own
const GENERIC = new Set(["ยา", "ยาชุด", "ยาแก้ปวด", "ยาแก้อักเสบ", "สมุนไพร", "อาหารเสริม", "ยาต้ม", "ยาหม้อ", "ยาสมุนไพร", "ไม่ได้ระบุชื่อ", "ไม่ทราบ", "ไม่ทราบชื่อ"]);
const MIN_GROUP_LEN = 4;

export function splitNote(raw: string | null | undefined): { name: string; source: string } {
  const text = (raw ?? "").trim().replace(/\s+/g, " ");
  if (!text) return { name: "ไม่ได้ระบุชื่อ", source: "" };
  let at = -1;
  for (const m of SOURCE_MARKERS) {
    const i = text.indexOf(m);
    if (i > 0 && (at === -1 || i < at)) at = i; // i > 0: a name must come first
  }
  if (at === -1) return { name: text, source: "" };
  const name = text.slice(0, at).trim();
  const source = text.slice(at).replace(/^(ซื้อ)?(จาก|ที่)?\s*/, "").trim();
  return { name: name || text, source: source === "เอง" || source === "ซื้อเอง" ? "ซื้อเอง" : source };
}

export function nameKey(name: string) {
  return name
    .toLowerCase()
    .replace(/[๐-๙]/g, (d) => String("๐๑๒๓๔๕๖๗๘๙".indexOf(d)))
    .replace(/[\s.,\-_/()"'“”‘’:;!?]+/g, "");
}

export type ProductGroup = {
  label: string; // the shortest specific name in the group, as typed most often
  n: number; // times reported
  last: Date;
  spellings: { text: string; n: number }[]; // every way it was typed (name part)
  sources: { text: string; n: number }[]; // where it came from, when given
};

export function groupProducts(entries: { note: string | null; at: Date }[]): ProductGroup[] {
  const parsed = entries.map((e) => ({ ...splitNote(e.note), at: e.at })).map((e) => ({ ...e, key: nameKey(e.name) || "ไม่ได้ระบุชื่อ" }));
  // shortest keys first, so a longer name can join a shorter one that it contains
  const keys = [...new Set(parsed.map((p) => p.key))].sort((a, b) => a.length - b.length || a.localeCompare(b));
  const groupOf = new Map<string, string>();
  const heads: string[] = [];
  for (const k of keys) {
    const head = heads.find((h) => h.length >= MIN_GROUP_LEN && !GENERIC.has(h) && k.includes(h));
    if (head) groupOf.set(k, head);
    else { heads.push(k); groupOf.set(k, k); }
  }
  type Acc = { n: number; last: Date; spell: Map<string, number>; src: Map<string, number>; headSpell: Map<string, number> };
  const acc = new Map<string, Acc>();
  for (const p of parsed) {
    const h = groupOf.get(p.key)!;
    const a = acc.get(h) ?? { n: 0, last: p.at, spell: new Map(), src: new Map(), headSpell: new Map() };
    a.n++;
    if (p.at > a.last) a.last = p.at;
    a.spell.set(p.name, (a.spell.get(p.name) ?? 0) + 1);
    if (p.key === h) a.headSpell.set(p.name, (a.headSpell.get(p.name) ?? 0) + 1);
    if (p.source) a.src.set(p.source, (a.src.get(p.source) ?? 0) + 1);
    acc.set(h, a);
  }
  const top = (m: Map<string, number>) => [...m.entries()].sort((x, y) => y[1] - x[1]).map(([text, n]) => ({ text, n }));
  return [...acc.values()]
    .map((a) => ({ label: top(a.headSpell)[0]?.text ?? top(a.spell)[0].text, n: a.n, last: a.last, spellings: top(a.spell), sources: top(a.src) }))
    .sort((x, y) => y.n - x.n || y.last.getTime() - x.last.getTime());
}
