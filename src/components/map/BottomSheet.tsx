import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ageStringFromBirthdate } from "@/lib/age";
import { useMediaQuery } from "@/components/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import type { DogWithOwner } from "@/types";

interface Props {
  dog: DogWithOwner | null;
  open: boolean;
  onClose: () => void;
}

export default function BottomSheet({ dog, open, onClose }: Props) {
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
                <p className="text-muted-foreground truncate text-xs">właściciel: {dog.ownerName}</p>
              </div>
            </div>
            <Button asChild className="w-full">
              <a href={`/meetings/new?receiver_id=${dog.ownerId}`}>Zaproponuj spacer</a>
            </Button>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
