// Load one screening for the logged-in user's facility (or show 404). Used by all 4 case pages:
// result → alert/advice → confirm → done.
import "server-only";
import { notFound } from "next/navigation";
import { audit } from "./audit";
import { db } from "./db";
import type { CurrentUser } from "./session";

export async function loadScreening(rawId: string, user: CurrentUser) {
  const id = Number(rawId);
  const s = Number.isInteger(id)
    ? await db.screening.findFirst({
        where: { id, patient: { facility: user.facility } },
        include: { patient: true, screener: true, confirmedBy: true, acknowledgedBy: true },
      })
    : null;
  if (!s) {
    // Exists but belongs to another facility: a refused access attempt, worth keeping in the log.
    if (Number.isInteger(id) && (await db.screening.count({ where: { id } })) > 0) {
      await audit({ user, action: "record.denied", entity: "Screening", entityId: id });
    }
    notFound();
  }

  // rule.md: viewing a screening result (eGFR, dose, risk) must be logged.
  await audit({ user, action: "screening.view", entity: "Screening", entityId: s.id });
  return s;
}
