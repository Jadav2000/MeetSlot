"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { api } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import type { Membership, Workspace } from "@/types/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ErrorCard, LoaderCard } from "@/components/ui/loader";

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm<{ name: string }>();
  const { data, isError, isLoading } = useQuery({ queryKey: queryKeys.workspaces, queryFn: () => api<{ workspaces: Workspace[]; memberships: Membership[] }>("/workspaces") });
  const createWorkspace = useMutation({
    mutationFn: (values: { name: string }) => api("/workspaces", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: async () => { reset(); await queryClient.invalidateQueries({ queryKey: queryKeys.workspaces }); toast.success("Workspace created"); },
    onError: (error) => toast.error(error.message)
  });
  return (
    <AppShell>
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">Your workspaces and room operations.</p>
        </div>
        <form onSubmit={handleSubmit((v) => createWorkspace.mutate(v))} className="flex gap-2">
          <Input placeholder="New workspace" {...register("name", { required: true })} />
          <Button>Create</Button>
        </form>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {isLoading && <LoaderCard label="Loading workspaces..." />}
        {isError && <ErrorCard message="Could not load workspaces." />}
        {data?.workspaces.length === 0 && <Card>No workspaces yet.</Card>}
        {data?.workspaces.map((workspace) => (
          <Link href={`/workspaces/${workspace._id}`} key={workspace._id}>
            <Card className="transition hover:border-primary">
              <h2 className="font-semibold">{workspace.name}</h2>
              <p className="mt-2 text-sm text-slate-600">Open rooms, bookings, and members.</p>
            </Card>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
