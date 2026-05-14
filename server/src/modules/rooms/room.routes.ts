import { Router } from "express";
import { addDays } from "date-fns";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { injectWorkspaceContext, requireWorkspaceRole } from "../../middleware/workspaceMiddleware.js";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import { forbidden, notFound } from "../../shared/errors.js";
import { objectIdParam, roomIdParam } from "../workspaces/workspace.schemas.js";
import { createRoomSchema, slotsQuerySchema, updateRoomSchema } from "./room.schemas.js";
import { Room } from "./room.model.js";
import { Booking } from "../bookings/booking.model.js";
import { Membership } from "../workspaces/membership.model.js";
import { generateSlots } from "../../utils/time.js";
import { writeAuditLog } from "../audit/audit.service.js";

export const roomRouter = Router();
roomRouter.use(authMiddleware);

roomRouter.post(
  "/workspaces/:id/rooms",
  validate({ params: objectIdParam, body: createRoomSchema }),
  injectWorkspaceContext,
  requireWorkspaceRole("OWNER"),
  asyncHandler(async (req, res) => {
    const room = await Room.create({ ...req.body, workspaceId: req.workspace?.id });
    res.status(201).json({ success: true, data: { room } });
  })
);

roomRouter.get(
  "/workspaces/:id/rooms",
  validate({ params: objectIdParam }),
  injectWorkspaceContext,
  asyncHandler(async (req, res) => {
    const rooms = await Room.find({ workspaceId: req.workspace?.id }).sort({ name: 1 }).lean();
    res.json({ success: true, data: { rooms } });
  })
);

roomRouter.get(
  "/rooms/:roomId",
  validate({ params: roomIdParam }),
  asyncHandler(async (req, res) => {
    const room = await findRoomForUser(req.params.roomId, req.user?.id ?? "");
    res.json({ success: true, data: { room } });
  })
);

roomRouter.patch(
  "/rooms/:roomId",
  validate({ params: roomIdParam, body: updateRoomSchema }),
  asyncHandler(async (req, res) => {
    const room = await findRoomForUser(req.params.roomId, req.user?.id ?? "");
    if (room.role !== "OWNER") throw forbidden();
    const updated = await Room.findOneAndUpdate({ _id: room._id, workspaceId: room.workspaceId }, req.body, { new: true });
    res.json({ success: true, data: { room: updated } });
  })
);

roomRouter.delete(
  "/rooms/:roomId",
  validate({ params: roomIdParam }),
  asyncHandler(async (req, res) => {
    const room = await findRoomForUser(req.params.roomId, req.user?.id ?? "");
    if (room.role !== "OWNER") throw forbidden();
    await Room.deleteOne({ _id: room._id, workspaceId: room.workspaceId });
    res.json({ success: true, data: { ok: true } });
  })
);

roomRouter.get(
  "/rooms/:roomId/slots",
  validate({ params: roomIdParam, query: slotsQuerySchema }),
  asyncHandler(async (req, res) => {
    const room = await findRoomForUser(req.params.roomId, req.user?.id ?? "");
    const start = new Date(String(req.query.start));
    const requestedEnd = new Date(String(req.query.end));
    const maxEnd = addDays(start, 14);
    const end = requestedEnd > maxEnd ? maxEnd : requestedEnd;
    const bookings = await Booking.find({
      workspaceId: room.workspaceId,
      roomId: room._id,
      canceledAt: null,
      startsAt: { $lt: end },
      endsAt: { $gt: start }
    }).lean();
    const slots = generateSlots({
      start,
      end,
      timezone: room.timezone,
      rules: room.availabilityRules,
      existing: bookings.map((booking) => ({ startsAt: booking.startsAt, endsAt: booking.endsAt })),
      bufferMinutes: room.bufferMinutes
    });
    res.json({ success: true, data: { slots, timezone: room.timezone } });
  })
);

async function findRoomForUser(roomId: string, userId: string) {
  const room = await Room.findById(roomId).lean();
  if (!room) throw notFound("Room not found");
  const membership = await Membership.findOne({ userId, workspaceId: room.workspaceId }).lean();
  if (!membership) throw forbidden("You do not belong to this workspace");
  return { ...room, role: membership.role };
}

export async function roomWorkspaceForUser(roomId: string, userId: string) {
  return findRoomForUser(roomId, userId);
}

