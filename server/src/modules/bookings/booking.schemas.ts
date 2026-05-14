import { z } from "zod";

export const createBookingSchema = z.object({
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  title: z.string().min(1).max(160)
}).refine((data) => new Date(data.endsAt) > new Date(data.startsAt), "endsAt must be after startsAt");
