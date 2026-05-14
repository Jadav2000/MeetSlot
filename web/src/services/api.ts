import type { ApiFailure, ApiSuccess } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) }
  });
  const json = (await res.json()) as ApiSuccess<T> | ApiFailure;
  if (!res.ok || !json.success) throw new ApiError(res.status, json.success ? "Request failed" : json.message);
  return json.data;
}
