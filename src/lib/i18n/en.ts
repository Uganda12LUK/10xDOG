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
  "nav.pack": "Pack",
  "nav.calendar": "Calendar",
  "nav.settings": "Settings",
  "nav.signout": "Sign out",
  "nav.unreadAria": "unread messages",
  "nav.packBadgeAria": "new Pack notifications",

  // settings & profiles hub
  "settings.title": "Settings & profiles",
  "settings.dogs": "Your dogs",
  "settings.dogsDesc": "Add and edit your dogs' profiles.",
  "settings.profile": "Your profile",
  "settings.profileDesc": "Name, photo, location and privacy.",

  // onboarding wizard
  "onboarding.title": "Getting started",
  "onboarding.welcomeTitle": "Welcome to PawMeet!",
  "onboarding.welcomeBody":
    "I'll walk you through it: first a little about you, then about your dog. At the end you'll see a summary and we'll save it all.",
  "onboarding.youTitle": "About you",
  "onboarding.youBody": "This is the owner's info. The photo below is your photo — not the dog's.",
  "onboarding.yourName": "Your name",
  "onboarding.yourNamePlaceholder": "What should others call you?",
  "onboarding.yourCity": "City (optional)",
  "onboarding.yourPhoto": "Your photo (optional)",
  "onboarding.yourPhotoHint":
    "The owner's photo — shown on your profile. You can set your map location later in your profile.",
  "onboarding.dogTitle": "Your dog",
  "onboarding.dogBody": "Now the dog. The photo below is the dog's photo — it shows on the map and the dog's profile.",
  "onboarding.dogName": "Dog's name",
  "onboarding.dogPhoto": "Dog's photo (optional)",
  "onboarding.dogPhotoHint": "A photo of your dog — this is what appears as the pin on the map.",
  "onboarding.summaryTitle": "Summary",
  "onboarding.summaryBody":
    "Check the details. If something's off, go back and fix it — you can always change it later.",
  "onboarding.back": "Back",
  "onboarding.next": "Next",
  "onboarding.finish": "Save and finish",
  "onboarding.saving": "Saving…",
  "onboarding.saveError": "Couldn't save. Please try again.",

  // dog calendar
  "dogEvent.pageTitle": "Dog calendar",
  "dogEvent.upcoming": "Upcoming",
  "dogEvent.openCalendar": "Open calendar",
  "dogEvent.noUpcoming": "No upcoming events.",
  "dogEvent.needDog": "Add a dog first to keep its calendar.",
  "dogEvent.addTitle": "Add an event",
  "dogEvent.dog": "Dog",
  "dogEvent.type": "Type",
  "dogEvent.titleLabel": "Title",
  "dogEvent.titlePlaceholder": "e.g. Rabies vaccination",
  "dogEvent.date": "Date",
  "dogEvent.time": "Time (optional)",
  "dogEvent.recurrence": "Repeat",
  "dogEvent.interval": "Every",
  "dogEvent.notes": "Notes (optional)",
  "dogEvent.add": "Add",
  "dogEvent.save": "Save event",
  "dogEvent.saveChanges": "Save changes",
  "dogEvent.editTitle": "Edit event",
  "dogEvent.edit": "Edit",
  "dogEvent.cancelEdit": "Cancel",
  "dogEvent.confirmDelete": "Delete this?",
  "dogEvent.confirmYes": "Delete",
  "dogEvent.confirmNo": "Cancel",
  "dogEvent.empty": "No events yet. Add your first above.",
  "dogEvent.past": "Past",
  "dogEvent.delete": "Delete event",
  "dogEvent.saveError": "Couldn't save the event.",
  "dogEvent.type.vaccination": "Vaccination",
  "dogEvent.type.vet_visit": "Vet visit",
  "dogEvent.type.exam": "Exam",
  "dogEvent.type.grooming": "Grooming",
  "dogEvent.type.medication": "Medication / deworming",
  "dogEvent.type.other": "Other",
  "dogEvent.recurrence.none": "One-time",
  "dogEvent.recurrence.daily": "Daily",
  "dogEvent.recurrence.weekly": "Weekly",
  "dogEvent.recurrence.monthly": "Monthly",
  "dogEvent.recurrence.yearly": "Yearly",

  // meetings
  "meetings.title": "Meetings",
  "meetings.tabs.upcoming": "Upcoming",
  "meetings.tabs.proposals": "Proposals",
  "meetings.tabs.invitations": "Invitations",
  "meetings.tabs.history": "History",
  "meetings.accept": "Accept",
  "meetings.decline": "Decline",
  "meetings.viewLocation": "View location",
  "meetings.pending": "Pending",
  "meetings.proposeWalk": "Propose a walk →",
  "meetings.loadError": "Could not load meetings. Please try again.",
  "meetings.empty.upcoming": "No upcoming meetings.",
  "meetings.empty.proposals": "No sent proposals.",
  "meetings.empty.invitations": "No pending invitations.",
  "meetings.empty.history": "Completed walks will appear here.",

  // meeting types
  "type.walk": "Walk",
  "type.breeding": "Breeding",

  // propose-meeting form
  "meetingForm.type": "Meeting type",
  "meetingForm.yourDog": "Your dog",
  "meetingForm.dateTime": "Date & time",
  "meetingForm.location": "Location",
  "meetingForm.pinHint": "Drag the pin or tap the map to mark the meeting spot.",
  "meetingForm.submit": "Send invitation",

  // propose-meeting page (new.astro chrome)
  "meetingNew.title": "Propose a meeting",
  "meetingNew.noReceiver": "No owner selected.",
  "meetingNew.backToList": "← Back to list",
  "meetingNew.notFound": "Owner not found.",
  "meetingNew.backToProfile": "← Back to profile",
  "meetingNew.proposeWith": "Propose a meeting with",
  "meetingNew.loading": "Loading the form…",

  // dashboard
  "dashboard.welcomeBack": "Welcome back",
  "dashboard.greeting": "Hi",
  "dashboard.addFirstDog": "Add your first dog",
  "dashboard.whatsNew": "What's new",
  "dashboard.newMessages": "New messages",
  "dashboard.receivedBones": "Bones received",
  "dashboard.invitations": "Invitations",
  "dashboard.nothingNew": "Nothing new — all caught up 🐾",
  "dashboard.tiles.proposeMeeting": "Propose a meeting",
  "dashboard.tiles.dogMap": "Dog map",
  "dashboard.tiles.myMeetings": "My meetings",
  "dashboard.tiles.dogs": "My dogs",
  "dashboard.tiles.profile": "Profile",
  "dashboard.tiles.events": "Events",
  "dashboard.tiles.places": "Places",

  // owners / map page-level
  "owners.title": "Walk map",
  "owners.setCityPrompt": "Set your city in",
  "owners.setCityPromptSuffix": "to see local owners.",
  "owners.profileLink": "Profile",
  "owners.ownerLabel": "owner",
  "owners.proposeWalk": "Propose a walk",

  // events (placeholder page)
  "events.title": "Events",
  "events.inPreparation": "This section is under construction.",
  "events.soon": "Coming soon",

  // bone (pack throw control on discovery surfaces)
  "bone.throw": "Throw a bone",
  "bone.thrown": "Bone thrown",
  "bone.catch": "Catch",
  "bone.message": "Message",

  // owner profile (public profile of another owner + their dogs)
  "ownerProfile.back": "Back",
  "ownerProfile.dogsHeading": "Dogs",
  "ownerProfile.propose": "Propose a meeting",
  "ownerProfile.pending": "Invitation sent — awaiting response",
  "ownerProfile.empty": "No dogs added yet.",
  "ownerProfile.throwBone": "Throw a bone",
  "ownerProfile.boneThrown": "Bone thrown — awaiting",
  "ownerProfile.catchBone": "Catch the bone",
  "ownerProfile.inPack": "In your pack",
  "ownerProfile.message": "Message",
  "ownerProfile.view": "View profile",

  // pack ("moje stado")
  "pack.title": "My pack",
  "pack.requests": "Bones to catch",
  "pack.members": "Your pack",
  "pack.empty": "Your pack is empty. Throw a bone from an owner's profile to start.",
  "pack.noRequests": "No bones waiting.",
  "pack.catch": "Catch",
  "pack.decline": "Decline",
  "pack.message": "Message",
  "pack.badge": "Pack",
  "pack.wantsToJoin": "threw you a bone",

  // chat
  "chat.title": "Chat",
  "chat.back": "← Back to pack",
  "chat.placeholder": "Write a message…",
  "chat.send": "Send",
  "chat.empty": "No messages yet. Say hi!",
  "chat.failed": "Could not send. Try again.",

  // map controls
  "map.breedFilter": "Breed",
  "map.allBreeds": "All breeds",

  // map search filters
  "filter.size": "Size",
  "filter.anySize": "Any size",
  "filter.character": "Character",
  "filter.age": "Age",
  "filter.anyAge": "Any age",
  "filter.distance": "Distance",
  "filter.distanceNoLimit": "No limit",
  "age.puppy": "Puppy (<1 yr)",
  "age.young": "Young (1–3 yrs)",
  "age.adult": "Adult (3–8 yrs)",
  "age.senior": "Senior (8+ yrs)",

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
  "form.dog.selectBreed": "Type or pick a breed",
  "form.dog.breedHint": "Start typing to search — or enter your own breed if it's not listed.",
  "form.dog.weight": "Weight (kg)",
  "form.dog.weightPlaceholder": "e.g. 12.5",
  "form.dog.weightHint": "Approximate weight in kilograms. Also sets the dog's size in the map filter.",
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
  "form.profile.street": "Street",
  "form.profile.city": "City",
  "form.profile.photo": "Photo",
  "form.profile.location": "Your location",
  "form.profile.locationHint": "Drag the pin to set your spot — dog search starts from here.",
  "form.profile.locationPinned":
    "Location set manually — after saving this exact pin position applies (address fields won't move it).",
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
