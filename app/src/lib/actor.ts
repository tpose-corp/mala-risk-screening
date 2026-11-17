// Run database writes "as" a logged-in user.
// The database watches the sensitive tables (prisma/migrations/*_audit_triggers) and logs any
// change that did not come through the app as "db.<table>.<op>". Writes wrapped in asActor()
// mark themselves as app writes, so they are not reported as out-of-app changes; the app writes
// its own audit entry for them instead, with the user's name.
import "server-only";
import { db } from "./db";

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

export function asActor<T>(userId: number, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('mala.actor', ${String(userId)}, true)`;
    return fn(tx);
  });
}
