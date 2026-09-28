import Form from "next/form";
import Link from "next/link";
import { requireAdmin, type AdminClient } from "@/lib/admin";
import { input } from "@/components/admin/styles";
import { PlaceMediaEditor } from "@/components/admin/place-media-editor";
import { BatchFindButton } from "./batch-find-button";

// finding photos for a batch of stops can take a minute
export const maxDuration = 300;

const PAGE = 24;
type Tab = "review" | "missing" | "published" | "all";
const TABS: { key: Tab; label: string }[] = [
  { key: "review", label: "Needs review" },
  { key: "missing", label: "No photo" },
  { key: "published", label: "Published" },
  { key: "all", label: "All stops" },
];

// only stops that appear in at least one tour
// (the column list is built at runtime, so the typed parser sees it as "id"; rows are cast where used)
const base = (supabase: AdminClient, cols: string, opts?: { count: "exact"; head?: boolean }) =>
  supabase.from("places").select(`${cols}, tour_day_places!inner(tour_day_id)` as "id", opts);

function withTab<T extends { eq: (c: string, v: string) => T; or: (f: string) => T; in: (c: string, v: string[]) => T }>(q: T, tab: Tab) {
  if (tab === "review") return q.eq("media_status", "review");
  if (tab === "missing") return q.or("media_status.is.null,media_status.eq.none,media_status.eq.rejected");
  if (tab === "published") return q.in("media_status", ["found", "approved", "manual"]);
  return q;
}

export default async function PlacesPage(props: PageProps<"/admin/places">) {
  const sp = await props.searchParams;
  const tab = (TABS.some((t) => t.key === sp.tab) ? sp.tab : "review") as Tab;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const { supabase } = await requireAdmin();

  const counts = Object.fromEntries(
    await Promise.all(
      TABS.map(async (t) => {
        const { count } = await withTab(base(supabase, "id", { count: "exact", head: true }), t.key);
        return [t.key, count ?? 0] as const;
      }),
    ),
  ) as Record<Tab, number>;

  let list = withTab(
    base(supabase, "id, name, lat, lng, description, image_url, image_credit, image_source_url, info_source_url, media_status, destination:destinations(name)", {
      count: "exact",
    }),
    tab,
  );
  if (q) list = list.ilike("name", `%${q.replace(/[%_,()]/g, " ")}%`);
  const { data, count, error } = await list.order("name").range((page - 1) * PAGE, page * PAGE - 1);
  if (error) throw error;
  const places = data as unknown as {
    id: string;
    name: string;
    lat: number | null;
    lng: number | null;
    description: string | null;
    image_url: string | null;
    image_credit: string | null;
    image_source_url: string | null;
    info_source_url: string | null;
    media_status: string | null;
    destination: { name: string } | null;
    tour_day_places: unknown[];
  }[];

  // stops still to search, for the batch button
  const { data: unsearched } = await base(supabase, "id").is("media_status", null).limit(15);
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const href = (p: Record<string, string | number>) => {
    const qs = new URLSearchParams({ tab, ...(q ? { q } : {}), ...Object.fromEntries(Object.entries(p).map(([k, v]) => [k, String(v)])) });
    return `/admin/places?${qs}`;
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Places</h1>
          <p className="text-sm text-navy-500">
            Every stop in your itineraries. Photos and descriptions come from Wikipedia and Wikimedia Commons (free to use with the credit shown). Verified matches
            publish automatically; the rest wait here for you.
          </p>
        </div>
        <BatchFindButton ids={(unsearched ?? []).map((p) => p.id)} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-xl bg-white p-1 ring-1 ring-navy-100">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/admin/places?tab=${t.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === t.key ? "bg-navy-800 text-white" : "text-navy-600 hover:bg-navy-50"}`}
            >
              {t.label} <span className={tab === t.key ? "text-navy-200" : "text-navy-400"}>{counts[t.key]}</span>
            </Link>
          ))}
        </div>
        <Form action="/admin/places" className="flex gap-2">
          <input type="hidden" name="tab" value={tab} />
          <input name="q" defaultValue={q} placeholder="Search stops…" className={`${input} w-56`} />
          <button type="submit" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-navy-800 ring-1 ring-navy-200 hover:bg-navy-50">Search</button>
        </Form>
      </div>

      <div className="space-y-3">
        {places.map((p) => (
          <PlaceMediaEditor
            key={`${p.id}-${p.media_status}-${p.image_url}`}
            place={{ ...p, area: p.destination?.name ?? null, tourCount: p.tour_day_places.length }}
          />
        ))}
        {places.length === 0 && (
          <p className="rounded-xl bg-white p-10 text-center text-navy-400 ring-1 ring-navy-100">
            {tab === "review" ? "Nothing to review. Every photo found so far is either verified or already checked." : "No stops here."}
          </p>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          {page > 1 && <Link href={href({ page: page - 1 })} className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-navy-200 hover:bg-navy-50">← Previous</Link>}
          <span className="text-navy-500">Page {page} of {pages}</span>
          {page < pages && <Link href={href({ page: page + 1 })} className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-navy-200 hover:bg-navy-50">Next →</Link>}
        </div>
      )}
    </div>
  );
}
