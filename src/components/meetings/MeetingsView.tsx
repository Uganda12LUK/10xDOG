import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { Invitation } from "@/types";

interface Props {
  accepted: Invitation[];
  sentPending: Invitation[];
  profiles: Record<string, { name: string }>;
  userId: string;
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
  const counterpartyName = (profiles[counterpartyId] as { name: string } | undefined)?.name ?? counterpartyId;
  const typeLabel = inv.type === "walk" ? "Walk" : "Breeding";
  const date = new Date(inv.createdAt).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="border-border flex items-center justify-between gap-3 border-b px-4 py-3 last:border-0">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-sm font-medium">{counterpartyName}</p>
        <p className="text-muted-foreground text-xs">{date}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge>{typeLabel}</Badge>
        {showPending && <Badge variant="outline">Oczekuje</Badge>}
      </div>
    </div>
  );
}

export default function MeetingsView({ accepted, sentPending, profiles, userId }: Props) {
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
