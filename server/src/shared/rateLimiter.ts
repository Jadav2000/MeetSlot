import type { RequestHandler } from "express";

type RateLimitOptions = {
  windowMs: number;
  limit: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

export function createRateLimiter({ windowMs, limit }: RateLimitOptions): RequestHandler {
  const hits = new Map<string, RateLimitEntry>();

  return (req, res, next) => {
    const now = Date.now();
    const key = `${req.ip}:${req.user?.id ?? "anonymous"}`;
    const current = hits.get(key);
    const entry = current && current.resetAt > now ? current : { count: 0, resetAt: now + windowMs };

    entry.count += 1;
    hits.set(key, entry);

    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    res.setHeader("RateLimit-Limit", String(limit));
    res.setHeader("RateLimit-Remaining", String(Math.max(limit - entry.count, 0)));
    res.setHeader("RateLimit-Reset", String(retryAfterSeconds));

    if (entry.count > limit) {
      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.status(429).json({ success: false, error: { message: "Too many requests" } });
      return;
    }

    next();
  };
}
