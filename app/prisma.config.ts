// Prisma CLI settings (used by `prisma migrate`, `prisma db seed`, …).
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations need a direct (non-pooled) connection on Neon; locally the two are the same.
    url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"],
  },
});
