// GET /manuals/[id] — open one uploaded manual (stored in the database, so no file server needed).
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { audiencesFor } from "@/lib/manuals";
import { getCurrentUser } from "@/lib/session";

export async function GET(_req: Request, ctx: RouteContext<"/manuals/[id]">) {
  const user = await getCurrentUser();
  if (!user || user.mustChangePassword) return new Response("Forbidden", { status: 403 });
  const id = Number((await ctx.params).id);
  const m = Number.isInteger(id) ? await db.manual.findUnique({ where: { id } }) : null;
  const allowed = m && (user.role === "admin" || (m.active && audiencesFor(user.role).includes(m.audience)));
  if (!m || !allowed) return new Response("Not found", { status: 404 });
  await audit({ user, action: "manual.download", entity: "Manual", entityId: m.id });
  return new Response(new Uint8Array(m.data), {
    headers: {
      "Content-Type": m.mime,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(m.fileName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
