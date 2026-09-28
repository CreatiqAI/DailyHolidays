import Link from "next/link";
import { CalendarDays, FilePlus2, Inbox, Route, Sparkles } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { addDaysISO, formatDate, formatRM, todayISO } from "@/lib/format";

export default async function Dashboard() {
  const { supabase } = await requireAdmin();
  const today = todayISO();
  const in60 = addDaysISO(today, 60);

  const [published, drafts, newEnq, upcoming, enquiries, departures] = await Promise.all([
    supabase.from("tours").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("tours").select("id", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("enquiries").select("id", { count: "exact", head: true }).eq("handled", false),
    supabase.from("tour_departures").select("id", { count: "exact", head: true }).gte("departure_date", today).lte("departure_date", in60),
    supabase
      .from("enquiries")
      .select("id, name, phone, created_at, handled, tour:tours(title)")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("tour_departures")
      .select("id, departure_date, price_myr, status, tour:tours!inner(id, title, status)")
      .gte("departure_date", today)
      .eq("tours.status", "published")
      .order("departure_date")
      .limit(8),
  ]);

  const stats = [
    { label: "Published tours", value: published.count ?? 0, icon: Route, href: "/admin/tours?status=published" },
    { label: "Drafts to review", value: drafts.count ?? 0, icon: FilePlus2, href: "/admin/tours?status=draft" },
    { label: "New enquiries", value: newEnq.count ?? 0, icon: Inbox, href: "/admin/enquiries" },
    { label: "Departures, next 60 days", value: upcoming.count ?? 0, icon: CalendarDays, href: "/admin/tours" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-navy-900">Dashboard</h1>
        <Link href="/admin/tours/new" className="inline-flex items-center gap-2 rounded-lg bg-sun-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sun-600">
          <Sparkles className="size-4" /> New tour from PDF
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="rounded-xl bg-white p-5 ring-1 ring-navy-100 hover:ring-navy-300">
            <s.icon className="size-5 text-sun-500" />
            <p className="mt-3 text-3xl font-bold text-navy-900">{s.value}</p>
            <p className="text-sm text-navy-500">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl bg-white ring-1 ring-navy-100">
          <header className="flex items-center justify-between border-b border-navy-100 px-5 py-3">
            <h2 className="font-semibold text-navy-900">Latest enquiries</h2>
            <Link href="/admin/enquiries" className="text-sm text-navy-600 hover:underline">All</Link>
          </header>
          <ul className="divide-y divide-navy-50">
            {(enquiries.data ?? []).map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-navy-900">{e.name} <span className="font-normal text-navy-500">· {e.phone}</span></p>
                  <p className="truncate text-navy-500">{e.tour?.title ?? "General enquiry"}</p>
                </div>
                <div className="shrink-0 text-right">
                  {!e.handled && <span className="rounded-full bg-sun-100 px-2 py-0.5 text-xs font-semibold text-sun-700">New</span>}
                  <p className="text-xs text-navy-400">{new Date(e.created_at).toLocaleDateString("en-MY")}</p>
                </div>
              </li>
            ))}
            {!enquiries.data?.length && <li className="px-5 py-6 text-sm text-navy-400">No enquiries yet.</li>}
          </ul>
        </section>

        <section className="rounded-xl bg-white ring-1 ring-navy-100">
          <header className="border-b border-navy-100 px-5 py-3">
            <h2 className="font-semibold text-navy-900">Next departures</h2>
          </header>
          <ul className="divide-y divide-navy-50">
            {(departures.data ?? []).map((d) => (
              <li key={d.id}>
                <Link href={`/admin/tours/${d.tour.id}`} className="flex items-center justify-between gap-4 px-5 py-3 text-sm hover:bg-navy-50/50">
                  <span className="w-20 shrink-0 font-semibold text-navy-900">{formatDate(d.departure_date)}</span>
                  <span className="min-w-0 flex-1 truncate text-navy-600">{d.tour.title}</span>
                  <span className="shrink-0 text-navy-500">{formatRM(d.price_myr, { compact: true }) ?? "—"}</span>
                </Link>
              </li>
            ))}
            {!departures.data?.length && <li className="px-5 py-6 text-sm text-navy-400">No upcoming departures.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
