import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { Sidebar } from "@/components/admin/sidebar";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { supabase, email } = await requireAdmin();
  const [{ count }, { count: review }] = await Promise.all([
    supabase.from("enquiries").select("id", { count: "exact", head: true }).eq("handled", false),
    supabase.from("places").select("id", { count: "exact", head: true }).eq("media_status", "review"),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-navy-50/60 lg:flex-row">
      <Sidebar email={email} newEnquiries={count ?? 0} placesToReview={review ?? 0} />
      <div className="min-w-0 flex-1 p-4 sm:p-8">{children}</div>
    </div>
  );
}
