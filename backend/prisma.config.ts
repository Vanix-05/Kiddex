// Prisma CLI settings (migrate, studio, generate).
// Migrations use DIRECT_URL (Neon, connection pooling OFF). The running server
// does NOT read this file: it uses DATABASE_URL in src/db/prisma.ts.
import path from "node:path";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({ path: path.resolve(__dirname, ".env"), quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // `prisma generate` needs no address, so a fresh copy (no .env) can still build.
  // Migrate and Studio need it and stop with an error if DIRECT_URL is missing.
  ...(process.env.DIRECT_URL ? { datasource: { url: process.env.DIRECT_URL } } : {}),
});
