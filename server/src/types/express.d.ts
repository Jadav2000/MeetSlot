import type { AuthUser, WorkspaceContext } from "../shared/types.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      workspace?: WorkspaceContext;
    }
  }
}

export {};
