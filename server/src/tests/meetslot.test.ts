import request from "supertest";
import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { createApp } from "../app.js";
import { connectDb, disconnectDb } from "../db/mongoose.js";
import { User } from "../modules/users/user.model.js";
import { Workspace } from "../modules/workspaces/workspace.model.js";
import { Membership } from "../modules/workspaces/membership.model.js";
import { Room } from "../modules/rooms/room.model.js";
import { Booking } from "../modules/bookings/booking.model.js";
import bcrypt from "bcryptjs";
import { convertRoomAvailabilityToUTC } from "../utils/time.js";

const app = createApp();
let replSet: MongoMemoryReplSet;

type Fixture = {
  ownerA: string;
  memberA: string;
  viewerA: string;
  ownerB: string;
  wsA: string;
  wsB: string;
  roomA: string;
};

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await connectDb(replSet.getUri());
});

afterAll(async () => {
  await disconnectDb();
  if (replSet) await replSet.stop();
});

beforeEach(async () => {
  await mongoose.connection.dropDatabase();
  await Booking.init();
});

describe("MeetSlot tenancy, RBAC and booking correctness", () => {
  it("blocks cross-tenant reads", async () => {
    const f = await fixture();
    const res = await request(app).get(`/workspaces/${f.wsB}`).set("Cookie", f.memberA);
    expect(res.status).toBe(403);
  });

  it("blocks cross-tenant writes", async () => {
    const f = await fixture();
    const res = await request(app)
      .post(`/workspaces/${f.wsB}/rooms`)
      .set("Cookie", f.memberA)
      .send(roomPayload("Hidden Room"));
    expect(res.status).toBe(403);
  });

  it("prevents viewers from creating bookings", async () => {
    const f = await fixture();
    const res = await request(app)
      .post(`/rooms/${f.roomA}/bookings`)
      .set("Cookie", f.viewerA)
      .send({ startsAt: "2026-05-14T03:30:00.000Z", endsAt: "2026-05-14T04:00:00.000Z", title: "Read only attempt" });
    expect(res.status).toBe(403);
  });

  it("prevents members from managing rooms", async () => {
    const f = await fixture();
    const res = await request(app)
      .post(`/workspaces/${f.wsA}/rooms`)
      .set("Cookie", f.memberA)
      .send(roomPayload("Member Managed"));
    expect(res.status).toBe(403);
  });

  it("returns 401 for missing and tampered JWTs", async () => {
    const missing = await request(app).get("/workspaces");
    const tampered = await request(app).get("/workspaces").set("Cookie", "accessToken=not-a-real-token");
    expect(missing.status).toBe(401);
    expect(tampered.status).toBe(401);
  });

  it("returns 400 for invalid write input", async () => {
    const f = await fixture();
    const res = await request(app)
      .post(`/workspaces/${f.wsA}/rooms`)
      .set("Cookie", f.ownerA)
      .send({ name: "x", capacity: 0, timezone: "", availabilityRules: [] });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("lets an invited user accept before the workspace appears", async () => {
    const f = await fixture();
    const before = await request(app).get("/workspaces").set("Cookie", f.viewerA);
    expect(before.body.data.workspaces.map((workspace: { _id: string }) => workspace._id)).not.toContain(f.wsB);

    await request(app)
      .post(`/workspaces/${f.wsB}/invites`)
      .set("Cookie", f.ownerB)
      .send({ email: "viewera@test.dev", role: "VIEWER" })
      .expect(201);

    const pending = await request(app).get("/workspaces/invites/pending").set("Cookie", f.viewerA).expect(200);
    expect(pending.body.data.invites).toHaveLength(1);

    await request(app)
      .post("/workspaces/invites/accept")
      .set("Cookie", f.viewerA)
      .send({ token: pending.body.data.invites[0].token })
      .expect(200);

    const after = await request(app).get("/workspaces").set("Cookie", f.viewerA);
    expect(after.body.data.workspaces.map((workspace: { _id: string }) => workspace._id)).toContain(f.wsB);
  });

  it("survives a concurrent booking race", async () => {
    const f = await fixture();
    const body = { startsAt: "2026-05-14T03:30:00.000Z", endsAt: "2026-05-14T04:00:00.000Z", title: "Race slot" };
    const responses = await Promise.all([
      request(app).post(`/rooms/${f.roomA}/bookings`).set("Cookie", f.memberA).send(body),
      request(app).post(`/rooms/${f.roomA}/bookings`).set("Cookie", f.memberA).send(body)
    ]);
    expect(responses.map((res) => res.status).sort()).toEqual([201, 409]);
    expect(await Booking.countDocuments({ roomId: f.roomA, canceledAt: null })).toBe(1);
  });

  it("converts room availability into UTC using room timezone", () => {
    const slot = convertRoomAvailabilityToUTC(
      new Date("2026-05-14T00:00:00.000Z"),
      { weekday: 4, startTime: "09:00", endTime: "18:00" },
      "Asia/Kolkata"
    );
    expect(slot.startsAt.toISOString()).toBe("2026-05-14T03:30:00.000Z");
    expect(slot.endsAt.toISOString()).toBe("2026-05-14T12:30:00.000Z");
  });
});

async function fixture(): Promise<Fixture> {
  const passwordHash = await bcrypt.hash("Password123!", 4);
  const [ownerA, memberA, viewerA, ownerB] = await User.create([
    { name: "Owner A", email: "ownera@test.dev", passwordHash },
    { name: "Member A", email: "membera@test.dev", passwordHash },
    { name: "Viewer A", email: "viewera@test.dev", passwordHash },
    { name: "Owner B", email: "ownerb@test.dev", passwordHash }
  ]);
  const [wsA, wsB] = await Workspace.create([
    { name: "Workspace A", createdBy: ownerA._id },
    { name: "Workspace B", createdBy: ownerB._id }
  ]);
  await Membership.create([
    { workspaceId: wsA._id, userId: ownerA._id, role: "OWNER" },
    { workspaceId: wsA._id, userId: memberA._id, role: "MEMBER" },
    { workspaceId: wsA._id, userId: viewerA._id, role: "VIEWER" },
    { workspaceId: wsB._id, userId: ownerB._id, role: "OWNER" }
  ]);
  const room = await Room.create({ ...roomPayload("Boardroom"), workspaceId: wsA._id });
  return {
    ownerA: await login("ownera@test.dev"),
    memberA: await login("membera@test.dev"),
    viewerA: await login("viewera@test.dev"),
    ownerB: await login("ownerb@test.dev"),
    wsA: String(wsA._id),
    wsB: String(wsB._id),
    roomA: String(room._id)
  };
}

function roomPayload(name: string) {
  return {
    name,
    capacity: 8,
    timezone: "Asia/Kolkata",
    bufferMinutes: 0,
    availabilityRules: [1, 2, 3, 4, 5].map((weekday) => ({ weekday, startTime: "09:00", endTime: "18:00" }))
  };
}

async function login(email: string): Promise<string> {
  const res = await request(app).post("/auth/login").send({ email, password: "Password123!" });
  const cookie = res.headers["set-cookie"];
  return Array.isArray(cookie) ? cookie[0] : String(cookie);
}
