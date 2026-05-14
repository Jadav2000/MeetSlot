import { z } from "zod";

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected HH:mm");

export const availabilityRuleSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startTime: timeSchema,
  endTime: timeSchema
}).refine((rule) => rule.endTime > rule.startTime, "endTime must be after startTime");

export const createRoomSchema = z.object({
  name: z.string().min(2).max(120),
  capacity: z.number().int().min(1).max(500),
  timezone: z.string().min(3),
  bufferMinutes: z.number().int().min(0).max(120).default(0),
  availabilityRules: z.array(availabilityRuleSchema).min(1)
});

export const updateRoomSchema = createRoomSchema.partial();

export const slotsQuerySchema = z.object({
  start: z.string().datetime({ offset: true }),
  end: z.string().datetime({ offset: true })
});
