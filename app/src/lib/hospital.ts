// Shared bits for the referral-hospital pages (alert inbox, all cases, CSV export).
// The alert reason text lives in ./reasons.ts so it can be unit-tested.
import "server-only";
import { notFound } from "next/navigation";
import { audit } from "./audit";
import { db } from "./db";
import type { CurrentUser } from "./session";

// One case for a hospital user: any facility in the network, logged as a sensitive view.
export async function loadCaseForHospital(rawId: string, user: CurrentUser) {
  const id = Number(rawId);
  const s = Number.isInteger(id)
    ? await db.screening.findUnique({
        where: { id },
        include: { patient: true, screener: true, confirmedBy: true, acknowledgedBy: true },
      })
    : null;
  if (!s) notFound();
  await audit({ user, action: "hospital.case.view", entity: "Screening", entityId: s.id });
  return s;
}
