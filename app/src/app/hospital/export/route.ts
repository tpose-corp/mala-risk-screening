// GET /hospital/export — download cases as CSV (columns of the hospital's "report" sheet).
// Takes the same filters as /hospital/cases (?q=&fac=&period=&result=); no filters = every case.
// A Route Handler: returns a file instead of a page. Hospital staff only, and every download is
// audited because the file contains patient names (rule.md / PDPA).
import type { NextRequest } from "next/server";
import { audit } from "@/lib/audit";
import { queryFor, readFilters, whereFor } from "@/lib/case-filters";
import { db } from "@/lib/db";
import { REPORT_COLUMNS, reportRow, toCsv } from "@/lib/report";
import { getCurrentUser, isHospital } from "@/lib/session";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new Response("Forbidden", { status: 403 });
  if (!isHospital(user)) {
    await audit({ user, action: "hospital.export.denied" });
    return new Response("Forbidden", { status: 403 });
  }

  const f = readFilters(Object.fromEntries(request.nextUrl.searchParams));
  const cases = await db.screening.findMany({ where: whereFor(f, "createdAt"), include: { patient: true }, orderBy: { createdAt: "desc" } });
  // The search box may hold a patient's name, which must not go into the log (rule.md): only
  // the fact that a search was used is kept ("q=*").
  const logged = queryFor({ ...f, q: f.q ? "*" : "" }) || "none";
  await audit({ user, action: "hospital.export.csv", detail: `rows=${cases.length} filters=${logged}` });

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(toCsv([REPORT_COLUMNS, ...cases.map(reportRow)]), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="mala-report-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
