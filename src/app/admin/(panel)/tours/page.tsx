import Form from "next/form";
import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { durationLabel, formatRM, todayISO } from "@/lib/format";
import { tourTypeLabels } from "@/lib/site";
import { input } from "@/components/admin/styles";

const statusStyle: Record<string, string> = {
  published: "bg-green-100 text-green-800",
  draft: "bg-sun-100 text-sun-700",
  archived: "bg-navy-100 text-navy-600",
};

export default async function AdminTours(props: PageProps<"/admin/tours">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const { supabase } = await requireAdmin();
  const today = todayISO();

  let query = supabase
    .from("tours")
    .select(
      "id, title, slug, status, tour_type, duration_days, duration_nights, price_from_myr, cover_image_url, updated_at, destination:destinations(name), tour_departures(departure_date), tour_days(id)",
    )
    .order("updated_at", { ascending: false });
  if (q) query = query.ilike("title", `%${q.replace(/[%_,()]/g, " ")}%`);
  if (status) query = query.eq("status", status as "draft" | "published" | "archived");
  const { data: tours, error } = await query;
  if (error) throw error;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-navy-900">Tours <span className="text-base font-normal text-navy-400">({tours.length})</span></h1>
        <Link href="/admin/tours/new" className="inline-flex items-center gap-2 rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-700">
          <Plus className="size-4" /> New tour
        </Link>
      </div>

      <Form action="/admin/tours" className="flex flex-wrap gap-3">
        <input name="q" defaultValue={q} placeholder="Search title…" className={`${input} max-w-xs`} />
        <select name="status" defaultValue={status} className={`${input} w-40`}>
          <option value="">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <button type="submit" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-navy-800 ring-1 ring-navy-200 hover:bg-navy-50">Filter</button>
      </Form>

      <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-navy-100">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-navy-100 text-left text-xs uppercase tracking-wide text-navy-500">
            <tr>
              <th className="px-4 py-3">Tour</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">From</th>
              <th className="px-4 py-3">Upcoming dates</th>
              <th className="px-4 py-3">Days</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-50">
            {tours.map((t) => {
              const upcoming = t.tour_departures.filter((d) => d.departure_date >= today).length;
              return (
                <tr key={t.id} className="hover:bg-navy-50/40">
                  <td className="px-4 py-3">
                    <Link href={`/admin/tours/${t.id}`} className="flex items-center gap-3">
                      <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-navy-100">
                        {t.cover_image_url && <Image src={t.cover_image_url} alt="" fill sizes="48px" className="object-cover" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-medium text-navy-900 hover:underline">{t.title}</span>
                        <span className="text-xs text-navy-500">
                          {[t.destination?.name, durationLabel(t.duration_days, t.duration_nights)].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-navy-600">{tourTypeLabels[t.tour_type]}</td>
                  <td className="px-4 py-3 text-navy-600">{formatRM(t.price_from_myr, { compact: true }) ?? "—"}</td>
                  <td className="px-4 py-3 text-navy-600">{upcoming || <span className="text-navy-300">0</span>}</td>
                  <td className="px-4 py-3 text-navy-600">{t.tour_days.length || <span className="text-navy-300">0</span>}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusStyle[t.status]}`}>{t.status}</span>
                  </td>
                </tr>
              );
            })}
            {tours.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-navy-400">No tours found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
