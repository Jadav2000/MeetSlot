"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorCard, LoaderCard } from "@/components/ui/loader";
import { api } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import type { Booking, Room, WorkspaceRole } from "@/types/api";

export default function WorkspacePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm({ defaultValues: { name: "", capacity: 6, timezone: "Asia/Kolkata", bufferMinutes: 0 } });
  const workspace = useQuery({ queryKey: queryKeys.workspace(workspaceId), queryFn: () => api<{ workspace: { name: string }; role: WorkspaceRole }>(`/workspaces/${workspaceId}`) });
  const rooms = useQuery({ queryKey: queryKeys.rooms(workspaceId), queryFn: () => api<{ rooms: Room[] }>(`/workspaces/${workspaceId}/rooms`) });
  const bookings = useQuery({
    queryKey: queryKeys.bookings(workspaceId),
    queryFn: () => api<{ bookings: Booking[] }>(`/workspaces/${workspaceId}/bookings`),
    enabled: Boolean(workspace.data?.role)
  });
  const createRoom = useMutation({
    mutationFn: (values: { name: string; capacity: number; timezone: string; bufferMinutes: number }) => api(`/workspaces/${workspaceId}/rooms`, {
      method: "POST",
      body: JSON.stringify({ ...values, capacity: Number(values.capacity), bufferMinutes: Number(values.bufferMinutes), availabilityRules: [1, 2, 3, 4, 5].map((weekday) => ({ weekday, startTime: "09:00", endTime: "18:00" })) })
    }),
    onSuccess: async () => { reset(); await queryClient.invalidateQueries({ queryKey: queryKeys.rooms(workspaceId) }); toast.success("Room created"); },
    onError: (error) => toast.error(error.message)
  });
  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">{workspace.data?.workspace.name ?? "Workspace"}</h1>
          <p className="mt-1 text-sm text-slate-600">Role: {workspace.data?.role ?? "..."}</p>
        </div>
        {workspace.data?.role === "OWNER" && <Link className="text-sm text-primary" href={`/workspaces/${workspaceId}/members`}>Manage members</Link>}
      </div>
      {workspace.data?.role === "OWNER" && (
        <form onSubmit={handleSubmit((v) => createRoom.mutate(v))} className="mt-6 grid gap-3 rounded-lg border border-border bg-white p-4 md:grid-cols-5">
          <Input placeholder="Room name" {...register("name", { required: true })} />
          <Input type="number" placeholder="Capacity" {...register("capacity", { valueAsNumber: true })} />
          <Input placeholder="Timezone" {...register("timezone")} />
          <Input type="number" placeholder="Buffer" {...register("bufferMinutes", { valueAsNumber: true })} />
          <Button>Create room</Button>
        </form>
      )}
      <h2 className="mt-8 text-xl font-semibold">Rooms</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {(workspace.isLoading || rooms.isLoading) && <LoaderCard label="Loading workspace..." />}
        {(workspace.isError || rooms.isError) && <ErrorCard message="Could not load workspace data." />}
        {rooms.data?.rooms.length === 0 && <Card>No rooms yet.</Card>}
        {rooms.data?.rooms.map((room) => (
          <Link key={room._id} href={`/workspaces/${workspaceId}/rooms/${room._id}`}>
            <Card className="transition hover:border-primary">
              <h3 className="font-semibold">{room.name}</h3>
              <p className="mt-2 text-sm text-slate-600">{room.capacity} people · {room.timezone}</p>
              <p className="mt-1 text-sm text-slate-600">{room.bufferMinutes} min buffer</p>
            </Card>
          </Link>
        ))}
      </div>
      <h2 className="mt-8 text-xl font-semibold">Today's bookings</h2>
      <div className="mt-4 grid gap-3">
        {bookings.isLoading && <LoaderCard label="Loading bookings..." />}
        {bookings.isError && <ErrorCard message="Could not load bookings." />}
        {bookings.data?.bookings.length === 0 && <Card>No bookings yet.</Card>}
        {bookings.data?.bookings.slice(0, 5).map((booking) => <Card key={booking._id}>{booking.title} · {new Date(booking.startsAt).toLocaleString()}</Card>)}
        {workspace.data?.role === "VIEWER" && <Card>Viewer access is read-only. Booking creation and management are disabled.</Card>}
      </div>
    </AppShell>
  );
}
