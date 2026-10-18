import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { t, type Locale } from "@/lib/i18n";
import { DOG_EVENT_RECURRENCES, DOG_EVENT_TYPES, nextOccurrence } from "@/lib/dogEventAttributes";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DogEvent, DogEventRecurrence, DogEventType } from "@/types";

interface Props {
  dogs: { id: string; name: string }[];
  initialEvents: DogEvent[];
  locale: Locale;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function DogCalendar({ dogs, initialEvents, locale }: Props) {
  const [events, setEvents] = useState<DogEvent[]>(initialEvents);
  const [dogId, setDogId] = useState(dogs[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<DogEventType>("vaccination");
  const [eventDate, setEventDate] = useState(todayISO());
  const [recurrence, setRecurrence] = useState<DogEventRecurrence>("none");
  const [interval, setIntervalValue] = useState("1");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dogName = useMemo(() => {
    const map: Record<string, string> = {};
    for (const d of dogs) map[d.id] = d.name;
    return map;
  }, [dogs]);

  // Sorted for display: upcoming occurrences first (soonest at top), past one-offs last.
  const sorted = useMemo(() => {
    return [...events]
      .map((e) => ({ event: e, next: nextOccurrence(e.eventDate, e.recurrence, e.recurrenceInterval) }))
      .sort((a, b) => {
        if (a.next && b.next) return a.next.localeCompare(b.next);
        if (a.next) return -1;
        if (b.next) return 1;
        return b.event.eventDate.localeCompare(a.event.eventDate);
      });
  }, [events]);

  const inputClass = cn(
    "border-input bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm",
    "focus:ring-ring focus:ring-2 focus:outline-none",
  );

  async function add(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || !dogId || title.trim().length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/dog-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dogId,
          title: title.trim(),
          type,
          eventDate,
          recurrence,
          recurrenceInterval: recurrence === "none" ? 1 : Number(interval) || 1,
          notes: notes.trim(),
        }),
      });
      const data = (await res.json()) as { event?: DogEvent; error?: string };
      const created = data.event;
      if (!res.ok || !created) {
        setError(data.error ?? t(locale, "dogEvent.saveError"));
        return;
      }
      setEvents((prev) => [...prev, created]);
      setTitle("");
      setNotes("");
    } catch {
      setError(t(locale, "dogEvent.saveError"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/dog-events?id=${id}`, { method: "DELETE" });
    if (res.ok) setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  function formatDate(iso: string): string {
    return new Date(`${iso}T00:00:00Z`).toLocaleDateString(locale === "pl" ? "pl-PL" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  return (
    <div className="space-y-6">
      {/* Add form */}
      <form onSubmit={(e) => void add(e)} className="border-border space-y-3 rounded-xl border p-4">
        <h2 className="text-foreground text-sm font-semibold">{t(locale, "dogEvent.addTitle")}</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="c-dog" className="text-muted-foreground mb-1 block text-sm">
              {t(locale, "dogEvent.dog")}
            </label>
            <select
              id="c-dog"
              value={dogId}
              onChange={(e) => {
                setDogId(e.target.value);
              }}
              className={inputClass}
            >
              {dogs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="c-type" className="text-muted-foreground mb-1 block text-sm">
              {t(locale, "dogEvent.type")}
            </label>
            <select
              id="c-type"
              value={type}
              onChange={(e) => {
                setType(e.target.value as DogEventType);
              }}
              className={inputClass}
            >
              {DOG_EVENT_TYPES.map((v) => (
                <option key={v} value={v}>
                  {t(locale, `dogEvent.type.${v}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="c-title" className="text-muted-foreground mb-1 block text-sm">
            {t(locale, "dogEvent.titleLabel")}
          </label>
          <input
            id="c-title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
            }}
            placeholder={t(locale, "dogEvent.titlePlaceholder")}
            className={inputClass}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="c-date" className="text-muted-foreground mb-1 block text-sm">
              {t(locale, "dogEvent.date")}
            </label>
            <input
              id="c-date"
              type="date"
              value={eventDate}
              onChange={(e) => {
                setEventDate(e.target.value);
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="c-rec" className="text-muted-foreground mb-1 block text-sm">
              {t(locale, "dogEvent.recurrence")}
            </label>
            <select
              id="c-rec"
              value={recurrence}
              onChange={(e) => {
                setRecurrence(e.target.value as DogEventRecurrence);
              }}
              className={inputClass}
            >
              {DOG_EVENT_RECURRENCES.map((v) => (
                <option key={v} value={v}>
                  {t(locale, `dogEvent.recurrence.${v}`)}
                </option>
              ))}
            </select>
          </div>
          {recurrence !== "none" && (
            <div>
              <label htmlFor="c-int" className="text-muted-foreground mb-1 block text-sm">
                {t(locale, "dogEvent.interval")}
              </label>
              <input
                id="c-int"
                type="number"
                min="1"
                max="365"
                value={interval}
                onChange={(e) => {
                  setIntervalValue(e.target.value);
                }}
                className={inputClass}
              />
            </div>
          )}
        </div>

        <div>
          <label htmlFor="c-notes" className="text-muted-foreground mb-1 block text-sm">
            {t(locale, "dogEvent.notes")}
          </label>
          <input
            id="c-notes"
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
            }}
            className={inputClass}
          />
        </div>

        {error ? <p className="text-destructive text-sm">{error}</p> : null}

        <button type="submit" disabled={busy || !dogId} className={cn(buttonVariants({ size: "sm" }), "gap-1")}>
          <Plus className="size-4" /> {t(locale, "dogEvent.add")}
        </button>
      </form>

      {/* List */}
      {sorted.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t(locale, "dogEvent.empty")}</p>
      ) : (
        <ul className="divide-border border-border divide-y rounded-xl border">
          {sorted.map(({ event, next }) => (
            <li key={event.id} className="flex items-start gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-foreground font-medium">{event.title}</p>
                <p className="text-muted-foreground text-xs">
                  {t(locale, `dogEvent.type.${event.type}`)} · {dogName[event.dogId] ?? "—"}
                  {event.recurrence !== "none" ? ` · ${t(locale, `dogEvent.recurrence.${event.recurrence}`)}` : ""}
                </p>
                <p className={cn("mt-0.5 text-xs", next ? "text-primary" : "text-muted-foreground")}>
                  {next ? formatDate(next) : t(locale, "dogEvent.past")}
                </p>
                {event.notes ? <p className="text-muted-foreground mt-1 text-xs">{event.notes}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => void remove(event.id)}
                aria-label={t(locale, "dogEvent.delete")}
                className="text-muted-foreground hover:text-destructive shrink-0 transition-colors"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
