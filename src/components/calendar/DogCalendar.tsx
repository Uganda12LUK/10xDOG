import { useMemo, useState } from "react";
import { Save, Pencil, Trash2 } from "lucide-react";
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
  const [eventTime, setEventTime] = useState("");
  const [recurrence, setRecurrence] = useState<DogEventRecurrence>("none");
  const [interval, setIntervalValue] = useState("1");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const dogName = useMemo(() => {
    const map: Record<string, string> = {};
    for (const d of dogs) map[d.id] = d.name;
    return map;
  }, [dogs]);

  // Upcoming occurrences first (soonest at top), past one-offs last.
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

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setType("vaccination");
    setEventDate(todayISO());
    setEventTime("");
    setRecurrence("none");
    setIntervalValue("1");
    setNotes("");
    setDogId(dogs[0]?.id ?? "");
  }

  function startEdit(event: DogEvent) {
    setEditingId(event.id);
    setDogId(event.dogId);
    setTitle(event.title);
    setType(event.type);
    setEventDate(event.eventDate);
    setEventTime(event.eventTime ?? "");
    setRecurrence(event.recurrence);
    setIntervalValue(String(event.recurrenceInterval));
    setNotes(event.notes ?? "");
    setError(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || !dogId || title.trim().length === 0) return;
    const wasEditing = editingId !== null;
    setBusy(true);
    setError(null);
    setOkMsg(null);
    const payload = {
      dogId,
      title: title.trim(),
      type,
      eventDate,
      eventTime: eventTime.length > 0 ? eventTime : null,
      recurrence,
      recurrenceInterval: recurrence === "none" ? 1 : Number(interval) || 1,
      notes: notes.trim(),
    };
    try {
      const url = editingId ? `/api/dog-events?id=${editingId}` : "/api/dog-events";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { event?: DogEvent; error?: string };
      const saved = data.event;
      if (!res.ok || !saved) {
        setError(data.error ?? t(locale, "dogEvent.saveError"));
        return;
      }
      setEvents((prev) => (editingId ? prev.map((ev) => (ev.id === saved.id ? saved : ev)) : [...prev, saved]));
      resetForm();
      setOkMsg(wasEditing ? t(locale, "dogEvent.savedChangesOk") : t(locale, "dogEvent.savedOk"));
    } catch {
      setError(t(locale, "dogEvent.saveError"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/dog-events?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setEvents((prev) => prev.filter((e) => e.id !== id));
      if (editingId === id) resetForm();
    }
    setConfirmId(null);
  }

  function formatWhen(iso: string, time: string | null): string {
    const date = new Date(`${iso}T00:00:00Z`).toLocaleDateString(locale === "pl" ? "pl-PL" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
    return time ? `${date}, ${time}` : date;
  }

  return (
    <div className="space-y-6">
      {/* Add / edit form */}
      <form onSubmit={(e) => void submit(e)} className="border-border space-y-3 rounded-xl border p-4">
        <h2 className="text-foreground text-sm font-semibold">
          {editingId ? t(locale, "dogEvent.editTitle") : t(locale, "dogEvent.addTitle")}
        </h2>

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

        <div className="grid gap-3 sm:grid-cols-2">
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
            <label htmlFor="c-time" className="text-muted-foreground mb-1 block text-sm">
              {t(locale, "dogEvent.time")}
            </label>
            <input
              id="c-time"
              type="time"
              value={eventTime}
              onChange={(e) => {
                setEventTime(e.target.value);
              }}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
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
        {okMsg ? <p className="text-primary text-sm font-medium">{okMsg}</p> : null}

        <div className="flex items-center gap-2">
          <button type="submit" disabled={busy || !dogId} className={cn(buttonVariants({ size: "sm" }), "gap-1")}>
            <Save className="size-4" /> {editingId ? t(locale, "dogEvent.saveChanges") : t(locale, "dogEvent.save")}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={() => {
                resetForm();
              }}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              {t(locale, "dogEvent.cancelEdit")}
            </button>
          ) : null}
        </div>
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
                  {next ? formatWhen(next, event.eventTime) : t(locale, "dogEvent.past")}
                </p>
                {event.notes ? <p className="text-muted-foreground mt-1 text-xs">{event.notes}</p> : null}
              </div>

              {confirmId === event.id ? (
                <div className="flex shrink-0 items-center gap-1">
                  <span className="text-muted-foreground text-xs">{t(locale, "dogEvent.confirmDelete")}</span>
                  <button
                    type="button"
                    onClick={() => void remove(event.id)}
                    className={cn(buttonVariants({ variant: "destructive", size: "sm" }))}
                  >
                    {t(locale, "dogEvent.confirmYes")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmId(null);
                    }}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  >
                    {t(locale, "dogEvent.confirmNo")}
                  </button>
                </div>
              ) : (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      startEdit(event);
                    }}
                    aria-label={t(locale, "dogEvent.edit")}
                    className="text-muted-foreground hover:text-primary p-1 transition-colors"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmId(event.id);
                    }}
                    aria-label={t(locale, "dogEvent.delete")}
                    className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
