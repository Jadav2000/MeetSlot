export const queryKeys = {
  me: ["me"] as const,
  workspaces: ["workspaces"] as const,
  workspace: (id: string) => ["workspace", id] as const,
  rooms: (workspaceId: string) => ["rooms", workspaceId] as const,
  room: (roomId: string) => ["room", roomId] as const,
  slots: (roomId: string, start: string, end: string) => ["slots", roomId, start, end] as const,
  bookings: (workspaceId: string) => ["bookings", workspaceId] as const,
  members: (workspaceId: string) => ["members", workspaceId] as const,
  invites: ["invites", "pending"] as const
};
