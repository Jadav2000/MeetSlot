import { MongoMemoryReplSet } from "mongodb-memory-server";
import bcrypt from "bcryptjs";
import { createApp } from "./app.js";
import { connectDb, disconnectDb } from "./db/mongoose.js";
import { env } from "./config/env.js";
import { User } from "./modules/users/user.model.js";
import { Workspace } from "./modules/workspaces/workspace.model.js";
import { Membership } from "./modules/workspaces/membership.model.js";
import { Room } from "./modules/rooms/room.model.js";
import { Booking } from "./modules/bookings/booking.model.js";

const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
await connectDb(replSet.getUri());
await seedDemo();

const server = createApp().listen(env.PORT, () => {
  console.log(`MeetSlot API with in-memory Mongo listening on http://localhost:${env.PORT}`);
  console.log("Demo login: owner@meetslot.dev / Password123!");
});

async function seedDemo(): Promise<void> {
  const passwordHash = await bcrypt.hash("Password123!", 10);
  const [owner, member, viewer, external] = await User.create([
    { name: "Olivia Owner", email: "owner@meetslot.dev", passwordHash },
    { name: "Mina Member", email: "member@meetslot.dev", passwordHash },
    { name: "Vik Viewer", email: "viewer@meetslot.dev", passwordHash },
    { name: "Eli External", email: "external@meetslot.dev", passwordHash }
  ]);
  const [acme, orbit] = await Workspace.create([
    { name: "Acme Labs", createdBy: owner._id },
    { name: "Orbit Studio", createdBy: member._id }
  ]);
  await Membership.create([
    { workspaceId: acme._id, userId: owner._id, role: "OWNER" },
    { workspaceId: acme._id, userId: member._id, role: "MEMBER" },
    { workspaceId: acme._id, userId: viewer._id, role: "VIEWER" },
    { workspaceId: orbit._id, userId: member._id, role: "OWNER" },
    { workspaceId: orbit._id, userId: external._id, role: "MEMBER" }
  ]);
  const weekdayRules = [1, 2, 3, 4, 5].map((weekday) => ({ weekday, startTime: "09:00", endTime: "18:00" }));
  const [boardroom, huddle, focus, studio] = await Room.create([
    { workspaceId: acme._id, name: "Boardroom", capacity: 12, timezone: "Asia/Kolkata", bufferMinutes: 10, availabilityRules: weekdayRules },
    { workspaceId: acme._id, name: "Huddle Room", capacity: 5, timezone: "Asia/Kolkata", bufferMinutes: 0, availabilityRules: weekdayRules },
    { workspaceId: orbit._id, name: "Focus Room", capacity: 4, timezone: "America/New_York", bufferMinutes: 0, availabilityRules: weekdayRules },
    { workspaceId: orbit._id, name: "Studio A", capacity: 8, timezone: "America/New_York", bufferMinutes: 10, availabilityRules: weekdayRules }
  ]);
  await Booking.create([
    { workspaceId: acme._id, roomId: boardroom._id, userId: member._id, startsAt: new Date("2026-05-14T04:00:00.000Z"), endsAt: new Date("2026-05-14T04:30:00.000Z"), title: "Sprint planning" },
    { workspaceId: acme._id, roomId: huddle._id, userId: owner._id, startsAt: new Date("2026-05-14T06:00:00.000Z"), endsAt: new Date("2026-05-14T06:30:00.000Z"), title: "Customer review" },
    { workspaceId: orbit._id, roomId: focus._id, userId: external._id, startsAt: new Date("2026-05-14T14:00:00.000Z"), endsAt: new Date("2026-05-14T14:30:00.000Z"), title: "Design sync" },
    { workspaceId: orbit._id, roomId: studio._id, userId: member._id, startsAt: new Date("2026-05-14T16:00:00.000Z"), endsAt: new Date("2026-05-14T16:30:00.000Z"), title: "Prototype review" }
  ]);
}

process.on("SIGINT", () => {
  server.close(() => {
    void disconnectDb().then(() => replSet.stop()).then(() => process.exit(0));
  });
});
