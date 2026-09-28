// Create (or promote) an admin user.
// Usage: node --env-file=.env.local scripts/create-admin.mjs <email> [password]
// Without a password, a random one is generated and printed once.
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const [email, given] = process.argv.slice(2);
if (!email) {
  console.error("Usage: node --env-file=.env.local scripts/create-admin.mjs <email> [password]");
  process.exit(1);
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const password = given ?? randomBytes(12).toString("base64url");
let userId;

const { data: created, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
if (error) {
  // already exists: look it up and promote it (password unchanged)
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) throw listErr;
  const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!existing) throw error;
  userId = existing.id;
  console.log(`User ${email} already exists; granting admin access (password unchanged).`);
} else {
  userId = created.user.id;
  console.log(`Created ${email}`);
  if (!given) console.log(`Password: ${password}   <- save this now, it is not shown again`);
}

const { error: adminErr } = await supabase.from("admins").upsert({ user_id: userId });
if (adminErr) throw adminErr;
console.log("Admin access granted.");
