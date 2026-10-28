// Audit trail helper (PBI-12, Computer Crime Act §26).
// Rule: `detail` must never contain patient names, lab values, or passwords. IDs only.
// The device is a short browser/OS summary. No IP address is stored (team decision).
import "server-only";
import { headers } from "next/headers";
import { db } from "./db";
import { deviceOf } from "./audit-text";

type AuditEntry = {
  user?: { id: number; username: string } | null;
  username?: string; // for failed logins where there is no user object
  action: string;
  entity?: string;
  entityId?: number;
  detail?: string;
};

async function currentDevice() {
  try {
    return deviceOf((await headers()).get("user-agent"));
  } catch {
    return null; // called outside a request (e.g. a script)
  }
}

export async function audit(entry: AuditEntry) {
  await db.auditLog.create({
    data: {
      userId: entry.user?.id ?? null,
      username: entry.user?.username ?? entry.username ?? null,
      action: entry.action,
      entity: entry.entity ?? null,
      entityId: entry.entityId ?? null,
      detail: entry.detail ?? null,
      device: await currentDevice(),
    },
  });
}
