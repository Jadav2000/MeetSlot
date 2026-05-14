import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDb, disconnectDb } from "./db/mongoose.js";
import { User } from "./modules/users/user.model.js";
import { Workspace } from "./modules/workspaces/workspace.model.js";
import { Membership } from "./modules/workspaces/membership.model.js";
import { Room } from "./modules/rooms/room.model.js";
import { Booking } from "./modules/bookings/booking.model.js";

async function seed(): Promise<void> {
  await connectDb();
  await mongoose.connection.dropDatabase();
  const passwordHash = await bcrypt.hash("Password123!", 12);
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
  const lateRules = [1, 2, 3, 4, 5].map((weekday) => ({ weekday, startTime: "11:00", endTime: "20:00" }));
  const [boardroom, huddle, training, focus, studio, podcast] = await Room.create([
    { workspaceId: acme._id, name: "Boardroom", capacity: 12, timezone: "Asia/Kolkata", bufferMinutes: 10, availabilityRules: weekdayRules },
    { workspaceId: acme._id, name: "Huddle Room", capacity: 5, timezone: "Asia/Kolkata", bufferMinutes: 0, availabilityRules: weekdayRules },
    { workspaceId: acme._id, name: "Training Room", capacity: 24, timezone: "Asia/Kolkata", bufferMinutes: 15, availabilityRules: lateRules },
    { workspaceId: orbit._id, name: "Focus Room", capacity: 4, timezone: "America/New_York", bufferMinutes: 0, availabilityRules: weekdayRules },
    { workspaceId: orbit._id, name: "Studio A", capacity: 8, timezone: "America/New_York", bufferMinutes: 10, availabilityRules: weekdayRules },
    { workspaceId: orbit._id, name: "Podcast Room", capacity: 3, timezone: "America/Los_Angeles", bufferMinutes: 5, availabilityRules: lateRules }
  ]);
  await Booking.create([
    { workspaceId: acme._id, roomId: boardroom._id, userId: member._id, startsAt: new Date("2026-05-14T04:00:00.000Z"), endsAt: new Date("2026-05-14T04:30:00.000Z"), title: "Sprint planning" },
    { workspaceId: acme._id, roomId: huddle._id, userId: owner._id, startsAt: new Date("2026-05-14T06:00:00.000Z"), endsAt: new Date("2026-05-14T06:30:00.000Z"), title: "Customer review" },
    { workspaceId: acme._id, roomId: training._id, userId: member._id, startsAt: new Date("2026-05-15T07:00:00.000Z"), endsAt: new Date("2026-05-15T07:30:00.000Z"), title: "Onboarding" },
    { workspaceId: orbit._id, roomId: focus._id, userId: external._id, startsAt: new Date("2026-05-14T14:00:00.000Z"), endsAt: new Date("2026-05-14T14:30:00.000Z"), title: "Design sync" },
    { workspaceId: orbit._id, roomId: studio._id, userId: member._id, startsAt: new Date("2026-05-14T16:00:00.000Z"), endsAt: new Date("2026-05-14T16:30:00.000Z"), title: "Prototype review" },
    { workspaceId: orbit._id, roomId: podcast._id, userId: external._id, startsAt: new Date("2026-05-15T19:00:00.000Z"), endsAt: new Date("2026-05-15T19:30:00.000Z"), title: "Recording prep" }
  ]);
  console.log("Seeded MeetSlot");
  console.table([
    { email: owner.email, password: "Password123!", role: "Acme OWNER" },
    { email: member.email, password: "Password123!", role: "Acme MEMBER / Orbit OWNER" },
    { email: viewer.email, password: "Password123!", role: "Acme VIEWER" },
    { email: external.email, password: "Password123!", role: "Orbit MEMBER" }
  ]);
  await disconnectDb();
}

void seed().catch(async (error) => {
  console.error(error);
  await disconnectDb();
  process.exit(1);
});
