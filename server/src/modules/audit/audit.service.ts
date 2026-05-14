import type { ClientSession, Types } from "mongoose";
import { AuditLog } from "./auditLog.model.js";

export async function writeAuditLog(args: {
  workspaceId: Types.ObjectId | string;
  actorId: Types.ObjectId | string;
  action: string;
  entityType: string;
  entityId: Types.ObjectId | string;
  before?: unknown;
  after?: unknown;
  session?: ClientSession;
}): Promise<void> {
  await AuditLog.create(
    [
      {
        workspaceId: args.workspaceId,
        actorId: args.actorId,
        action: args.action,
        entityType: args.entityType,
        entityId: args.entityId,
        before: args.before ?? null,
        after: args.after ?? null
      }
    ],
    { session: args.session }
  );
}
