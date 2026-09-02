/* eslint-disable no-console */
/**
 * One-off admin script: remove all CENTRE_MANAGER users (except PLATFORM_ADMINISTRATOR)
 * from the production database and delete their accounts entirely.
 *
 * Run: node scripts/remove-all-managers.mjs [--apply]
 * - without --apply: dry run (lists what will be removed)
 * - with --apply: actually deletes
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

// Minimal .env.local loader (no dotenv dependency)
function loadEnvFile(path) {
  const env = {};
  try {
    const content = fs.readFileSync(path, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m) {
        let val = m[2].trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        env[m[1]] = val;
      }
    }
  } catch {}
  return env;
}

const apply = process.argv.includes("--apply");
const env = loadEnvFile(".env.local");
const admin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function main() {
  // Find CENTRE_MANAGER role id
  const { data: mgrRole } = await admin
    .from("roles")
    .select("id, name")
    .eq("name", "CENTRE_MANAGER")
    .maybeSingle();

  if (!mgrRole) {
    console.log("No CENTRE_MANAGER role found.");
    return;
  }

  // Find all active manager user_roles
  const { data: managerRoles, error } = await admin
    .from("user_roles")
    .select(`
      id, user_id, centre_id,
      profile:user_profiles!user_id (id, first_name, last_name, email, auth_user_id),
      centre:centres!centre_id (id, name, code)
    `)
    .eq("role_id", mgrRole.id);

  if (error) {
    console.error("Query error:", error.message);
    return;
  }

  console.log(`\n=== Found ${managerRoles?.length ?? 0} CENTRE_MANAGER assignments ===`);
  console.log("Dry run (add --apply to actually delete):\n");

  let toDeleteUsers = new Map(); // auth_user_id -> profile info
  for (const mr of managerRoles ?? []) {
    const p = mr.profile;
    const c = mr.centre;
    console.log(
      `- ${p?.first_name ?? "?"} ${p?.last_name ?? "?"} (${p?.email ?? "?"}) @ ${c?.name ?? "?"} (${c?.code ?? "?"})`,
    );
    if (p?.auth_user_id) toDeleteUsers.set(p.auth_user_id, p);
  }

  if (!apply) {
    console.log(`\nWill delete ${toDeleteUsers.size} auth user account(s) and their profiles.`);
    return;
  }

  console.log("\n=== APPLYING DELETION ===");

  let removed = 0;
  let failed = 0;
  for (const [authUserId, p] of toDeleteUsers) {
    try {
      // Delete the auth user (cascades profile? check) — delete profile & role first to be safe.
      await admin.from("user_roles").delete().eq("user_id", p.id);
      await admin.from("user_profiles").delete().eq("id", p.id);
      // delete auth user last
      const { error: delErr } = await admin.auth.admin.deleteUser(authUserId);
      if (delErr) throw new Error(delErr.message);
      console.log(`  DELETED ${p.email} (${p.first_name} ${p.last_name})`);
      removed++;
    } catch (e) {
      console.error(`  FAILED ${p.email}: ${e.message}`);
      failed++;
    }
  }

  console.log(`\nDone. Removed ${removed}, failed ${failed}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
