import type { NextFunction, Request, Response } from "express";
import { Membership } from "../modules/workspaces/membership.model.js";
import { forbidden, notFound, unauthorized } from "../shared/errors.js";
import type { WorkspaceRole } from "../shared/types.js";

export async function injectWorkspaceContext(req: Request, _res: Response, next: NextFunction): Promise<void> {
  if (!req.user) return next(unauthorized());
  const workspaceId = req.params.id ?? req.params.workspaceId;
  if (!workspaceId) return next(notFound("Workspace context missing"));

  const membership = await Membership.findOne({ userId: req.user.id, workspaceId }).lean();
  if (!membership) return next(forbidden("You do not belong to this workspace"));

  req.workspace = {
    id: String(membership.workspaceId),
    role: membership.role as WorkspaceRole,
    membershipId: String(membership._id)
  };
  next();
}

export function requireWorkspaceRole(...roles: WorkspaceRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.workspace) return next(forbidden("Workspace context missing"));
    if (!roles.includes(req.workspace.role)) return next(forbidden());
    next();
  };
}

