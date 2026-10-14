import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ageStringFromBirthdate } from "@/lib/age";
import { useMediaQuery } from "@/components/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import BoneButton from "@/components/pack/BoneButton";
import { t, type Locale } from "@/lib/i18n";
import type { DogWithOwner, PackStatus } from "@/types";

interface Props {
  dog: DogWithOwner | null;
  packStatus: PackStatus;
  locale: Locale;
  open: boolean;
  onClose: () => void;
}

export default function BottomSheet({ dog, packStatus, locale, open, onClose }: Props) {
  // Desktop: slide in from the right (there's room beside the map); mobile keeps
  // the bottom sheet. First render is mobile (see useMediaQuery) to avoid a flash.
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        className={cn("px-4", isDesktop ? "pt-6" : "rounded-t-2xl pt-2 pb-[calc(1.5rem+env(safe-area-inset-bottom))]")}
      >
        {dog && (
          <>
            <SheetHeader className="mb-4">
              <SheetTitle className="text-left">{dog.name}</SheetTitle>
            </SheetHeader>
            <div className="mb-4 flex items-center gap-3">
              {dog.photoUrl ? (
                <img src={dog.photoUrl} alt={dog.name} className="aspect-square w-16 rounded-xl object-cover" />
              ) : (
                <div className="bg-muted flex aspect-square w-16 items-center justify-center rounded-xl text-2xl">
                  🐾
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium">{dog.breed}</p>
                {dog.birthdate && (
                  <p className="text-muted-foreground text-xs">{ageStringFromBirthdate(dog.birthdate)}</p>
                )}
                <p className="text-muted-foreground truncate text-xs">
                  {t(locale, "owners.ownerLabel")}:{" "}
                  <a href={`/map/${dog.ownerId}`} className="text-primary hover:underline">
                    {dog.ownerName}
                  </a>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild className="flex-1">
                <a href={`/meetings/new?receiver_id=${dog.ownerId}`}>{t(locale, "owners.proposeWalk")}</a>
              </Button>
              <BoneButton ownerId={dog.ownerId} status={packStatus} locale={locale} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
