import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { errorMiddleware } from "./middleware/errorMiddleware.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { workspaceRouter } from "./modules/workspaces/workspace.routes.js";
import { roomRouter } from "./modules/rooms/room.routes.js";
import { bookingRouter } from "./modules/bookings/booking.routes.js";

export function createApp() {
  const app = express();
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || env.CLIENT_ORIGIN.includes(origin.replace(/\/$/, ""))) {
          callback(null, true);
        } else {
          console.warn(`CORS blocked request from origin: ${origin}`);
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true
    })
  );
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
