"use client";

import { addDays, formatISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorCard, LoaderCard } from "@/components/ui/loader";
import { api } from "@/services/api";
import { queryKeys } from "@/services/queryKeys";
import type { Room, Slot, WorkspaceRole } from "@/types/api";

export default function RoomPage() {
  const { workspaceId, roomId } = useParams<{ workspaceId: string; roomId: string }>();
  const queryClient = useQueryClient();
  const range = useMemo(() => {
    const now = new Date();
    return { start: formatISO(now), end: formatISO(addDays(now, 14)) };
  }, []);
  const { start, end } = range;
  const workspace = useQuery({ queryKey: queryKeys.workspace(workspaceId), queryFn: () => api<{ role: WorkspaceRole }>(`/workspaces/${workspaceId}`) });
  const room = useQuery({ queryKey: queryKeys.room(roomId), queryFn: () => api<{ room: Room }>(`/rooms/${roomId}`) });
  const slots = useQuery({ queryKey: queryKeys.slots(roomId, start, end), queryFn: () => api<{ slots: Slot[]; timezone: string }>(`/rooms/${roomId}/slots?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`) });
  const book = useMutation({
    mutationFn: (slot: Slot) => api(`/rooms/${roomId}/bookings`, { method: "POST", body: JSON.stringify({ ...slot, title: "Meeting" }) }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["slots", roomId] }); toast.success("Booked"); },
    onError: (error) => toast.error(error.message)
  });
  const tz = room.data?.room.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  return (
    <AppShell>
      <h1 className="text-3xl font-semibold">{room.isLoading ? "Loading room..." : room.data?.room.name ?? "Room"}</h1>
      <p className="mt-1 text-sm text-slate-600">Availability shown in room timezone: {tz}</p>
      <div className="mt-6 grid gap-3 md:grid-cols-4">
        {(room.isLoading || workspace.isLoading || slots.isLoading) && <LoaderCard label="Loading availability..." />}
        {(room.isError || workspace.isError || slots.isError) && <ErrorCard message="Could not load room availability." />}
        {slots.data?.slots.length === 0 && <Card>No available slots in the next 14 days.</Card>}
        {slots.data?.slots.map((slot) => (
          <Card key={slot.startsAt} className="p-4">
            <p className="text-sm font-medium">{formatInTimeZone(slot.startsAt, tz, "EEE, MMM d")}</p>
            <p className="mt-1 text-sm text-slate-600">{formatInTimeZone(slot.startsAt, tz, "HH:mm")} - {formatInTimeZone(slot.endsAt, tz, "HH:mm")}</p>
            <p className="mt-1 text-xs text-slate-500">Local: {new Date(slot.startsAt).toLocaleTimeString()}</p>
            <Button className="mt-3 w-full" disabled={workspace.data?.role === "VIEWER" || book.isPending} onClick={() => book.mutate(slot)}>Book</Button>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
