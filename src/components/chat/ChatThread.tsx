import { useEffect, useRef, useState } from "react";
import { t, type Locale } from "@/lib/i18n";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Message } from "@/types";

interface Props {
  selfId: string;
  otherId: string;
  locale: Locale;
}

export default function ChatThread({ selfId, otherId, locale }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch(`/api/messages?with=${otherId}`);
    if (res.ok) {
      const data = (await res.json()) as { messages: Message[] };
      setMessages(data.messages);
    }
    setLoaded(true);
  }

  // Initial fetch. Send + refetch is the v1 delivery model (no Realtime). State
  // only updates after the awaited fetch, not synchronously within the effect.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherId]);

  // Keep the newest message in view after each render of the list.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) {
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: otherId, body }),
      });
      if (!res.ok) {
        setError(t(locale, "chat.failed"));
        return;
      }
      setDraft("");
      await load();
    } catch {
      setError(t(locale, "chat.failed"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[calc(100svh-9rem)] flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto py-4">
        {loaded && messages.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">{t(locale, "chat.empty")}</p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === selfId;
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                    mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                  )}
                >
                  {m.body}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {error ? <p className="text-destructive pb-1 text-xs">{error}</p> : null}

      <form onSubmit={(e) => void send(e)} className="border-border flex gap-2 border-t py-3">
        <input
          type="text"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
          }}
          placeholder={t(locale, "chat.placeholder")}
          maxLength={2000}
          className="border-input bg-background text-foreground focus-visible:ring-ring flex-1 rounded-full border px-4 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
        />
        <button type="submit" disabled={sending || draft.trim().length === 0} className={cn(buttonVariants(), "gap-1")}>
          {t(locale, "chat.send")}
        </button>
      </form>
    </div>
  );
}
