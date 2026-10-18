import { useState } from "react";
import { t, type Locale } from "@/lib/i18n";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PackMember } from "@/types";

interface Props {
  initialRequests: PackMember[];
  initialMembers: PackMember[];
  unreadBySender?: Record<string, number>;
  locale: Locale;
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return <img src={url} alt={name} className="border-border size-12 shrink-0 rounded-full border object-cover" />;
  }
  return (
    <div className="border-border bg-muted flex size-12 shrink-0 items-center justify-center rounded-full border text-lg">
      🐾
    </div>
  );
}

// The pack is a pack of dogs: lead each row with the member's dog(s), with the
// owner as the subtitle (the human behind the dog).
function dogPhotoOf(m: PackMember): string | null {
  return m.dogs[0]?.photoUrl ?? null;
}
function dogLabelOf(m: PackMember): string {
  return m.dogs.length > 0 ? m.dogs.map((d) => d.name).join(", ") : m.profile.name;
}

export default function PackView({ initialRequests, initialMembers, unreadBySender = {}, locale }: Props) {
  const [requests, setRequests] = useState<PackMember[]>(initialRequests);
  const [members, setMembers] = useState<PackMember[]>(initialMembers);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function respond(member: PackMember, action: "accepted" | "declined") {
    setBusyId(member.connectionId);
    try {
      const res = await fetch("/api/pack/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: member.connectionId, action }),
      });
      if (!res.ok) {
        return;
      }
      // Optimistic: drop from requests; if accepted, promote into the pack list.
      setRequests((prev) => prev.filter((r) => r.connectionId !== member.connectionId));
      if (action === "accepted") {
        setMembers((prev) => [member, ...prev]);
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Bones to catch — incoming pending requests */}
      <section className="space-y-3">
        <h2 className="text-muted-foreground flex items-center gap-1.5 text-sm font-semibold">
          <span aria-hidden="true">🦴</span>
          {t(locale, "pack.requests")}
        </h2>
        {requests.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t(locale, "pack.noRequests")}</p>
        ) : (
          <ul className="divide-border border-border divide-y rounded-xl border">
            {requests.map((req) => (
              <li key={req.connectionId} className="flex items-center gap-3 p-3">
                <Avatar url={dogPhotoOf(req)} name={dogLabelOf(req)} />
                <div className="min-w-0 flex-1">
                  <p className="text-foreground truncate font-medium">{dogLabelOf(req)}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {req.profile.name} · {t(locale, "pack.wantsToJoin")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={busyId === req.connectionId}
                    onClick={() => void respond(req, "accepted")}
                    className={cn(buttonVariants({ size: "sm" }), "gap-1")}
                  >
                    <span aria-hidden="true">🦴</span>
                    {t(locale, "pack.catch")}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === req.connectionId}
                    onClick={() => void respond(req, "declined")}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  >
                    {t(locale, "pack.decline")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Your pack — accepted connections */}
      <section className="space-y-3">
        <h2 className="text-muted-foreground text-sm font-semibold">{t(locale, "pack.members")}</h2>
        {members.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t(locale, "pack.empty")}</p>
        ) : (
          <ul className="divide-border border-border divide-y rounded-xl border">
            {members.map((member) => {
              const unread = unreadBySender[member.ownerId] ?? 0;
              return (
                <li key={member.connectionId} className="flex items-center gap-3 p-3">
                  <Avatar url={dogPhotoOf(member)} name={dogLabelOf(member)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-foreground truncate font-medium">{dogLabelOf(member)}</p>
                      {unread > 0 ? (
                        <span
                          className="bg-primary text-primary-foreground flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-xs leading-none font-semibold"
                          aria-label={t(locale, "nav.unreadAria")}
                        >
                          {unread}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground truncate text-xs">
                      {member.profile.name}
                      {member.profile.city ? ` · ${member.profile.city}` : ""}
                    </p>
                  </div>
                  <a
                    href={`/messages/${member.ownerId}`}
                    className={cn(
                      buttonVariants({ variant: unread > 0 ? "default" : "secondary", size: "sm" }),
                      "shrink-0 gap-1",
                    )}
                  >
                    <span aria-hidden="true">💬</span>
                    {t(locale, "pack.message")}
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
