-- Optional time-of-day for a calendar event (e.g. a 9:30 vet appointment). Nullable:
-- many events are all-day (a vaccination due date), so the time is opt-in.
alter table dog_events
  add column event_time time;
