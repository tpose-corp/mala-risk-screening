// One shared database connection for the whole app (PostgreSQL: Neon in production,
// `npx prisma dev` on a laptop).
// In dev, Next.js reloads files often; storing the client on globalThis stops it from opening
// a new connection on every reload.
import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// `prisma dev` (the local database) handles only one connection at a time and drops the rest,
// so pages that run several queries at once (e.g. /admin) failed with "ConnectionClosed" on a
// laptop. Locally we keep a single connection; Neon and other real servers keep the normal pool.
const isLocal = /@(localhost|127\.0\.0\.1):/.test(process.env.DATABASE_URL ?? "");

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, ...(isLocal ? { max: 1 } : {}) });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
