// Order of the hospital's waiting alert queue. Run with: npm test
import { describe, expect, it } from "vitest";
import { alertGroup, groupWaiting, sortWaiting } from "./priority";

const a = (id: string, doseCheck: string, minutesAgo: number) => ({
  id,
  doseCheck,
  alertRaisedAt: new Date(Date.UTC(2026, 9, 7, 2, 0) - minutesAgo * 60_000),
});

describe("alert queue order", () => {
  it("groups by outline: contraindicated, then dose too high, then score only", () => {
    expect(alertGroup({ doseCheck: "contraindicated" })).toBe(1);
    expect(alertGroup({ doseCheck: "exceeds" })).toBe(2);
    expect(alertGroup({ doseCheck: "ok" })).toBe(3);
  });

  it("within a group, the longest-waiting alert comes first", () => {
    const list = [a("score-50", "ok", 50), a("dose-10", "exceeds", 10), a("never-45", "contraindicated", 45), a("dose-33", "exceeds", 33)];
    expect(sortWaiting(list).map((x) => x.id)).toEqual(["never-45", "dose-33", "dose-10", "score-50"]);
  });

  it("a score-only case that waited longer still stays below dose problems", () => {
    const list = [a("score-120", "ok", 120), a("dose-1", "exceeds", 1)];
    expect(sortWaiting(list)[0].id).toBe("dose-1");
  });

  it("groupWaiting leaves out empty groups and keeps the order", () => {
    const g = groupWaiting([a("s", "ok", 5), a("d", "exceeds", 5)]);
    expect(g.map((x) => [x.label, x.items.length])).toEqual([["ยาเกินเกณฑ์", 1], ["คะแนนเสี่ยงถึงเกณฑ์", 1]]);
  });
});
