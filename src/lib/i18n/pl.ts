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

  // dashboard
  "dashboard.welcomeBack": "Witaj z powrotem",
  "dashboard.greeting": "Cześć",
  "dashboard.addFirstDog": "Dodaj pierwszego psa",
  "dashboard.tiles.proposeMeeting": "Zaproponuj spotkanie",
  "dashboard.tiles.dogMap": "Mapa psów",
  "dashboard.tiles.myMeetings": "Moje spotkania",
  "dashboard.tiles.events": "Wydarzenia",
  "dashboard.tiles.places": "Miejsca",

  // owners / map page-level
  "owners.title": "Mapa spacerów",
  "owners.setCityPrompt": "Ustaw swoje miasto w",
  "owners.setCityPromptSuffix": "aby zobaczyć okolicznych właścicieli.",
  "owners.profileLink": "Profilu",

  // dogs listing
  "dogs.title": "Twoje psy",
  "dogs.add": "Dodaj psa",

  // dog form
  "form.dog.name": "Imię",
  "form.dog.breed": "Rasa",
  "form.dog.birthdate": "Data urodzenia",
  "form.dog.photo": "Zdjęcie",
  "form.dog.submit": "Zapisz psa",

  // profile form
  "form.profile.name": "Imię",
  "form.profile.district": "Dzielnica",
  "form.profile.city": "Miasto",
  "form.profile.photo": "Zdjęcie",
  "form.profile.submit": "Zapisz profil",

  // auth
  "auth.email": "E-mail",
  "auth.password": "Hasło",
  "auth.confirmPassword": "Potwierdź hasło",
  "auth.signIn": "Zaloguj się",
  "auth.signUp": "Utwórz konto",
};

export default pl;
