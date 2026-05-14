import { createApp } from "./app.js";
import { connectDb } from "./db/mongoose.js";
import { env } from "./config/env.js";

await connectDb();
createApp().listen(env.PORT, () => {
  console.log(`MeetSlot API listening on http://localhost:${env.PORT}`);
});

