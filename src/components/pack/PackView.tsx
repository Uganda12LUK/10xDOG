import { useState } from "react";
import { t, type Locale } from "@/lib/i18n";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PackMember } from "@/types";

interface Props {
  initialRequests: PackMember[];
  initialMembers: PackMember[];
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

export default function PackView({ initialRequests, initialMembers, locale }: Props) {
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
                <Avatar url={req.profile.avatarUrl} name={req.profile.name} />
                <div className="min-w-0 flex-1">
                  <p className="text-foreground truncate font-medium">{req.profile.name}</p>
                  <p className="text-muted-foreground truncate text-xs">{t(locale, "pack.wantsToJoin")}</p>
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
            {members.map((member) => (
              <li key={member.connectionId} className="flex items-center gap-3 p-3">
                <Avatar url={member.profile.avatarUrl} name={member.profile.name} />
                <div className="min-w-0 flex-1">
                  <p className="text-foreground truncate font-medium">{member.profile.name}</p>
                  {member.profile.city ? (
                    <p className="text-muted-foreground truncate text-xs">{member.profile.city}</p>
                  ) : null}
                </div>
                <a
                  href={`/messages/${member.ownerId}`}
                  className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "shrink-0 gap-1")}
                >
                  <span aria-hidden="true">💬</span>
                  {t(locale, "pack.message")}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
