import type { NextFunction, Request, Response } from "express";
import { unauthorized } from "../shared/errors.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { User } from "../modules/users/user.model.js";

export async function authMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.accessToken as string | undefined;
  if (!token) return next(unauthorized());

  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).select("email name").lean();
    if (!user) return next(unauthorized("Session user no longer exists"));
    req.user = { id: String(user._id), email: user.email, name: user.name };
    next();
  } catch {
    next(unauthorized("Invalid or expired token"));
  }
}
