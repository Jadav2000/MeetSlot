import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

type TokenPayload = { sub: string; email: string; name: string };

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (typeof decoded === "string" || !("sub" in decoded) || !("email" in decoded) || !("name" in decoded)) {
    throw new Error("Invalid token payload");
  }
  return { sub: String(decoded.sub), email: String(decoded.email), name: String(decoded.name) };
}

