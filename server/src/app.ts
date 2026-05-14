import { createRequire } from "node:module";
import express, { type RequestHandler } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { errorMiddleware } from "./middleware/errorMiddleware.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { workspaceRouter } from "./modules/workspaces/workspace.routes.js";
import { roomRouter } from "./modules/rooms/room.routes.js";
import { bookingRouter } from "./modules/bookings/booking.routes.js";

const require = createRequire(import.meta.url);
const helmet = require("helmet") as (options?: object) => RequestHandler;

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
