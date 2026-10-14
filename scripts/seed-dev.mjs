// Dev seed: populate every screen for the primary test account (e2e-user-a) so
// the map, pack, chat and meetings tabs all have something to show. Runs against
// the remote test Supabase using the service-role key from .env.test (bypasses
// RLS). Idempotent: re-running resets user A's relations and reuses existing users.
//
//   node scripts/seed-dev.mjs
//
// Needs .env.test with SUPABASE_TEST_URL + SUPABASE_TEST_SERVICE_ROLE_KEY.

import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(".env.test");
const url = process.env.SUPABASE_TEST_URL;
const key = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_TEST_URL / SUPABASE_TEST_SERVICE_ROLE_KEY in .env.test");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });
const PW = "Test1234!";
const CITY = "Warszawa";

async function ensureUser(email, name) {
  const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
  let user = list.users.find((u) => u.email === email);
  if (!user) {
    const { data, error } = await db.auth.admin.createUser({ email, password: PW, email_confirm: true });
    if (error) throw new Error(`createUser ${email}: ${error.message}`);
    user = data.user;
  }
  await db.from("profiles").upsert({ id: user.id, name, city: CITY, district: null }, { onConflict: "id" });
  return user.id;
}

async function ensureDog(ownerId, name, breed) {
  const { data } = await db.from("dogs").select("id").eq("owner_id", ownerId).limit(1);
  if (!data || data.length === 0) {
    await db.from("dogs").insert({ owner_id: ownerId, name, breed, size: "medium", traits: [] });
  }
}

const A = await ensureUser("e2e-user-a@test.local", "e2e-user-a");
const B = await ensureUser("e2e-user-b@test.local", "e2e-user-b");
const C = await ensureUser("e2e-user-c@test.local", "Celina");
const D = await ensureUser("e2e-user-d@test.local", "Darek");
const E = await ensureUser("e2e-user-e@test.local", "Ewa");

await ensureDog(B, "Reks", "Owczarek niemiecki");
await ensureDog(C, "Fafik", "Beagle");
await ensureDog(D, "Luna", "Border Collie");
await ensureDog(E, "Puszek", "Pudel miniaturowy");

// Reset A's relations so re-runs are deterministic.
await db.from("messages").delete().or(`sender_id.eq.${A},receiver_id.eq.${A}`);
await db.from("pack_connections").delete().or(`requester_id.eq.${A},addressee_id.eq.${A}`);
await db.from("invitations").delete().or(`sender_id.eq.${A},receiver_id.eq.${A}`);

// Pack: C threw A a bone (to catch); A & B already in a pack (chat enabled).
await db.from("pack_connections").insert([
  { requester_id: C, addressee_id: A, status: "pending" },
  { requester_id: A, addressee_id: B, status: "accepted" },
]);

// Chat history with B.
await db.from("messages").insert([
  { sender_id: B, receiver_id: A, body: "Cześć! Idziemy na spacer w weekend?" },
  { sender_id: A, receiver_id: B, body: "Jasne, w sobotę rano w parku?" },
]);

// Meetings: D invited A (Invitations), A invited E (Proposals), A+B confirmed (Upcoming).
const future = new Date(Date.now() + 3 * 86_400_000).toISOString();
const WAW = { location_lat: 52.2297, location_lng: 21.0122 };
await db.from("invitations").insert([
  { sender_id: D, receiver_id: A, type: "walk", status: "pending", scheduled_at: future, ...WAW },
  { sender_id: A, receiver_id: E, type: "walk", status: "pending", scheduled_at: future, ...WAW },
  { sender_id: A, receiver_id: B, type: "walk", status: "accepted", scheduled_at: future, ...WAW },
]);

console.log("Seeded demo world for e2e-user-a:");
console.log("  map:        owners B, C, D, E (each with a dog) in", CITY);
console.log("  pack:       C -> A pending (catch), A <-> B accepted");
console.log("  chat:       2 messages with B");
console.log("  meetings:   D->A (invitations), A->E (proposals), A<->B accepted (upcoming)");
