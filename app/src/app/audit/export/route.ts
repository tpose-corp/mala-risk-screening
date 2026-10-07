// GET /audit/export — download the audit log as CSV, with the same filters as /audit.
// rule.md (CCA §26): authorised administrators must be able to retrieve the logs for compliance.
// Every raw row is included (no collapsing), with both a readable and the original code/time,
// so the file can be checked against the database. Admin only, and the download itself is logged.
import type { NextRequest } from "next/server";
import { audit } from "@/lib/audit";
import { auditQuery, auditWhere, readAuditFilters } from "@/lib/audit-filters";
import { describeRow } from "@/lib/audit-text";
import { db } from "@/lib/db";
import { toCsv } from "@/lib/report";
import { getCurrentUser } from "@/lib/session";

const COLUMNS = ["ลำดับ", "เวลา (ไทย)", "เวลา (UTC)", "ใคร", "ตำแหน่ง/หมายเหตุ", "ชื่อผู้ใช้", "หน่วยบริการ", "อุปกรณ์", "ทำอะไร", "รายการ", "รายละเอียด", "รหัสการกระทำ"];

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new Response("Forbidden", { status: 403 });
  if (user.role !== "admin") {
    await audit({ user, action: "audit.view.denied", detail: "export" });
    return new Response("Forbidden", { status: 403 });
  }

  const f = readAuditFilters(Object.fromEntries(request.nextUrl.searchParams));
  const rows = await db.auditLog.findMany({ where: auditWhere(f), orderBy: { id: "asc" } });
  const users = await db.user.findMany();
  await audit({ user, action: "audit.export", detail: `rows=${rows.length} filters=${auditQuery(f) || "none"}` });

  const body = rows.map((r) => {
    const d = describeRow(r, users);
    const local = r.at.toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    return [String(r.id), local, r.at.toISOString(), d.who, d.whoNote, r.username ?? "", d.facility, d.device, d.what, d.target, d.detail, r.action];
  });
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(toCsv([COLUMNS, ...body]), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="mala-audit-log-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
