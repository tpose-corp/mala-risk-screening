// Waiting-time text on the hospital inbox. Run with: npm test
import { describe, expect, it } from "vitest";
import { waitText } from "./wait";

const now = new Date("2026-10-07T09:00:00+07:00");
const ago = (ms: number) => new Date(now.getTime() - ms);
const MIN = 60_000;

describe("waitText", () => {
  it("under a minute", () => expect(waitText(ago(20_000), now)).toBe("เพิ่งเข้ามา"));
  it("minutes", () => expect(waitText(ago(25 * MIN), now)).toBe("25 นาที"));
  it("hours and minutes", () => expect(waitText(ago(125 * MIN), now)).toBe("2 ชม. 5 นาที"));
  it("whole hours", () => expect(waitText(ago(180 * MIN), now)).toBe("3 ชม."));
  it("days", () => expect(waitText(ago(3 * 24 * 60 * MIN), now)).toBe("3 วัน"));
  it("a time in the future never shows a negative wait", () => expect(waitText(ago(-5 * MIN), now)).toBe("เพิ่งเข้ามา"));
});
