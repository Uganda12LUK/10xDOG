import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ageStringFromBirthdate } from "@/lib/age";
import type { DogWithOwner } from "@/types";

interface Props {
  dog: DogWithOwner | null;
  open: boolean;
  onClose: () => void;
}

export default function BottomSheet({ dog, open, onClose }: Props) {
  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <SheetContent side="bottom" className="pb-safe-area-inset-bottom rounded-t-2xl px-4">
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
