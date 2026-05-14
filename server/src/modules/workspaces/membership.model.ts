import { Schema, model, type InferSchemaType } from "mongoose";

export const roles = ["OWNER", "MEMBER", "VIEWER"] as const;

const membershipSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
    role: { type: String, enum: roles, required: true }
  },
  { timestamps: true }
);

membershipSchema.index({ userId: 1, workspaceId: 1 }, { unique: true });
membershipSchema.index({ workspaceId: 1, role: 1 });

export type MembershipDocument = InferSchemaType<typeof membershipSchema> & { _id: Schema.Types.ObjectId };
export const Membership = model("Membership", membershipSchema);

