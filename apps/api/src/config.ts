import { z } from "zod";
import { config as loadEnv } from "dotenv";
import { readFileSync } from "node:fs";

loadEnv();
loadEnv({ path: "../../.env" });

for (const name of ["DATABASE_URL", "JWT_SECRET"] as const) {
  const secretFile = process.env[`${name}_FILE`];
  if (secretFile) process.env[name] = readFileSync(secretFile, "utf8").trim();
}

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z
    .string()
    .url()
    .default(
      "postgresql://developer_wiki:local-only-change-me@localhost:5432/developer_wiki?schema=public",
    ),
  JWT_SECRET: z
    .string()
    .min(32)
    .default("local-development-secret-change-this-32-chars-minimum"),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
  COOKIE_SECURE: z.enum(["true", "false"]).optional(),
  API_PORT: z.coerce.number().int().positive().default(3001),
  API_HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z.string().default("info"),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(
    `Invalid environment configuration: ${z.prettifyError(parsed.error)}`,
  );
}

if (
  parsed.data.NODE_ENV === "production" &&
  (parsed.data.JWT_SECRET ===
    "local-development-secret-change-this-32-chars-minimum" ||
    parsed.data.JWT_SECRET.startsWith("replace-this"))
) {
  throw new Error(
    "JWT_SECRET must be set to a deployment-specific secret in production.",
  );
}

export const config = {
  ...parsed.data,
  cookieSecure:
    parsed.data.COOKIE_SECURE === "true" ||
    (parsed.data.COOKIE_SECURE === undefined &&
      parsed.data.NODE_ENV === "production"),
};
