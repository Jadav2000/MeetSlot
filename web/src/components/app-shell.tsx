"use client";

import Link from "next/link";
import { Bell, CalendarDays, Check, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, api } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import type { Invite, Membership, Workspace } from "@/types/api";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const pendingInvites = useQuery({
    queryKey: queryKeys.invites,
    queryFn: () => api<{ invites: Invite[] }>("/workspaces/invites/pending"),
    retry: false
  });
  const { data } = useQuery({
    queryKey: queryKeys.workspaces,
    queryFn: async () => {
      try {
        return await api<{ workspaces: Workspace[]; memberships: Membership[] }>("/workspaces");
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          queryClient.clear();
          router.push("/login");
        }
        throw error;
      }
    },
    retry: false
  });
  const acceptInvite = useMutation({
    mutationFn: (token: string) => api("/workspaces/invites/accept", { method: "POST", body: JSON.stringify({ token }) }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.invites }),
        queryClient.invalidateQueries({ queryKey: queryKeys.workspaces })
      ]);
      toast.success("Workspace joined");
      router.push("/dashboard");
    },
    onError: (error) => toast.error(error.message)
  });
  async function logout() {
    await api("/auth/logout", { method: "POST" });
    queryClient.clear();
    router.push("/login");
  }
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold">
            <CalendarDays className="h-5 w-5 text-primary" /> MeetSlot
          </Link>
          <div className="flex items-center gap-3">
            {pendingInvites.data && pendingInvites.data.invites.length > 0 && (
              <div className="flex max-w-md items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <Bell className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  Invite to {workspaceName(pendingInvites.data.invites[0])} as {pendingInvites.data.invites[0].role}
                </span>
                <Button
                  className="h-8 bg-amber-700 px-2"
                  disabled={acceptInvite.isPending}
                  onClick={() => acceptInvite.mutate(pendingInvites.data.invites[0].token)}
                  title="Accept invite"
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            )}
            <select className="h-10 rounded-md border border-border bg-white px-3 text-sm" onChange={(e) => e.target.value && router.push(`/workspaces/${e.target.value}`)} defaultValue="">
              <option value="" disabled>Switch workspace</option>
              {data?.workspaces.map((workspace) => <option key={workspace._id} value={workspace._id}>{workspace.name}</option>)}
            </select>
            <Button className="bg-slate-900 px-3" onClick={logout} title="Log out"><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}

function workspaceName(invite: Invite): string {
  return typeof invite.workspaceId === "string" ? "workspace" : invite.workspaceId.name;
}
