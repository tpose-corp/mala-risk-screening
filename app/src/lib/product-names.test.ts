import { describe, expect, it } from "vitest";
import { groupProducts, nameKey, splitNote } from "./product-names";

const at = new Date("2026-11-01T00:00:00+07:00");
const g = (...notes: string[]) => groupProducts(notes.map((note) => ({ note, at })));

describe("splitNote", () => {
  it("splits the source off", () => {
    expect(splitNote("ยาแก้อักเสบจากรถเร่")).toEqual({ name: "ยาแก้อักเสบ", source: "รถเร่" });
    expect(splitNote("ยาชุดแก้ปวดเมื่อย ซื้อจากร้านชำ")).toEqual({ name: "ยาชุดแก้ปวดเมื่อย", source: "ร้านชำ" });
    expect(splitNote("ยาชุดซองสีเหลือง ร้านชำในหมู่บ้าน")).toEqual({ name: "ยาชุดซองสีเหลือง", source: "ร้านชำในหมู่บ้าน" });
    expect(splitNote("นาพรอกเซน ซื้อเอง")).toEqual({ name: "นาพรอกเซน", source: "ซื้อเอง" });
  });
  it("keeps a plain name and handles empty", () => {
    expect(splitNote("ฟ้าทะลายโจรแคปซูล")).toEqual({ name: "ฟ้าทะลายโจรแคปซูล", source: "" });
    expect(splitNote("  ")).toEqual({ name: "ไม่ได้ระบุชื่อ", source: "" });
    expect(splitNote(null).name).toBe("ไม่ได้ระบุชื่อ");
  });
});

describe("nameKey", () => {
  it("ignores spaces, punctuation, case and Thai digits", () => {
    expect(nameKey("ยาแก้ไอ ตรา-เสือดาว")).toBe(nameKey("ยาแก้ไอตราเสือดาว"));
    expect(nameKey("Paracetamol ๕๐๐")).toBe("paracetamol500");
  });
});

describe("groupProducts", () => {
  it("joins a longer name to a shorter specific one it contains", () => {
    const r = g("ยาแก้ไอ", "ยาแก้ไอตราเสือดาว", "ยาแก้ไอ ตราเสือดาว", "ยาแก้ไอตราเสือดาว จากร้านชำ");
    expect(r).toHaveLength(1);
    expect(r[0].label).toBe("ยาแก้ไอ");
    expect(r[0].n).toBe(4);
    expect(r[0].sources).toEqual([{ text: "ร้านชำ", n: 1 }]);
  });
  it("does not let a general word swallow different products", () => {
    const r = g("ยาชุด", "ยาชุดซองสีเหลือง", "ยาชุดแก้ปวดเมื่อย");
    expect(r.map((x) => x.label).sort()).toEqual(["ยาชุด", "ยาชุดซองสีเหลือง", "ยาชุดแก้ปวดเมื่อย"].sort());
  });
  it("counts the same name typed with different spacing as one", () => {
    const r = g("ฟ้าทะลายโจร แคปซูล", "ฟ้าทะลายโจรแคปซูล");
    expect(r).toHaveLength(1);
    expect(r[0].spellings).toHaveLength(2);
  });
});
