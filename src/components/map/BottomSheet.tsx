import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ageStringFromBirthdate } from "@/lib/age";
import type { OwnerWithDogs } from "@/types";

interface Props {
  owner: OwnerWithDogs | null;
  open: boolean;
  onClose: () => void;
}

export default function BottomSheet({ owner, open, onClose }: Props) {
  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <SheetContent side="bottom" className="pb-safe-area-inset-bottom rounded-t-2xl px-4">
        {owner && (
          <>
            <SheetHeader className="mb-4">
              <SheetTitle className="text-left">{owner.profile.name}</SheetTitle>
            </SheetHeader>
            <div className="flex gap-3 overflow-x-auto pb-4">
              {owner.dogs.map((dog) => (
                <div key={dog.id} className="flex w-24 shrink-0 flex-col items-center gap-1">
                  {dog.photoUrl ? (
                    <img src={dog.photoUrl} alt={dog.name} className="aspect-square w-16 rounded-xl object-cover" />
                  ) : (
                    <div className="bg-muted flex aspect-square w-16 items-center justify-center rounded-xl text-2xl">
                      🐾
                    </div>
                  )}
                  <span className="text-center text-sm leading-tight font-medium">{dog.name}</span>
                  <span className="text-muted-foreground text-center text-xs">{dog.breed}</span>
                  {dog.birthdate && (
                    <span className="text-muted-foreground text-xs">{ageStringFromBirthdate(dog.birthdate)}</span>
                  )}
                </div>
              ))}
            </div>
            <Button asChild className="w-full">
              <a href={`/owners/${owner.profile.id}`}>Zaproponuj spacer</a>
            </Button>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
