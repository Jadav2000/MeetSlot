import { Schema, model, type InferSchemaType } from "mongoose";

const auditLogSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ workspaceId: 1, createdAt: -1 });

export type AuditLogDocument = InferSchemaType<typeof auditLogSchema> & { _id: Schema.Types.ObjectId };
export const AuditLog = model("AuditLog", auditLogSchema);
