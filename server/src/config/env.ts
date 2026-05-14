import "dotenv/config";
import { z } from "zod";

const clientOriginsSchema = z
  .string()
  .transform((s) =>
    s
      .split(",")
      .map((part) => part.trim().replace(/\/$/, ""))
      .filter((part) => part.length > 0)
  )
  .pipe(z.array(z.string().url()).min(1));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  CLIENT_ORIGIN: clientOriginsSchema,
  COOKIE_SECURE: z.coerce.boolean().default(false)
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  MONGODB_URI: process.env.MONGODB_URI ?? "mongodb://localhost:27017/meetslot",
  JWT_SECRET: process.env.JWT_SECRET ?? "test-secret-that-is-long-enough",
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN?.trim() || "http://localhost:3000",
  COOKIE_SECURE: process.env.COOKIE_SECURE ?? false
});

console.log("Allowed CORS origins:", env.CLIENT_ORIGIN);

