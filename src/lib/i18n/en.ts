// English dictionary. Flat, dot-namespaced keys. Keep structurally parallel with pl.ts
// (every key present in both files).
const en: Record<string, string> = {
  // common
  "common.loading": "Loading…",
  "common.signOut": "Sign out",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.send": "Send",
  "common.back": "Back",

  // language switcher
  "lang.pl": "PL",
  "lang.en": "EN",

  // navigation (BottomNav + Topbar)
  "nav.start": "Home",
  "nav.map": "Map",
  "nav.meetings": "Meetings",
  "nav.events": "Events",
  "nav.profile": "Profile",
  "nav.dogs": "Dogs",
  "nav.signout": "Sign out",

  // meetings
  "meetings.title": "Meetings",
  "meetings.tabs.upcoming": "Upcoming",
  "meetings.tabs.proposals": "Proposals",
  "meetings.tabs.invitations": "Invitations",
  "meetings.tabs.history": "History",
  "meetings.accept": "Accept",
  "meetings.decline": "Decline",

  // dashboard
  "dashboard.welcomeBack": "Welcome back",
  "dashboard.greeting": "Hi",
  "dashboard.addFirstDog": "Add your first dog",
  "dashboard.tiles.proposeMeeting": "Propose a meeting",
  "dashboard.tiles.dogMap": "Dog map",
  "dashboard.tiles.myMeetings": "My meetings",
  "dashboard.tiles.events": "Events",
  "dashboard.tiles.places": "Places",

  // owners / map page-level
  "owners.title": "Walk map",
  "owners.setCityPrompt": "Set your city in",
  "owners.setCityPromptSuffix": "to see local owners.",
  "owners.profileLink": "Profile",

  // dogs listing
  "dogs.title": "Your dogs",
  "dogs.add": "Add dog",

  // dog form
  "form.dog.name": "Name",
  "form.dog.breed": "Breed",
  "form.dog.birthdate": "Birth date",
  "form.dog.photo": "Photo",
  "form.dog.submit": "Save dog",

  // profile form
  "form.profile.name": "Name",
  "form.profile.district": "District",
  "form.profile.city": "City",
  "form.profile.photo": "Photo",
  "form.profile.submit": "Save profile",

  // auth
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.confirmPassword": "Confirm password",
  "auth.signIn": "Sign in",
  "auth.signUp": "Create account",
};

export default en;
