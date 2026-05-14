import { Schema, model, type InferSchemaType } from "mongoose";

const availabilityRuleSchema = new Schema(
  {
    weekday: { type: Number, required: true, min: 0, max: 6 },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true }
  },
  { _id: false }
);

const roomSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    name: { type: String, required: true, trim: true },
    capacity: { type: Number, required: true, min: 1 },
    timezone: { type: String, required: true },
    bufferMinutes: { type: Number, required: true, default: 0, min: 0, max: 120 },
    availabilityRules: { type: [availabilityRuleSchema], required: true }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

roomSchema.index({ workspaceId: 1, name: 1 });

export type RoomDocument = InferSchemaType<typeof roomSchema> & { _id: Schema.Types.ObjectId };
export const Room = model("Room", roomSchema);

