import { Router } from "express";
import mongoose from "mongoose";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { validate } from "../../middleware/validate.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import { conflict, forbidden, notFound } from "../../shared/errors.js";
import { createRateLimiter } from "../../shared/rateLimiter.js";
import { bookingIdParam, roomIdParam } from "../workspaces/workspace.schemas.js";
import { createBookingSchema } from "./booking.schemas.js";
import { Booking } from "./booking.model.js";
import { roomWorkspaceForUser } from "../rooms/room.routes.js";
import { generateSlots } from "../../utils/time.js";
import { writeAuditLog } from "../audit/audit.service.js";

const bookingLimiter = createRateLimiter({ windowMs: 60_000, limit: 30 });

export const bookingRouter = Router();
bookingRouter.use(authMiddleware);

bookingRouter.post(
  "/rooms/:roomId/bookings",
  bookingLimiter,
  validate({ params: roomIdParam, body: createBookingSchema }),
  asyncHandler(async (req, res) => {
    const room = await roomWorkspaceForUser(req.params.roomId, req.user?.id ?? "");
    if (room.role === "VIEWER") throw forbidden("Viewers cannot create bookings");
    const startsAt = new Date(req.body.startsAt);
    const endsAt = new Date(req.body.endsAt);
    const existing = await Booking.find({
      workspaceId: room.workspaceId,
      roomId: room._id,
      canceledAt: null,
      startsAt: { $lt: endsAt },
      endsAt: { $gt: startsAt }
    }).lean();
    const validSlot = generateSlots({
      start: startsAt,
      end: endsAt,
      timezone: room.timezone,
      rules: room.availabilityRules,
      existing: existing.map((booking) => ({ startsAt: booking.startsAt, endsAt: booking.endsAt })),
      bufferMinutes: room.bufferMinutes
    }).some((slot) => slot.startsAt.getTime() === startsAt.getTime() && slot.endsAt.getTime() === endsAt.getTime());
    if (!validSlot) throw conflict("Slot is unavailable");

    const session = await mongoose.startSession();
    try {
      let createdId = "";
      await session.withTransaction(async () => {
        const created = await Booking.create(
          [{ workspaceId: room.workspaceId, roomId: room._id, userId: req.user?.id, startsAt, endsAt, title: req.body.title }],
          { session }
        );
        createdId = String(created[0]._id);
        await writeAuditLog({
          workspaceId: room.workspaceId,
          actorId: req.user?.id ?? "",
          action: "booking.created",
          entityType: "Booking",
          entityId: created[0]._id,
          after: created[0].toObject(),
          session
        });
      });
      const booking = await Booking.findById(createdId).lean();
      res.status(201).json({ success: true, data: { booking } });
    } finally {
      await session.endSession();
    }
  })
);

bookingRouter.delete(
  "/bookings/:bookingId",
  validate({ params: bookingIdParam }),
  asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking || booking.canceledAt) throw notFound("Booking not found");
    const room = await roomWorkspaceForUser(String(booking.roomId), req.user?.id ?? "");
    if (room.role !== "OWNER" && String(booking.userId) !== req.user?.id) throw forbidden("Only owners or booking creators can cancel");
    const before = booking.toObject();
    booking.canceledAt = new Date();
    await booking.save();
    await writeAuditLog({
      workspaceId: booking.workspaceId,
      actorId: req.user?.id ?? "",
      action: "booking.canceled",
      entityType: "Booking",
      entityId: booking._id,
      before,
      after: booking.toObject()
    });
    res.json({ success: true, data: { booking } });
  })
);
