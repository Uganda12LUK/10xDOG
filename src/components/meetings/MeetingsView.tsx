import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { Invitation } from "@/types";

interface Props {
  accepted: Invitation[];
  sentPending: Invitation[];
  receivedPending: Invitation[];
  profiles: Record<string, { name: string }>;
  userId: string;
}

function profileName(profiles: Record<string, { name: string }>, id: string): string {
  return (profiles[id] as { name: string } | undefined)?.name ?? id;
}

function MeetingCard({
  inv,
  counterpartyId,
  showPending,
  profiles,
}: {
  inv: Invitation;
  counterpartyId: string;
  showPending: boolean;
  profiles: Record<string, { name: string }>;
}) {
  const typeLabel = inv.type === "walk" ? "Walk" : "Breeding";
  const date = new Date(inv.createdAt).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="border-border flex items-center justify-between gap-3 border-b px-4 py-3 last:border-0">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-sm font-medium">{profileName(profiles, counterpartyId)}</p>
        <p className="text-muted-foreground text-xs">{date}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge>{typeLabel}</Badge>
        {showPending && <Badge variant="outline">Oczekuje</Badge>}
      </div>
    </div>
  );
}

function InboxCard({
  inv,
  profiles,
  onRespond,
}: {
  inv: Invitation;
  profiles: Record<string, { name: string }>;
  onRespond: (id: string, action: "accepted" | "declined") => void;
}) {
  const [loading, setLoading] = useState<"accepted" | "declined" | null>(null);
  const typeLabel = inv.type === "walk" ? "Walk" : "Breeding";
  const date = new Date(inv.createdAt).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  async function handle(action: "accepted" | "declined") {
    setLoading(action);
    try {
      const res = await fetch("/api/invitations/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId: inv.id, action }),
      });
      if (res.ok) onRespond(inv.id, action);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="border-border border-b px-4 py-3 last:border-0">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="truncate text-sm font-medium">{profileName(profiles, inv.senderId)}</p>
          <p className="text-muted-foreground text-xs">{date}</p>
        </div>
        <Badge className="shrink-0">{typeLabel}</Badge>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => handle("accepted")}
          disabled={loading !== null}
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading === "accepted" ? "…" : "Akceptuj"}
        </button>
        <button
          onClick={() => handle("declined")}
          disabled={loading !== null}
          className="border-border text-muted-foreground hover:bg-muted flex-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading === "declined" ? "…" : "Odrzuć"}
        </button>
      </div>
    </div>
  );
}

export default function MeetingsView({ accepted, sentPending, receivedPending, profiles, userId }: Props) {
  const [inbox, setInbox] = useState(receivedPending);

  function handleRespond(id: string) {
    setInbox((prev) => prev.filter((inv) => inv.id !== id));
  }

  const inboxLabel = inbox.length > 0 ? `Zaproszenia (${inbox.length})` : "Zaproszenia";

  return (
    <div className="relative">
      <Tabs defaultValue="nadchodzace">
        <TabsList className="w-full">
          <TabsTrigger value="nadchodzace" className="flex-1">
            Nadchodzące
          </TabsTrigger>
          <TabsTrigger value="propozycje" className="flex-1">
            Propozycje
          </TabsTrigger>
          <TabsTrigger value="zaproszenia" className="flex-1 text-xs">
            {inboxLabel}
          </TabsTrigger>
          <TabsTrigger value="historia" className="flex-1">
            Historia
          </TabsTrigger>
        </TabsList>

        <TabsContent value="nadchodzace">
          {accepted.length === 0 ? (
            <p className="text-muted-foreground px-4 py-6 text-center text-sm">
              Brak nadchodzących spotkań.{" "}
              <a href="/owners" className="text-primary underline">
                Zaproponuj spacer →
              </a>
            </p>
          ) : (
            <div>
              {accepted.map((inv) => {
                const counterpartyId = inv.senderId === userId ? inv.receiverId : inv.senderId;
                return (
                  <MeetingCard
                    key={inv.id}
                    inv={inv}
                    counterpartyId={counterpartyId}
                    showPending={false}
                    profiles={profiles}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="propozycje">
          {sentPending.length === 0 ? (
            <p className="text-muted-foreground px-4 py-6 text-center text-sm">Brak wysłanych propozycji.</p>
          ) : (
            <div>
              {sentPending.map((inv) => (
                <MeetingCard
                  key={inv.id}
                  inv={inv}
                  counterpartyId={inv.receiverId}
                  showPending={true}
                  profiles={profiles}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="zaproszenia">
          {inbox.length === 0 ? (
            <p className="text-muted-foreground px-4 py-6 text-center text-sm">Brak oczekujących zaproszeń.</p>
          ) : (
            <div>
              {inbox.map((inv) => (
                <InboxCard key={inv.id} inv={inv} profiles={profiles} onRespond={handleRespond} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="historia">
          <p className="text-muted-foreground px-4 py-6 text-center text-sm">Zakończone spacery pojawią się tutaj.</p>
        </TabsContent>
      </Tabs>

      <a
        href="/meetings/new"
        className="bg-primary text-primary-foreground fixed right-4 bottom-20 z-40 flex size-14 items-center justify-center rounded-full text-2xl shadow-lg md:right-6 md:bottom-6"
        aria-label="Nowe spotkanie"
      >
        +
      </a>
    </div>
  );
}
