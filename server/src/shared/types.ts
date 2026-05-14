import type { Types } from "mongoose";

export type WorkspaceRole = "OWNER" | "MEMBER" | "VIEWER";

export type ApiSuccess<T> = { success: true; data: T };
export type ApiFailure = { success: false; message: string; errors?: unknown[] };

export type AuthUser = {
  id: string;
  email: string;
  name: string;
};

export type WorkspaceContext = {
  id: string;
  role: WorkspaceRole;
  membershipId: string;
};

export type ObjectIdLike = Types.ObjectId | string;

