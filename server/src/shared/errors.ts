export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly errors?: unknown[]
  ) {
    super(message);
  }
}

export const badRequest = (message: string, errors?: unknown[]): AppError => new AppError(400, message, errors);
export const unauthorized = (message = "Authentication required"): AppError => new AppError(401, message);
export const forbidden = (message = "Insufficient permissions"): AppError => new AppError(403, message);
export const notFound = (message = "Resource not found"): AppError => new AppError(404, message);
export const conflict = (message = "Conflict"): AppError => new AppError(409, message);

