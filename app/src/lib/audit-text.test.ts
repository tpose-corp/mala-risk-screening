// Readable audit log text. Run with: npm test
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { AUDIT_RETENTION_DAYS, actionsIn, collapse, describeAction, describeDetail, describeRow, describeTarget, deviceOf, retentionStatus } from "./audit-text";

// Every action code written anywhere: by app code (action: "...") and by DB triggers ('db.x.y').
function writtenCodes(): string[] {
  const walk = (d: string): string[] => readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? (n === "generated" ? [] : walk(p)) : /\.(ts|tsx|sql)$/.test(n) && !n.endsWith(".test.ts") ? [p] : [];
  });
  const src = walk(join(__dirname, "..")).concat(walk(join(__dirname, "..", "..", "prisma", "migrations")));
  const codes = new Set<string>();
  for (const f of src) {
    const t = readFileSync(f, "utf8");
    for (const m of t.matchAll(/action: "([a-z.]+)"/g)) codes.add(m[1]);
    for (const m of t.matchAll(/'(db\.[a-z]+\.[a-z]+)'/g)) codes.add(m[1]);
  }
  return [...codes];
}

describe("describeAction / describeTarget", () => {
  it("every action code written by the app or the database has a Thai label", () => {
    const codes = writtenCodes();
    expect(codes.length).toBeGreaterThan(25);
    expect(codes.filter((c) => describeAction(c).label === c)).toEqual([]);
  });
  it("failures are flagged", () => {
    expect(describeAction("login.failed").warn).toBe(true);
    expect(describeAction("login.success").warn).toBeUndefined();
  });
  it("unknown code falls back to itself", () => expect(describeAction("x.y").label).toBe("x.y"));
  it("categories", () => expect(actionsIn("auth")).toEqual(["login.success", "login.failed", "logout", "access.denied", "record.denied"]));
  it("targets", () => {
    expect(describeTarget("Screening", 5)).toBe("เคสคัดกรอง #5");
    expect(describeTarget("Patient", 3)).toBe("ผู้ป่วย #3");
    expect(describeTarget(null, null)).toBe("");
  });
});

describe("describeDetail", () => {
  it("list views", () => expect(describeDetail("hospital.inbox.view", "rows=5")).toBe("แสดง 5 รายการ"));
  it("paged list", () => expect(describeDetail("hospital.cases.view", "total=12009 page=2")).toBe("ทั้งหมด 12009 รายการ หน้า 2"));
  it("screening of a patient", () => expect(describeDetail("screening.create", "patientId=3")).toBe("ของผู้ป่วย #3"));
  it("confirm with rule version", () => expect(describeDetail("screening.confirm", "ruleVersion=outline-draft-2026-09-08")).toBe("เกณฑ์ outline-draft-2026-09-08"));
  it("CSV with filters", () => {
    const d = "rows=61 filters=?fac=%E0%B8%A3%E0%B8%9E.%E0%B8%AA%E0%B8%95.%E0%B8%94%E0%B8%AD%E0%B8%A2%E0%B8%A5%E0%B8%B2%E0%B8%99&period=30d&result=alert";
    expect(describeDetail("hospital.export.csv", d)).toBe("61 แถว กรองตาม รพ.สต.ดอยลาน, แจ้งเตือน, 30 วัน");
  });
  it("CSV search term is never shown, only that a search was used", () =>
    expect(describeDetail("hospital.export.csv", "rows=1 filters=?q=*")).toBe("1 แถว กรองตาม ค้นหาด้วยคำค้น"));
  it("CSV without filters", () => expect(describeDetail("hospital.export.csv", "rows=12 filters=none")).toBe("12 แถว ทั้งหมด"));
  it("audit log download filters", () =>
    expect(describeDetail("audit.export", "rows=17 filters=?from=2026-10-01&warn=1")).toBe("17 แถว กรองตาม ตั้งแต่ 2026-10-01, เฉพาะที่ไม่สำเร็จ"));
  it("failed login kinds", () => {
    expect(describeDetail("login.failed", "account=unknown")).toBe("ชื่อผู้ใช้ที่พิมพ์ไม่มีในระบบ");
    expect(describeDetail("login.failed", "account=exists")).toBe("รหัสผ่านไม่ถูกต้อง");
  });
  it("account and record changes made in the database", () => {
    expect(describeDetail("db.user.update", "role=nurse>admin changed=role")).toBe("ตำแหน่ง พยาบาลวิชาชีพ เป็น ผู้ดูแลระบบ");
    expect(describeDetail("db.user.update", "changed=password")).toBe("เปลี่ยนรหัสผ่าน");
    expect(describeDetail("db.user.create", "username=temp role=nurse")).toBe("ชื่อผู้ใช้ temp ตำแหน่ง พยาบาลวิชาชีพ");
    expect(describeDetail("db.screening.update", "changed=egfr,riskScore,scoreEgfr")).toBe("เปลี่ยนeGFR, คะแนน");
  });
  it("nothing to add", () => {
    expect(describeDetail("screening.confirm.rejected", "already confirmed")).toBe("");
    expect(describeDetail("logout", null)).toBe("");
  });
});

describe("deviceOf", () => {
  it("Chrome on Windows", () => expect(deviceOf("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36")).toBe("Chrome บน Windows"));
  it("Edge on Windows", () => expect(deviceOf("Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/131.0 Safari/537.36 Edg/131.0")).toBe("Edge บน Windows"));
  it("Safari on iPhone", () => expect(deviceOf("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1")).toBe("Safari บน iPhone/iPad"));
  it("Chrome on Android", () => expect(deviceOf("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36")).toBe("Chrome บน Android"));
  it("missing", () => expect(deviceOf(null)).toBeNull());
});

describe("retention (CCA §26)", () => {
  it("minimum is 90 days", () => expect(AUDIT_RETENTION_DAYS).toBe(90));
  it("counts days back from the oldest row", () => {
    const now = new Date("2026-12-31T00:00:00Z");
    expect(retentionStatus(new Date("2026-10-07T00:00:00Z"), now)).toEqual({ days: 85, full: false });
    expect(retentionStatus(new Date("2026-10-01T00:00:00Z"), now)).toEqual({ days: 91, full: true });
    expect(retentionStatus(null, now)).toEqual({ days: 0, full: false });
  });
});

describe("describeRow (who)", () => {
  const users = [{ id: 1, username: "somsri", displayName: "สมศรี ใจดี", role: "nurse", facility: "รพ.สต.บ้านดู่" }];
  const base = { entity: null, entityId: null, detail: null, device: null };
  it("known user", () => expect(describeRow({ ...base, userId: 1, username: "somsri", action: "logout" }, users))
    .toMatchObject({ who: "สมศรี ใจดี", whoNote: "พยาบาลวิชาชีพ", facility: "รพ.สต.บ้านดู่" }));
  it("deleted account keeps its old username", () => expect(describeRow({ ...base, userId: 9, username: "old", action: "logout" }, users))
    .toMatchObject({ who: "บัญชี old", whoNote: "บัญชีนี้ถูกลบแล้ว" }));
  it("failed login on a real account", () => expect(describeRow({ ...base, userId: null, username: "somsri", action: "login.failed" }, users))
    .toMatchObject({ who: "ไม่ทราบตัวตน", whoNote: "พยายามเข้าบัญชี สมศรี ใจดี", warn: true }));
  it("change made in the database", () => expect(describeRow({ ...base, userId: null, username: null, action: "db.user.delete" }, users))
    .toMatchObject({ who: "ไม่ผ่านหน้าเว็บ", warn: true }));
});

describe("collapse", () => {
  const row = (id: number, userId: number, action: string, min: number, entityId: number | null = null) =>
    ({ id, userId, username: "u" + userId, action, entity: entityId ? "Screening" : null, entityId, at: new Date(Date.UTC(2026, 9, 7, 2, min)) });
  it("merges runs of the same thing, keeps the time range", () => {
    const rows = [row(5, 3, "hospital.inbox.view", 4), row(4, 3, "hospital.inbox.view", 3), row(3, 3, "hospital.inbox.view", 2), row(2, 1, "login.success", 1), row(1, 3, "hospital.inbox.view", 0)];
    const c = collapse(rows);
    expect(c.map((x) => [x.row.id, x.count])).toEqual([[5, 3], [2, 1], [1, 1]]);
    expect(c[0].firstAt.getUTCMinutes()).toBe(2);
  });
  it("different records are not merged", () => {
    expect(collapse([row(2, 1, "screening.view", 1, 7), row(1, 1, "screening.view", 0, 8)])).toHaveLength(2);
  });
});

describe("collapse never hides what matters", () => {
  const at = (m: number) => new Date(Date.UTC(2026, 9, 7, 2, m));
  it("two different role changes stay two lines", () => {
    const rows = [
      { id: 2, userId: null, username: null, action: "db.user.update", entity: "User", entityId: 4, detail: "role=admin>nurse changed=role", at: at(1) },
      { id: 1, userId: null, username: null, action: "db.user.update", entity: "User", entityId: 4, detail: "role=nurse>admin changed=role", at: at(0) },
    ];
    expect(collapse(rows)).toHaveLength(2);
  });
  it("repeated failures stay separate lines", () => {
    const f = (id: number, m: number) => ({ id, userId: null, username: "somsri", action: "login.failed", entity: null, entityId: null, detail: "account=exists", at: at(m) });
    expect(collapse([f(2, 1), f(1, 0)])).toHaveLength(2);
  });
});
