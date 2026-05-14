import { Router } from "express";
import bcrypt from "bcryptjs";
import { User } from "../users/user.model.js";
import { validate } from "../../middleware/validate.js";
import { loginSchema, signupSchema } from "./auth.schemas.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import { badRequest, unauthorized } from "../../shared/errors.js";
import { signAccessToken } from "../../utils/jwt.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { env } from "../../config/env.js";

const cookieOptions = {
  httpOnly: true,
  sameSite: env.COOKIE_SECURE ? ("none" as const) : ("lax" as const),
  secure: env.COOKIE_SECURE,
  maxAge: 7 * 24 * 60 * 60 * 1000
};

export const authRouter = Router();

authRouter.post(
  "/signup",
  validate({ body: signupSchema }),
  asyncHandler(async (req, res) => {
    const existing = await User.exists({ email: req.body.email });
    if (existing) throw badRequest("Email is already registered");
    const passwordHash = await bcrypt.hash(req.body.password, 12);
    const user = await User.create({ name: req.body.name, email: req.body.email, passwordHash });
    const token = signAccessToken({ sub: String(user._id), email: user.email, name: user.name });
    res.cookie("accessToken", token, cookieOptions);
    res.status(201).json({ success: true, data: { user: { id: user._id, email: user.email, name: user.name } } });
  })
);

authRouter.post(
  "/login",
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email });
    if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) throw unauthorized("Invalid credentials");
    const token = signAccessToken({ sub: String(user._id), email: user.email, name: user.name });
    res.cookie("accessToken", token, cookieOptions);
    res.json({ success: true, data: { user: { id: user._id, email: user.email, name: user.name } } });
  })
);

authRouter.post("/logout", (_req, res) => {
  res.clearCookie("accessToken", cookieOptions);
  res.json({ success: true, data: { ok: true } });
});

authRouter.get("/me", authMiddleware, (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});
