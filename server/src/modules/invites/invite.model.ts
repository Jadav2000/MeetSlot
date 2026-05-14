import { Schema, model, type InferSchemaType } from "mongoose";
import { roles } from "../workspaces/membership.model.js";

const inviteSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, enum: roles, required: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type InviteDocument = InferSchemaType<typeof inviteSchema> & { _id: Schema.Types.ObjectId };
export const Invite = model("Invite", inviteSchema);

