import Link from "next/link";
import { Mail, Phone, Trash2, Users } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { deleteEnquiry, setEnquiryHandled } from "@/app/admin/actions";
import { formatDate } from "@/lib/format";
import { WhatsAppIcon } from "@/components/site/icons";

export default async function EnquiriesPage(props: PageProps<"/admin/enquiries">) {
  const { show } = await props.searchParams;
  const showAll = show === "all";
  const { supabase } = await requireAdmin();

  let query = supabase
    .from("enquiries")
    .select("*, tour:tours(id, title, slug), departure:tour_departures(departure_date)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (!showAll) query = query.eq("handled", false);
  const { data: enquiries, error } = await query;
  if (error) throw error;

  const waNumber = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    return digits.startsWith("0") ? `6${digits}` : digits;
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-navy-900">Enquiries</h1>
        <div className="flex rounded-lg bg-white p-1 ring-1 ring-navy-100">
          <Link href="/admin/enquiries" className={`rounded-md px-3 py-1.5 text-sm font-medium ${!showAll ? "bg-navy-800 text-white" : "text-navy-600"}`}>New</Link>
          <Link href="/admin/enquiries?show=all" className={`rounded-md px-3 py-1.5 text-sm font-medium ${showAll ? "bg-navy-800 text-white" : "text-navy-600"}`}>All</Link>
        </div>
      </div>

      <ul className="space-y-3">
        {enquiries.map((e) => (
          <li key={e.id} className={`rounded-xl bg-white p-5 ring-1 ${e.handled ? "ring-navy-100 opacity-75" : "ring-sun-200"}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <p className="font-semibold text-navy-900">
                  {e.name}
                  {!e.handled && <span className="ml-2 rounded-full bg-sun-100 px-2 py-0.5 text-xs font-semibold text-sun-700">New</span>}
                </p>
                <p className="text-sm text-navy-600">
                  {e.tour ? (
                    <Link href={`/admin/tours/${e.tour.id}`} className="hover:underline">{e.tour.title}</Link>
                  ) : (
                    "General enquiry"
                  )}
                  {e.departure && <> · departing <strong>{formatDate(e.departure.departure_date, "long")}</strong></>}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-navy-500">
                  <a href={`tel:${e.phone}`} className="flex items-center gap-1 hover:text-navy-800"><Phone className="size-3.5" /> {e.phone}</a>
                  {e.email && <a href={`mailto:${e.email}`} className="flex items-center gap-1 hover:text-navy-800"><Mail className="size-3.5" /> {e.email}</a>}
                  {e.pax && <span className="flex items-center gap-1"><Users className="size-3.5" /> {e.pax} pax</span>}
                </div>
              </div>
              <p className="text-xs text-navy-400">{new Date(e.created_at).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}</p>
            </div>
            {e.message && <p className="mt-3 whitespace-pre-line rounded-lg bg-navy-50/60 p-3 text-sm text-navy-700">{e.message}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <a
                href={`https://wa.me/${waNumber(e.phone)}?text=${encodeURIComponent(`Hi ${e.name}, this is Daily Holidays regarding your enquiry${e.tour ? ` about "${e.tour.title}"` : ""}.`)}`}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-1.5 text-sm font-semibold text-white hover:brightness-95"
              >
                <WhatsAppIcon className="size-4" /> Reply on WhatsApp
              </a>
              <form action={setEnquiryHandled.bind(null, e.id, !e.handled)}>
                <button type="submit" className="rounded-lg px-3 py-1.5 text-sm font-semibold text-navy-700 ring-1 ring-navy-200 hover:bg-navy-50">
                  {e.handled ? "Mark as new" : "Mark as handled"}
                </button>
              </form>
              <form action={deleteEnquiry.bind(null, e.id)} className="ml-auto">
                <button type="submit" aria-label="Delete enquiry" className="rounded-lg p-1.5 text-navy-400 hover:bg-red-50 hover:text-red-600">
                  <Trash2 className="size-4" />
                </button>
              </form>
            </div>
          </li>
        ))}
        {enquiries.length === 0 && (
          <li className="rounded-xl bg-white p-10 text-center text-navy-400 ring-1 ring-navy-100">
            {showAll ? "No enquiries yet." : "All caught up. No new enquiries."}
          </li>
        )}
      </ul>
    </div>
  );
}
