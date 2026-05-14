import mongoose from "mongoose";
import { env } from "../config/env.js";

export async function connectDb(uri = env.MONGODB_URI): Promise<void> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}

