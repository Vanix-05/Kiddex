// Loads backend/.env and checks every setting with Zod.
// The rest of the app reads settings only from the `env` object exported here.
import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

// Works from both src/config (tsx) and dist/config (built), since both sit two folders below backend/.
dotenv.config({ path: path.resolve(__dirname, "../../.env"), quiet: true });

// Treat "KEY=" (empty) the same as a missing value, so defaults still apply.
const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalText = z.preprocess(blankToUndefined, z.string().trim().optional());
const textWithDefault = (fallback: string) =>
  z.preprocess(blankToUndefined, z.string().trim().default(fallback));
const wholeNumber = (fallback: number) =>
  z.preprocess(
    blankToUndefined,
    z.coerce.number({ error: "must be a whole number" }).int("must be a whole number").positive("must be above 0").default(fallback),
  );

// Neon addresses: required. The message names the setting only, never the value.
const neonAddress = z.preprocess(
  blankToUndefined,
  z.string({ error: "is missing. Copy it from Neon: Connect button" }),
);

export const AI_PROVIDERS = ["gemini", "groq"] as const;
export type AiProviderName = (typeof AI_PROVIDERS)[number];

const schema = z.object({
  // Pooled address (has -pooler). The running server uses this one.
  DATABASE_URL: neonAddress,
  // Direct address (no -pooler). Only Prisma migrations use it (prisma.config.ts).
  DIRECT_URL: neonAddress,
  // Signs Teacher login tokens. Required, at least 32 characters.
  JWT_SECRET: z.preprocess(
    blankToUndefined,
    z
      .string({ error: "is missing. Make one with: node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\"" })
      .min(32, "must be at least 32 characters. Make a new one with: node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\""),
  ),
  PORT: wholeNumber(3000),
  // One or more website addresses that may call this API, separated by commas,
  // e.g. https://kiddex.vercel.app,http://localhost:5173. Each becomes its origin
  // (scheme + host + port), which is what a browser sends.
  FRONTEND_URL: z.preprocess(
    blankToUndefined,
    z
      .string()
      .default("http://localhost:5173")
      .transform((text) => text.split(",").map((address) => address.trim()).filter(Boolean))
      .pipe(
        z
          .array(
            z.url({
              protocol: /^https?$/,
              error: "must be full web addresses separated by commas, like https://kiddex.vercel.app,http://localhost:5173",
            }),
          )
          .min(1, "must list at least one web address, like http://localhost:5173")
          .transform((addresses) => [...new Set(addresses.map((address) => new URL(address).origin))]),
      ),
  ),
  GEMINI_API_KEY: optionalText,
  GEMINI_MODEL: textWithDefault("gemini-3.5-flash"),
  GROQ_API_KEY: optionalText,
  GROQ_MODEL: textWithDefault("qwen/qwen3.8-27b"),
  AI_TIMEOUT_MS: wholeNumber(60000),
  AI_ORDER: z.preprocess(
    blankToUndefined,
    z
      .string()
      .default("gemini,groq")
      .transform((text) => text.split(",").map((name) => name.trim().toLowerCase()).filter(Boolean))
      .pipe(
        z
          .array(z.enum(AI_PROVIDERS, { error: "may only list gemini and groq, like gemini,groq" }))
          .min(1, "must list at least one AI, like gemini,groq")
          .refine((names) => new Set(names).size === names.length, "lists the same AI twice"),
      ),
  ),
  // Test only: mark every Nth unmarked card "not_in_lesson". Empty = off.
  DEV_MARK_EVERY: z.preprocess(
    blankToUndefined,
    z.coerce.number({ error: "must be a whole number" }).int("must be a whole number").positive("must be above 0").optional(),
  ),
  NODE_ENV: optionalText,
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // Name the variable and the rule only. Never print the value: it could be a key.
  const issue = parsed.error.issues[0];
  const name = String(issue?.path[0] ?? "unknown");
  console.error(`Setting error in backend/.env: ${name} ${issue?.message ?? "is not valid"}.`);
  process.exit(1);
}

export const env = {
  /** Never print or log this: it holds the database password. */
  databaseUrl: parsed.data.DATABASE_URL,
  /** Never print or log this: anyone with it can make Teacher logins. */
  jwtSecret: parsed.data.JWT_SECRET,
  port: parsed.data.PORT,
  /** The website origins allowed to call this API (CORS), e.g. ["https://kiddex.vercel.app"]. */
  frontendOrigins: parsed.data.FRONTEND_URL,
  /** True on the real server (Render sets NODE_ENV=production). */
  isProduction: parsed.data.NODE_ENV === "production",
  geminiApiKey: parsed.data.GEMINI_API_KEY,
  geminiModel: parsed.data.GEMINI_MODEL,
  groqApiKey: parsed.data.GROQ_API_KEY,
  groqModel: parsed.data.GROQ_MODEL,
  aiTimeoutMs: parsed.data.AI_TIMEOUT_MS,
  aiOrder: parsed.data.AI_ORDER as AiProviderName[],
  /** Test only: mark every Nth unmarked card. Always off in production (NODE_ENV=production). */
  devMarkEvery: parsed.data.NODE_ENV === "production" ? undefined : parsed.data.DEV_MARK_EVERY,
};
