import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Returns a session client for a signed-in admin, or redirects to the login page. */
export async function requireAdmin() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/admin/login");

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/admin/login?error=not-admin");

  return { supabase, email: (claims.claims.email as string | undefined) ?? "" };
}

export type AdminClient = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

export type ActionResult = { ok: boolean; message?: string; error?: string } | null;
