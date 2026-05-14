import { Schema, model, type InferSchemaType } from "mongoose";

const bookingSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    roomId: { type: Schema.Types.ObjectId, ref: "Room", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    title: { type: String, required: true, trim: true },
    canceledAt: { type: Date, default: null }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

bookingSchema.index(
  { roomId: 1, startsAt: 1, endsAt: 1 },
  { unique: true, partialFilterExpression: { canceledAt: null } }
);
bookingSchema.index({ workspaceId: 1, startsAt: 1 });

export type BookingDocument = InferSchemaType<typeof bookingSchema> & { _id: Schema.Types.ObjectId };
export const Booking = model("Booking", bookingSchema);

