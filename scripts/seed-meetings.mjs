/**
 * Seed script — test data for ui-meetings-tabs
 * Creates accepted meetings (Nadchodzące) and sent-pending invitations (Propozycje)
 *
 * Usage: node scripts/seed-meetings.mjs <email> <password>
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://bhxavwzgoygjtytqmlak.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY ?? "sb_publishable_N6iiLgoD0FPe85GM_Jb4Kg_gPQ7vrGn";

const [, , email, password] = process.argv;

if (!email || !password) {
  console.error("Usage: node scripts/seed-meetings.mjs <email> <password>");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  // 1. Sign in
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (authErr) throw new Error("Sign-in failed: " + authErr.message);
  const me = authData.user;
  console.log(`\n✓ Zalogowano jako ${email} (${me.id})`);

  // 2. Fetch all profiles (visible to authenticated user)
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("id, name")
    .order("created_at", { ascending: true });

  if (pErr) throw new Error("Cannot fetch profiles: " + pErr.message);

  const others = (profiles ?? []).filter((p) => p.id !== me.id);

  if (others.length === 0) {
    console.error(
      "Brak innych profili w bazie. Utwórz co najmniej jedno inne konto testowe, żeby mieć z kim tworzyć spotkania.",
    );
    process.exit(1);
  }

  const myProfile = profiles.find((p) => p.id === me.id);
  console.log(`  Mój profil: "${myProfile?.name ?? "(brak profilu)"}"`);
  console.log(`  Inne profile: ${others.map((p) => `"${p.name}"`).join(", ")}\n`);

  // 3. Clean up existing invitations for this user
  const { error: delErr } = await supabase
    .from("invitations")
    .delete()
    .or(`sender_id.eq.${me.id},receiver_id.eq.${me.id}`);
  if (delErr) console.warn("Cleanup warning:", delErr.message);

  // 4. Build invitations
  const invitations = [];

  // Nadchodzące: accepted — tylko sender_id = me.id (RLS nie pozwala na inne)
  if (others[0]) {
    invitations.push({ sender_id: me.id, receiver_id: others[0].id, type: "walk", status: "accepted" });
  }
  if (others[1]) {
    invitations.push({ sender_id: me.id, receiver_id: others[1].id, type: "breeding", status: "accepted" });
  }
  if (others[2]) {
    invitations.push({ sender_id: me.id, receiver_id: others[2].id, type: "walk", status: "accepted" });
  }

  // Propozycje: sent pending — sender_id = me.id
  if (others[0]) {
    invitations.push({ sender_id: me.id, receiver_id: others[0].id, type: "walk", status: "pending" });
  }
  if (others[1]) {
    invitations.push({ sender_id: me.id, receiver_id: others[1].id, type: "breeding", status: "pending" });
  }

  // 5. Insert
  const { data: inserted, error: insErr } = await supabase.from("invitations").insert(invitations).select();

  if (insErr) throw new Error("Insert failed: " + insErr.message);

  const accepted = inserted.filter((i) => i.status === "accepted");
  const pending = inserted.filter((i) => i.status === "pending");

  console.log(`✓ Zakładka Nadchodzące — ${accepted.length} rekord(ów):`);
  for (const i of accepted) {
    const otherName =
      i.sender_id === me.id
        ? profiles.find((p) => p.id === i.receiver_id)?.name
        : profiles.find((p) => p.id === i.sender_id)?.name;
    const dir = i.sender_id === me.id ? "→" : "←";
    console.log(`  ${dir} ${otherName} [${i.type}]`);
  }

  console.log(`\n✓ Zakładka Propozycje — ${pending.length} rekord(ów):`);
  for (const i of pending) {
    const otherName = profiles.find((p) => p.id === i.receiver_id)?.name;
    console.log(`  → ${otherName} [${i.type}] (oczekuje)`);
  }

  console.log(`\n✓ Zakładka Historia — brak danych (brak scheduledAt, zawsze pusta)`);
  console.log(`\nSeed complete! Otwórz /meetings w przeglądarce i przetestuj zakładki.\n`);
}

main().catch((err) => {
  console.error("\nSeed failed:", err.message);
  process.exit(1);
});
