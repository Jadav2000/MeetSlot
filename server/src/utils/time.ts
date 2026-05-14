import { addDays, addMinutes, format, isBefore, parse, startOfDay } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

export type AvailabilityRule = {
  weekday: number;
  startTime: string;
  endTime: string;
};

export type Slot = {
  startsAt: Date;
  endsAt: Date;
};

export function convertRoomAvailabilityToUTC(dateInRange: Date, rule: AvailabilityRule, timezone: string): Slot {
  const zonedDate = toZonedTime(dateInRange, timezone);
  const day = format(zonedDate, "yyyy-MM-dd");
  const startLocal = parse(`${day} ${rule.startTime}`, "yyyy-MM-dd HH:mm", new Date());
  const endLocal = parse(`${day} ${rule.endTime}`, "yyyy-MM-dd HH:mm", new Date());
  return {
    startsAt: fromZonedTime(startLocal, timezone),
    endsAt: fromZonedTime(endLocal, timezone)
  };
}

export function convertUTCToViewerTZ(date: Date, timezone: string): string {
  return format(toZonedTime(date, timezone), "yyyy-MM-dd HH:mm");
}

export function generateSlots(args: {
  start: Date;
  end: Date;
  timezone: string;
  rules: AvailabilityRule[];
  existing: Slot[];
  bufferMinutes?: number;
  slotMinutes?: number;
}): Slot[] {
  const slotMinutes = args.slotMinutes ?? 30;
  const bufferMinutes = args.bufferMinutes ?? 0;
  const slots: Slot[] = [];
  let cursor = startOfDay(args.start);

  while (isBefore(cursor, args.end)) {
    const zoned = toZonedTime(cursor, args.timezone);
    const weekday = zoned.getDay();
    const dayRules = args.rules.filter((rule) => rule.weekday === weekday);

    for (const rule of dayRules) {
      const window = convertRoomAvailabilityToUTC(cursor, rule, args.timezone);
      let slotStart = window.startsAt;
      while (isBefore(addMinutes(slotStart, slotMinutes), addMinutes(window.endsAt, 1))) {
        const slotEnd = addMinutes(slotStart, slotMinutes);
        if (slotStart >= args.start && slotEnd <= args.end && !overlapsBooked(slotStart, slotEnd, args.existing, bufferMinutes)) {
          slots.push({ startsAt: slotStart, endsAt: slotEnd });
        }
        slotStart = addMinutes(slotStart, slotMinutes);
      }
    }

    cursor = addDays(cursor, 1);
  }

  return slots.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

function overlapsBooked(startsAt: Date, endsAt: Date, existing: Slot[], bufferMinutes: number): boolean {
  return existing.some((booking) => {
    const blockedStart = addMinutes(booking.startsAt, -bufferMinutes);
    const blockedEnd = addMinutes(booking.endsAt, bufferMinutes);
    return startsAt < blockedEnd && endsAt > blockedStart;
  });
}

