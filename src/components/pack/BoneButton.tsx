import type { PackStatus } from "@/types";
import { t, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// Compact, state-aware "throw a bone" control for discovery surfaces (map list,
// pin popup, propose-meeting page). Mirrors the profile-footer states as a small
// pill. Tokens only; copy via i18n.
const pill = "inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors";
const action = "bg-secondary text-secondary-foreground hover:bg-secondary/90";

export default function BoneButton({
  ownerId,
  status,
  locale,
  className,
}: {
  ownerId: string;
  status: PackStatus;
  locale: Locale;
  className?: string;
}) {
  if (status === "accepted") {
    return (
      <a href={`/messages/${ownerId}`} className={cn(pill, action, className)}>
        <span aria-hidden="true">💬</span> {t(locale, "bone.message")}
      </a>
    );
  }
  if (status === "pending_out") {
    return (
      <span className={cn(pill, "bg-muted text-muted-foreground", className)}>
        <span aria-hidden="true">🦴</span> {t(locale, "bone.thrown")}
      </span>
    );
  }
  if (status === "pending_in") {
    return (
      <a href="/pack" className={cn(pill, action, className)}>
        <span aria-hidden="true">🦴</span> {t(locale, "bone.catch")}
      </a>
    );
  }
  return (
    <form method="POST" action="/api/pack/throw" className={cn("shrink-0", className)}>
      <input type="hidden" name="receiver_id" value={ownerId} />
      <button type="submit" className={cn(pill, action)}>
        <span aria-hidden="true">🦴</span> {t(locale, "bone.throw")}
      </button>
    </form>
  );
}
