import express, { type RequestHandler } from "express";
import cors from "cors";
import helmetDefault from "helmet";
import type { HelmetOptions } from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { errorMiddleware } from "./middleware/errorMiddleware.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { workspaceRouter } from "./modules/workspaces/workspace.routes.js";
import { roomRouter } from "./modules/rooms/room.routes.js";
import { bookingRouter } from "./modules/bookings/booking.routes.js";

/** Helmet 8 default export typing is not callable under `moduleResolution: "NodeNext"`; runtime is correct. */
type HelmetMiddleware = (options?: Readonly<HelmetOptions>) => RequestHandler;
const helmet = helmetDefault as unknown as HelmetMiddleware;

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get("/health", (_req, res) => res.json({ success: true, data: { status: "ok" } }));
  app.use("/auth", authRouter);
  app.use("/workspaces", workspaceRouter);
  app.use(roomRouter);
  app.use(bookingRouter);
  app.use(errorMiddleware);
  return app;
}

