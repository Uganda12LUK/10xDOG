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
  "nav.signout": "Wyloguj się",

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

  // owner profile (public profile of another owner + their dogs)
  "ownerProfile.back": "Wróć",
  "ownerProfile.dogsHeading": "Psy",
  "ownerProfile.propose": "Zaproponuj spotkanie",
  "ownerProfile.pending": "Zaproszenie wysłane — oczekuje na odpowiedź",
  "ownerProfile.empty": "Nie dodano jeszcze żadnych psów.",

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
  "form.dog.selectBreed": "Wybierz rasę",
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
  "form.profile.district": "Dzielnica",
  "form.profile.city": "Miasto",
  "form.profile.photo": "Zdjęcie",
  "form.profile.location": "Twoja lokalizacja",
  "form.profile.locationHint":
    "Przeciągnij pinezkę, aby ustawić swoje miejsce — od niego zaczyna się wyszukiwanie psów.",
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
