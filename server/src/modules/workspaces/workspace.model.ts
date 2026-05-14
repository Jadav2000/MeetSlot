import { Schema, model, type InferSchemaType } from "mongoose";

const workspaceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type WorkspaceDocument = InferSchemaType<typeof workspaceSchema> & { _id: Schema.Types.ObjectId };
export const Workspace = model("Workspace", workspaceSchema);

