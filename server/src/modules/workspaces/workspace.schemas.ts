import { z } from "zod";

export const objectIdParam = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) });
export const roomIdParam = z.object({ roomId: z.string().regex(/^[a-f\d]{24}$/i) });
export const bookingIdParam = z.object({ bookingId: z.string().regex(/^[a-f\d]{24}$/i) });

export const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(120)
});

export const inviteSchema = z.object({
  email: z.string().email().toLowerCase(),
  role: z.enum(["OWNER", "MEMBER", "VIEWER"])
});

export const acceptInviteSchema = z.object({
  token: z.string().min(32)
});

export const updateMemberSchema = z.object({
  role: z.enum(["OWNER", "MEMBER", "VIEWER"])
});
