import { Router } from "express";
import crypto from "node:crypto";
import { validate } from "../../middleware/validate.js";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { injectWorkspaceContext, requireWorkspaceRole } from "../../middleware/workspaceMiddleware.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import { badRequest, forbidden, notFound } from "../../shared/errors.js";
import { createRateLimiter } from "../../shared/rateLimiter.js";
import { Workspace } from "./workspace.model.js";
import { Membership } from "./membership.model.js";
import { Invite } from "../invites/invite.model.js";
import { Booking } from "../bookings/booking.model.js";
import { AuditLog } from "../audit/auditLog.model.js";
import { writeAuditLog } from "../audit/audit.service.js";
import { acceptInviteSchema, createWorkspaceSchema, inviteSchema, objectIdParam, updateMemberSchema } from "./workspace.schemas.js";
import { Room } from "../rooms/room.model.js";

export const workspaceRouter = Router();
const inviteLimiter = createRateLimiter({ windowMs: 60_000, limit: 10 });

workspaceRouter.use(authMiddleware);

workspaceRouter.post(
  "/",
  validate({ body: createWorkspaceSchema }),
  asyncHandler(async (req, res) => {
    const workspace = await Workspace.create({ name: req.body.name, createdBy: req.user?.id });
    await Membership.create({ workspaceId: workspace._id, userId: req.user?.id, role: "OWNER" });
    res.status(201).json({ success: true, data: { workspace } });
  })
);

workspaceRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const memberships = await Membership.find({ userId: req.user?.id }).lean();
    const workspaceIds = memberships.map((membership) => membership.workspaceId);
    const workspaces = await Workspace.find({ _id: { $in: workspaceIds } }).lean();
    res.json({ success: true, data: { workspaces, memberships } });
  })
);

workspaceRouter.get(
  "/invites/pending",
  asyncHandler(async (req, res) => {
    const invites = await Invite.find({ email: req.user?.email, expiresAt: { $gt: new Date() } })
      .populate("workspaceId", "name")
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: { invites } });
  })
);

workspaceRouter.get(
  "/:id",
  validate({ params: objectIdParam }),
  injectWorkspaceContext,
  asyncHandler(async (req, res) => {
    const workspace = await Workspace.findById(req.workspace?.id).lean();
    if (!workspace) throw notFound("Workspace not found");
    res.json({ success: true, data: { workspace, role: req.workspace?.role } });
  })
);

workspaceRouter.delete(
  "/:id",
  validate({ params: objectIdParam }),
  injectWorkspaceContext,
  requireWorkspaceRole("OWNER"),
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspace?.id;
    await Promise.all([
      Workspace.deleteOne({ _id: workspaceId }),
      Membership.deleteMany({ workspaceId }),
      Room.deleteMany({ workspaceId }),
      Booking.deleteMany({ workspaceId }),
      Invite.deleteMany({ workspaceId })
    ]);
    res.json({ success: true, data: { ok: true } });
  })
);

workspaceRouter.get(
  "/:id/members",
  validate({ params: objectIdParam }),
  injectWorkspaceContext,
  requireWorkspaceRole("OWNER"),
  asyncHandler(async (req, res) => {
    const members = await Membership.find({ workspaceId: req.workspace?.id }).populate("userId", "name email").lean();
    const validMembers = members.filter((member) => member.userId !== null);
    const danglingIds = members.filter((member) => member.userId === null).map((member) => member._id);
    if (danglingIds.length > 0) {
      await Membership.deleteMany({ _id: { $in: danglingIds }, workspaceId: req.workspace?.id });
    }
    res.json({ success: true, data: { members: validMembers } });
  })
);

workspaceRouter.post(
  "/:id/invites",
  inviteLimiter,
  validate({ params: objectIdParam, body: inviteSchema }),
  injectWorkspaceContext,
  requireWorkspaceRole("OWNER"),
  asyncHandler(async (req, res) => {
    const invite = await Invite.create({
      workspaceId: req.workspace?.id,
      email: req.body.email,
      role: req.body.role,
      token: crypto.randomBytes(24).toString("hex"),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    await writeAuditLog({
      workspaceId: invite.workspaceId,
      actorId: req.user?.id ?? "",
      action: "invite.created",
      entityType: "Invite",
      entityId: invite._id,
      after: invite.toObject()
    });
    console.log(`Invite token for ${invite.email}: ${invite.token}`);
    res.status(201).json({ success: true, data: { invite } });
  })
);

workspaceRouter.post(
  "/invites/accept",
  validate({ body: acceptInviteSchema }),
  asyncHandler(async (req, res) => {
    const invite = await Invite.findOne({ token: req.body.token });
    if (!invite || invite.expiresAt < new Date()) throw badRequest("Invite is invalid or expired");
    if (invite.email !== req.user?.email) throw forbidden("Invite email does not match signed-in user");
    const membership = await Membership.findOneAndUpdate(
      { workspaceId: invite.workspaceId, userId: req.user?.id },
      { workspaceId: invite.workspaceId, userId: req.user?.id, role: invite.role },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    await writeAuditLog({
      workspaceId: invite.workspaceId,
      actorId: req.user?.id ?? "",
      action: "invite.accepted",
      entityType: "Membership",
      entityId: membership._id,
      after: membership.toObject()
    });
    await invite.deleteOne();
    res.json({ success: true, data: { membership } });
  })
);

workspaceRouter.patch(
  "/:id/members/:memberId",
  validate({ params: objectIdParam.extend({ memberId: objectIdParam.shape.id }), body: updateMemberSchema }),
  injectWorkspaceContext,
  requireWorkspaceRole("OWNER"),
  asyncHandler(async (req, res) => {
    const before = await Membership.findOne({ _id: req.params.memberId, workspaceId: req.workspace?.id });
    if (!before) throw notFound("Member not found");
    before.role = req.body.role;
    await before.save();
    await writeAuditLog({
      workspaceId: before.workspaceId,
      actorId: req.user?.id ?? "",
      action: "member.role_changed",
      entityType: "Membership",
      entityId: before._id,
      after: before.toObject()
    });
    res.json({ success: true, data: { member: before } });
  })
);

workspaceRouter.delete(
  "/:id/members/:memberId",
  validate({ params: objectIdParam.extend({ memberId: objectIdParam.shape.id }) }),
  injectWorkspaceContext,
  requireWorkspaceRole("OWNER"),
  asyncHandler(async (req, res) => {
    const member = await Membership.findOne({ _id: req.params.memberId, workspaceId: req.workspace?.id });
    if (!member) throw notFound("Member not found");
    if (String(member.userId) === req.user?.id) throw forbidden("Owners cannot remove themselves");
    await member.deleteOne();
    res.json({ success: true, data: { ok: true } });
  })
);

workspaceRouter.get(
  "/:id/bookings",
  validate({ params: objectIdParam }),
  injectWorkspaceContext,
  requireWorkspaceRole("OWNER", "MEMBER", "VIEWER"),
  asyncHandler(async (req, res) => {
    const bookings = await Booking.find({ workspaceId: req.workspace?.id, canceledAt: null })
      .populate("roomId", "name timezone")
      .sort({ startsAt: 1 })
      .lean();
    res.json({ success: true, data: { bookings } });
  })
);

workspaceRouter.get(
  "/:id/audit-logs",
  validate({ params: objectIdParam }),
  injectWorkspaceContext,
  requireWorkspaceRole("OWNER"),
  asyncHandler(async (req, res) => {
    const logs = await AuditLog.find({ workspaceId: req.workspace?.id }).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ success: true, data: { logs } });
  })
);
