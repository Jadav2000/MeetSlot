export type WorkspaceRole = "OWNER" | "MEMBER" | "VIEWER";
export type User = { id: string; email: string; name: string };
export type Workspace = { _id: string; name: string; createdBy: string; createdAt: string };
export type Membership = { _id: string; userId: string | { _id: string; name: string; email: string } | null; workspaceId: string; role: WorkspaceRole };
export type AvailabilityRule = { weekday: number; startTime: string; endTime: string };
export type Room = { _id: string; workspaceId: string; name: string; capacity: number; timezone: string; bufferMinutes: number; availabilityRules: AvailabilityRule[] };
export type Booking = { _id: string; workspaceId: string; roomId: string | Room; userId: string; startsAt: string; endsAt: string; title: string; canceledAt: string | null };
export type Slot = { startsAt: string; endsAt: string };
export type Invite = { _id: string; workspaceId: string | Pick<Workspace, "_id" | "name">; email: string; role: WorkspaceRole; token: string; expiresAt: string };

export type ApiSuccess<T> = { success: true; data: T };
export type ApiFailure = { success: false; message: string; errors?: unknown[] };
