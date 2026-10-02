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

  // map controls
  "map.breedFilter": "Breed",
  "map.allBreeds": "All breeds",

  // dogs listing
  "dogs.title": "Your dogs",
  "dogs.add": "Add dog",
  "dogs.addTitle": "Add a dog",
  "dogs.saved": "Saved.",
  "dogs.empty": "No dogs yet — add your first!",
  "dogs.years": "yrs",

  // dog form
  "form.dog.name": "Name",
  "form.dog.namePlaceholder": "Your dog's name",
  "form.dog.nameRequired": "Name is required",
  "form.dog.breed": "Breed",
  "form.dog.selectBreed": "Select a breed",
  "form.dog.size": "Size",
  "form.dog.traits": "Character",
  "form.dog.birthdate": "Birth date",
  "form.dog.photo": "Photo",
  "form.dog.submit": "Save dog",
  "form.dog.saving": "Saving…",

  // dog sizes
  "size.small": "Small",
  "size.medium": "Medium",
  "size.large": "Large",

  // dog character traits
  "trait.energetic": "Energetic",
  "trait.calm": "Calm",
  "trait.social": "Social",
  "trait.shy": "Shy",
  "trait.dog_friendly": "Dog-friendly",
  "trait.kid_friendly": "Kid-friendly",
  "trait.reactive": "Reactive",
  "trait.anxious": "Anxious",
  "trait.dominant": "Dominant",
  "trait.barky": "Barky",

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
  "auth.noAccount": "Don't have an account?",
  "auth.haveAccount": "Already have an account?",

  // landing (public hero + feature cards)
  "landing.tagline": "Find dog owners near you, arrange walks together, and let your dogs make new friends.",
  "landing.getStarted": "Get started",
  "landing.feature1.title": "Find Owners Nearby",
  "landing.feature1.desc": "Discover dog owners in your district and city. Filter by location to meet your neighbours.",
  "landing.feature2.title": "Arrange Walk Meetups",
  "landing.feature2.desc": "Send walk invitations and coordinate outings. Your dogs deserve good company.",
  "landing.feature3.title": "Dog Profiles",
  "landing.feature3.desc": "Add your dogs with breed and photo. Browse other dogs before suggesting a meetup.",
};

export default en;
