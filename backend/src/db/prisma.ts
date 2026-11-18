// The ONE shared Prisma client for the whole backend (server and scripts).
// It connects with DATABASE_URL (Neon pooled address) through the pg driver adapter.
// Never print or log the address: it holds the database password.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { env } from "../config/env";

// Neon gives `sslmode=require`. The pg driver already treats that as `verify-full`
// (full certificate check) but prints a warning that this will change in pg v9.
// We ask for `verify-full` directly, in memory only (.env is not changed), so the
// strong check stays after that upgrade and the warning goes away.
function withFullSslCheck(address: string): string {
  try {
    const url = new URL(address);
    if (url.searchParams.get("sslmode") === "require") url.searchParams.set("sslmode", "verify-full");
    return url.toString();
  } catch {
    return address; // let the driver report a bad address (its message is never shown)
  }
}

const adapter = new PrismaPg({ connectionString: withFullSslCheck(env.databaseUrl) });

export const prisma = new PrismaClient({ adapter });

class DbTimeoutError extends Error {}

/**
 * Tiny `SELECT 1` to see if the database answers within `limitMs`.
 * Returns true/false only; the error text is never passed on (it can contain the address).
 */
export async function databaseAnswers(limitMs: number): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_resolve, reject) => {
        timer = setTimeout(() => reject(new DbTimeoutError()), limitMs);
      }),
    ]);
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
