// Single source of truth for dog-calendar event vocabulary + the recurrence math.
// Values are stable keys (never localized); the UI translates via `dogEvent.type.<key>`
// and `dogEvent.recurrence.<key>`. No React imports — safe to unit-test.

import type { DogEventRecurrence, DogEventType } from "@/types";

export const DOG_EVENT_TYPES = [
  "vaccination",
  "vet_visit",
  "exam",
  "grooming",
  "medication",
  "other",
] as const satisfies readonly DogEventType[];

export const DOG_EVENT_RECURRENCES = [
  "none",
  "daily",
  "weekly",
  "monthly",
  "yearly",
] as const satisfies readonly DogEventRecurrence[];

// Parse a yyyy-mm-dd string to a UTC date at midnight. Using UTC keeps the pure date
// math free of local-timezone/DST drift — we only ever care about the calendar day.
function parseDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function todayUTC(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

/**
 * The next occurrence of an event on or after `from` (default: today), as yyyy-mm-dd.
 * - `none`: the event date itself if it is today or future, else null (no upcoming).
 * - recurring: roll `event_date` forward by `interval` units of the recurrence until it
 *   lands on or after `from`. Returns null only for an unparseable date.
 */
export function nextOccurrence(
  eventDate: string,
  recurrence: DogEventRecurrence,
  interval: number,
  from: Date = todayUTC(),
): string | null {
  const start = parseDate(eventDate);
  if (!start) return null;

  if (recurrence === "none") {
    return start.getTime() >= from.getTime() ? toISO(start) : null;
  }

  const step = Math.max(1, Math.floor(interval || 1));
  const d = new Date(start.getTime());
  // Guard the loop; 1000 iterations covers any sane interval/date combination.
  for (let i = 0; i < 1000 && d.getTime() < from.getTime(); i++) {
    switch (recurrence) {
      case "daily":
        d.setUTCDate(d.getUTCDate() + step);
        break;
      case "weekly":
        d.setUTCDate(d.getUTCDate() + step * 7);
        break;
      case "monthly":
        d.setUTCMonth(d.getUTCMonth() + step);
        break;
      case "yearly":
        d.setUTCFullYear(d.getUTCFullYear() + step);
        break;
    }
  }
  return toISO(d);
}
