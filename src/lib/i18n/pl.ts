// Polish dictionary. Flat, dot-namespaced keys. Keep structurally parallel with en.ts
// (every key present in both files).
const pl: Record<string, string> = {
  // common
  "common.loading": "Ładowanie…",
  "common.signOut": "Wyloguj się",
  "common.save": "Zapisz",
  "common.cancel": "Anuluj",
  "common.send": "Wyślij",
  "common.back": "Wstecz",

  // language switcher
  "lang.pl": "PL",
  "lang.en": "EN",

  // navigation (BottomNav + Topbar)
  "nav.start": "Start",
  "nav.map": "Mapa",
  "nav.meetings": "Spotkania",
  "nav.events": "Wydarzenia",
  "nav.profile": "Profil",
  "nav.dogs": "Psy",
  "nav.pack": "Stado",
  "nav.calendar": "Kalendarz",
  "nav.settings": "Ustawienia",
  "nav.signout": "Wyloguj się",
  "nav.unreadAria": "nieprzeczytane wiadomości",
  "nav.packBadgeAria": "nowe powiadomienia w Stadzie",

  // settings & profiles hub
  "settings.title": "Ustawienia i profile",
  "settings.dogs": "Twoje psy",
  "settings.dogsDesc": "Dodawaj i edytuj profile swoich psów.",
  "settings.profile": "Twój profil",
  "settings.profileDesc": "Imię, zdjęcie, lokalizacja i prywatność.",

  // onboarding wizard
  "onboarding.title": "Pierwsze kroki",
  "onboarding.welcomeTitle": "Witaj w PawMeet!",
  "onboarding.welcomeBody":
    "Przeprowadzę Cię krok po kroku: najpierw kilka słów o Tobie, potem o Twoim psie. Na końcu zobaczysz podsumowanie i wszystko zapiszemy.",
  "onboarding.youTitle": "O Tobie",
  "onboarding.youBody": "To dane właściciela. Zdjęcie poniżej to Twoje zdjęcie — nie psa.",
  "onboarding.yourName": "Twoje imię",
  "onboarding.yourNamePlaceholder": "Jak mają się do Ciebie zwracać inni?",
  "onboarding.yourCity": "Miasto (opcjonalnie)",
  "onboarding.yourPhoto": "Twoje zdjęcie (opcjonalnie)",
  "onboarding.yourPhotoHint":
    "Zdjęcie właściciela — pokazuje się przy Twoim profilu. Lokalizację na mapie ustawisz później w profilu.",
  "onboarding.dogTitle": "Twój pies",
  "onboarding.dogBody": "Teraz pies. Zdjęcie poniżej to zdjęcie psa — pokaże się na mapie i w profilu psa.",
  "onboarding.dogName": "Imię psa",
  "onboarding.dogPhoto": "Zdjęcie psa (opcjonalnie)",
  "onboarding.dogPhotoHint": "To zdjęcie Twojego psa — to ono pojawi się jako pinezka na mapie.",
  "onboarding.summaryTitle": "Podsumowanie",
  "onboarding.summaryBody": "Sprawdź dane. Jeśli coś się nie zgadza, wróć i popraw — zawsze możesz zmienić to później.",
  "onboarding.back": "Wstecz",
  "onboarding.next": "Dalej",
  "onboarding.finish": "Zapisz i zakończ",
  "onboarding.saving": "Zapisuję…",
  "onboarding.saveError": "Nie udało się zapisać. Spróbuj ponownie.",

  // dog calendar
  "dogEvent.pageTitle": "Kalendarz psa",
  "dogEvent.upcoming": "Nadchodzące terminy",
  "dogEvent.openCalendar": "Otwórz kalendarz",
  "dogEvent.noUpcoming": "Brak nadchodzących terminów.",
  "dogEvent.needDog": "Najpierw dodaj psa, aby prowadzić jego kalendarz.",
  "dogEvent.addTitle": "Dodaj termin",
  "dogEvent.dog": "Pies",
  "dogEvent.type": "Typ",
  "dogEvent.titleLabel": "Nazwa",
  "dogEvent.titlePlaceholder": "np. Szczepienie przeciw wściekliźnie",
  "dogEvent.date": "Data",
  "dogEvent.recurrence": "Powtarzalność",
  "dogEvent.interval": "Co ile",
  "dogEvent.notes": "Notatka (opcjonalnie)",
  "dogEvent.add": "Dodaj",
  "dogEvent.empty": "Brak terminów. Dodaj pierwszy powyżej.",
  "dogEvent.past": "Minęło",
  "dogEvent.delete": "Usuń termin",
  "dogEvent.saveError": "Nie udało się zapisać terminu.",
  "dogEvent.type.vaccination": "Szczepienie",
  "dogEvent.type.vet_visit": "Wizyta u weterynarza",
  "dogEvent.type.exam": "Badanie",
  "dogEvent.type.grooming": "Pielęgnacja",
  "dogEvent.type.medication": "Lek / odrobaczanie",
  "dogEvent.type.other": "Inne",
  "dogEvent.recurrence.none": "Jednorazowo",
  "dogEvent.recurrence.daily": "Codziennie",
  "dogEvent.recurrence.weekly": "Co tydzień",
  "dogEvent.recurrence.monthly": "Co miesiąc",
  "dogEvent.recurrence.yearly": "Co rok",

  // meetings
  "meetings.title": "Spotkania",
  "meetings.tabs.upcoming": "Nadchodzące",
  "meetings.tabs.proposals": "Propozycje",
  "meetings.tabs.invitations": "Zaproszenia",
  "meetings.tabs.history": "Historia",
  "meetings.accept": "Akceptuj",
  "meetings.decline": "Odrzuć",
  "meetings.viewLocation": "Zobacz miejsce",
  "meetings.pending": "Oczekuje",
  "meetings.proposeWalk": "Zaproponuj spacer →",
  "meetings.loadError": "Nie udało się załadować spotkań. Spróbuj ponownie.",
  "meetings.empty.upcoming": "Brak nadchodzących spotkań.",
  "meetings.empty.proposals": "Brak wysłanych propozycji.",
  "meetings.empty.invitations": "Brak oczekujących zaproszeń.",
  "meetings.empty.history": "Zakończone spacery pojawią się tutaj.",

  // meeting types
  "type.walk": "Spacer",
  "type.breeding": "Krycie",

  // propose-meeting form
  "meetingForm.type": "Typ spotkania",
  "meetingForm.yourDog": "Twój pies",
  "meetingForm.dateTime": "Data i czas",
  "meetingForm.location": "Lokalizacja",
  "meetingForm.pinHint": "Przeciągnij pinezkę lub kliknij mapę, aby zaznaczyć miejsce spotkania.",
  "meetingForm.submit": "Wyślij zaproszenie",

  // propose-meeting page (new.astro chrome)
  "meetingNew.title": "Zaproponuj spotkanie",
  "meetingNew.noReceiver": "Nie wybrano właściciela.",
  "meetingNew.backToList": "← Wróć do listy",
  "meetingNew.notFound": "Nie znaleziono właściciela.",
  "meetingNew.backToProfile": "← Wróć do profilu",
  "meetingNew.proposeWith": "Zaproponuj spotkanie z",
  "meetingNew.loading": "Ładowanie formularza…",

  // dashboard
  "dashboard.welcomeBack": "Witaj z powrotem",
  "dashboard.greeting": "Cześć",
  "dashboard.addFirstDog": "Dodaj pierwszego psa",
  "dashboard.whatsNew": "Co nowego",
  "dashboard.newMessages": "Nowe wiadomości",
  "dashboard.receivedBones": "Otrzymane kości",
  "dashboard.invitations": "Zaproszenia",
  "dashboard.nothingNew": "Brak nowości — wszystko ogarnięte 🐾",
  "dashboard.tiles.proposeMeeting": "Zaproponuj spotkanie",
  "dashboard.tiles.dogMap": "Mapa psów",
  "dashboard.tiles.myMeetings": "Moje spotkania",
  "dashboard.tiles.dogs": "Moje psy",
  "dashboard.tiles.profile": "Profil",
  "dashboard.tiles.events": "Wydarzenia",
  "dashboard.tiles.places": "Miejsca",

  // owners / map page-level
  "owners.title": "Mapa spacerów",
  "owners.setCityPrompt": "Ustaw swoje miasto w",
  "owners.setCityPromptSuffix": "aby zobaczyć okolicznych właścicieli.",
  "owners.profileLink": "Profilu",
  "owners.ownerLabel": "właściciel",
  "owners.proposeWalk": "Zaproponuj spacer",

  // events (placeholder page)
  "events.title": "Wydarzenia",
  "events.inPreparation": "Ta sekcja jest w przygotowaniu.",
  "events.soon": "Wkrótce",

  // bone (pack throw control on discovery surfaces)
  "bone.throw": "Rzuć kość",
  "bone.thrown": "Rzucono",
  "bone.catch": "Złap kość",
  "bone.message": "Napisz",

  // owner profile (public profile of another owner + their dogs)
  "ownerProfile.back": "Wróć",
  "ownerProfile.dogsHeading": "Psy",
  "ownerProfile.propose": "Zaproponuj spotkanie",
  "ownerProfile.pending": "Zaproszenie wysłane — oczekuje na odpowiedź",
  "ownerProfile.empty": "Nie dodano jeszcze żadnych psów.",
  "ownerProfile.throwBone": "Rzuć kość",
  "ownerProfile.boneThrown": "Kość rzucona — czekaj",
  "ownerProfile.catchBone": "Złap kość",
  "ownerProfile.inPack": "W Twoim stadzie",
  "ownerProfile.message": "Napisz",
  "ownerProfile.view": "Zobacz profil",

  // pack ("moje stado")
  "pack.title": "Moje stado",
  "pack.requests": "Kości do złapania",
  "pack.members": "Twoje stado",
  "pack.empty": "Twoje stado jest puste. Rzuć kość z profilu właściciela, aby zacząć.",
  "pack.noRequests": "Brak kości do złapania.",
  "pack.catch": "Złap",
  "pack.decline": "Odrzuć",
  "pack.message": "Napisz",
  "pack.badge": "Stado",
  "pack.wantsToJoin": "rzucił(a) Ci kość",

  // chat
  "chat.title": "Czat",
  "chat.back": "← Wróć do stada",
  "chat.placeholder": "Napisz wiadomość…",
  "chat.send": "Wyślij",
  "chat.empty": "Brak wiadomości. Przywitaj się!",
  "chat.failed": "Nie udało się wysłać. Spróbuj ponownie.",

  // map controls
  "map.breedFilter": "Rasa",
  "map.allBreeds": "Wszystkie rasy",

  // map search filters
  "filter.size": "Wielkość",
  "filter.anySize": "Każda wielkość",
  "filter.character": "Charakter",
  "filter.age": "Wiek",
  "filter.anyAge": "Każdy wiek",
  "filter.distance": "Odległość",
  "filter.distanceNoLimit": "Bez limitu",
  "age.puppy": "Szczeniak (<1 r.)",
  "age.young": "Młody (1–3 l.)",
  "age.adult": "Dorosły (3–8 l.)",
  "age.senior": "Senior (8+ l.)",

  // dogs listing
  "dogs.title": "Twoje psy",
  "dogs.add": "Dodaj psa",
  "dogs.addTitle": "Dodaj psa",
  "dogs.saved": "Zapisano.",
  "dogs.empty": "Nie masz jeszcze psów — dodaj pierwszego!",
  "dogs.years": "lat",

  // dog form
  "form.dog.name": "Imię",
  "form.dog.namePlaceholder": "Imię Twojego psa",
  "form.dog.nameRequired": "Imię jest wymagane",
  "form.dog.breed": "Rasa",
  "form.dog.selectBreed": "Wpisz lub wybierz rasę",
  "form.dog.breedHint": "Zacznij pisać, aby wyszukać — albo wpisz własną rasę, jeśli nie ma jej na liście.",
  "form.dog.weight": "Waga (kg)",
  "form.dog.weightPlaceholder": "np. 12,5",
  "form.dog.weightHint": "Orientacyjna waga w kilogramach. Ustawia też wielkość psa w filtrze na mapie.",
  "form.dog.size": "Wielkość",
  "form.dog.traits": "Charakter",
  "form.dog.birthdate": "Data urodzenia",
  "form.dog.photo": "Zdjęcie",
  "form.dog.submit": "Zapisz psa",
  "form.dog.saving": "Zapisywanie…",

  // dog sizes
  "size.small": "Mała",
  "size.medium": "Średnia",
  "size.large": "Duża",

  // dog character traits
  "trait.energetic": "Energiczny",
  "trait.calm": "Spokojny",
  "trait.social": "Towarzyski",
  "trait.shy": "Nieśmiały",
  "trait.dog_friendly": "Przyjazny psom",
  "trait.kid_friendly": "Przyjazny dzieciom",
  "trait.reactive": "Reaktywny",
  "trait.anxious": "Lękliwy",
  "trait.dominant": "Dominujący",
  "trait.barky": "Szczekliwy",

  // profile form
  "form.profile.name": "Imię",
  "form.profile.street": "Ulica",
  "form.profile.city": "Miasto",
  "form.profile.photo": "Zdjęcie",
  "form.profile.location": "Twoja lokalizacja",
  "form.profile.locationHint":
    "Przeciągnij pinezkę, aby ustawić swoje miejsce — od niego zaczyna się wyszukiwanie psów.",
  "form.profile.locationPinned":
    "Lokalizacja ustawiona ręcznie — po zapisie obowiązuje dokładnie ta pozycja pinezki (pola adresu już jej nie zmienią).",
  "form.profile.submit": "Zapisz profil",

  // auth
  "auth.email": "E-mail",
  "auth.password": "Hasło",
  "auth.confirmPassword": "Potwierdź hasło",
  "auth.signIn": "Zaloguj się",
  "auth.signUp": "Utwórz konto",
  "auth.noAccount": "Nie masz konta?",
  "auth.haveAccount": "Masz już konto?",

  // landing (public hero + feature cards)
  "landing.tagline":
    "Znajdź właścicieli psów w okolicy, umawiaj wspólne spacery i pozwól swojemu psu poznawać nowych przyjaciół.",
  "landing.getStarted": "Rozpocznij",
  "landing.feature1.title": "Znajdź właścicieli w pobliżu",
  "landing.feature1.desc":
    "Odkrywaj właścicieli psów w swojej dzielnicy i mieście. Filtruj po lokalizacji, aby poznać sąsiadów.",
  "landing.feature2.title": "Umawiaj wspólne spacery",
  "landing.feature2.desc":
    "Wysyłaj zaproszenia na spacery i koordynuj wyjścia. Twój pies zasługuje na dobre towarzystwo.",
  "landing.feature3.title": "Profile psów",
  "landing.feature3.desc": "Dodaj swoje psy z rasą i zdjęciem. Przeglądaj inne psy przed zaproponowaniem spotkania.",
};

export default pl;
