// Open cases: screenings a รพ.สต. saved but never closed with "ยืนยันปิดเคส".
// Team rule (v2 polish, 18 Nov 2026): while a unit has an open case, its staff cannot start a new
// screening or add a new patient. They can still search, view and finish the open cases.
// Checked on the pages (to show why) and again in the server actions (so a URL cannot skip it).
import type { Prisma } from "@/generated/prisma/client";
import { db } from "./db";

export const openCaseWhere = (facility: string) =>
  ({ facility, confirmedAt: null, patient: { active: true } }) satisfies Prisma.ScreeningWhereInput;

// exceptId: the case on screen right now (it is being finished, so it is not "another" open case)
export const countOpenCases = (facility: string, exceptId?: number) =>
  db.screening.count({ where: { ...openCaseWhere(facility), ...(exceptId ? { id: { not: exceptId } } : {}) } });

export const BLOCKED_MESSAGE = "ยังมีเคสที่ยังไม่ยืนยันปิดเคส กรุณายืนยันให้ครบก่อนเริ่มคัดกรองหรือเพิ่มผู้ป่วยใหม่";
