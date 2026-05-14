import type { ErrorRequestHandler } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { AppError } from "../shared/errors.js";

export const errorMiddleware: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ success: false, message: "Validation failed", errors: err.issues });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, message: err.message, errors: err.errors });
    return;
  }

  if (err instanceof mongoose.mongo.MongoServerError && err.code === 11000) {
    res.status(409).json({ success: false, message: "The requested slot is no longer available" });
    return;
  }

  console.error(err);
  res.status(500).json({ success: false, message: "Internal server error" });
};
