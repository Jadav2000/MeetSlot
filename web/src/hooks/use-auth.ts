"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import type { User } from "@/types/api";

export function useAuth() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: () => api<{ user: User }>("/auth/me"),
    retry: false
  });
}

