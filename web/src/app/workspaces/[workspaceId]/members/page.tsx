"use client";

import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ErrorCard, LoaderCard } from "@/components/ui/loader";
import { ApiError, api } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import type { Membership, WorkspaceRole } from "@/types/api";

export default function MembersPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm<{ email: string; role: WorkspaceRole }>({ defaultValues: { role: "MEMBER" } });
  const members = useQuery({ queryKey: queryKeys.members(workspaceId), queryFn: () => api<{ members: Membership[] }>(`/workspaces/${workspaceId}/members`) });
  const invite = useMutation({
    mutationFn: (values: { email: string; role: WorkspaceRole }) => api(`/workspaces/${workspaceId}/invites`, { method: "POST", body: JSON.stringify(values) }),
    onSuccess: async () => {
      reset();
      await queryClient.invalidateQueries({ queryKey: queryKeys.members(workspaceId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.workspaces });
      toast.success("Invite created");
    },
    onError: (error) => toast.error(error.message)
  });
  const roleChange = useMutation({
    mutationFn: (values: { id: string; role: WorkspaceRole }) => api(`/workspaces/${workspaceId}/members/${values.id}`, { method: "PATCH", body: JSON.stringify({ role: values.role }) }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: queryKeys.members(workspaceId) }),
    onError: (error) => toast.error(error.message)
  });
  const membersError = members.error instanceof ApiError ? members.error : null;
  return (
    <AppShell>
      <h1 className="text-3xl font-semibold">Members</h1>
      <form onSubmit={handleSubmit((v) => invite.mutate(v))} className="mt-6 flex gap-2">
        <Input placeholder="Email" {...register("email", { required: true })} />
        <select className="h-10 rounded-md border border-border bg-white px-3 text-sm" {...register("role")}>
          <option value="OWNER">Owner</option>
          <option value="MEMBER">Member</option>
          <option value="VIEWER">Viewer</option>
        </select>
        <Button>Invite</Button>
      </form>
      <div className="mt-6 grid gap-3">
        {members.isLoading && <LoaderCard label="Loading members..." />}
        {membersError?.status === 401 && <ErrorCard message="Your session expired. Log in again to manage members." />}
        {membersError?.status === 403 && <ErrorCard message="Only workspace owners can manage members. Switch to a workspace where you are OWNER." />}
        {members.isError && !membersError && <ErrorCard message="Could not load members." />}
        {members.data?.members.length === 0 && <Card>No members found.</Card>}
        {members.data?.members.map((member) => {
          const user =
            typeof member.userId === "string"
              ? { name: "Unknown user", email: member.userId }
              : member.userId ?? { name: "Unknown user", email: "Missing user record" };
          return (
            <Card key={member._id} className="flex items-center justify-between">
              <div><p className="font-medium">{user.name}</p><p className="text-sm text-slate-600">{user.email}</p></div>
              <select className="h-10 rounded-md border border-border bg-white px-3 text-sm" value={member.role} onChange={(e) => roleChange.mutate({ id: member._id, role: e.target.value as WorkspaceRole })}>
                <option value="OWNER">Owner</option>
                <option value="MEMBER">Member</option>
                <option value="VIEWER">Viewer</option>
              </select>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
