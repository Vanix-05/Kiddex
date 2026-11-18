// Turns a database error into a short, safe reason for scripts and the server log.
// The raw error text is never printed: it can contain the database address.

/** What dbProblem says for an error that is not about reaching the database. */
export const UNEXPECTED_DB_ERROR = "unexpected database error";

/** True when the error means the database can't be reached (or refused us), not a bug in our query. */
export function isDbUnreachable(err: unknown): boolean {
  return dbProblem(err) !== UNEXPECTED_DB_ERROR;
}

export function dbProblem(err: unknown): string {
  const code = (err as { code?: unknown })?.code;
  const cause = (err as { cause?: unknown })?.cause;
  const text = err instanceof Error ? `${err.message} ${String(cause ?? "")}`.toLowerCase() : "";

  if (code === "P2021" || /does not exist|tablenotfound/.test(text)) {
    return "the tables are not made yet, run npm run db:migrate";
  }
  if (code === "P1000" || /password authentication failed|authentication/.test(text)) {
    return "the database refused the login, copy the address again from Neon";
  }
  if (/channel.binding|scram-sha-256-plus/.test(text)) {
    return "the database driver could not do channel binding (channel_binding=require)";
  }
  if (code === "P1001" || code === "P1002" || /timeout|timed out|econnrefused|enotfound|etimedout|getaddrinfo|connect/.test(text)) {
    return "can't reach the database, check the internet connection (a sleeping Neon database can take a few seconds to wake)";
  }
  return UNEXPECTED_DB_ERROR;
}
