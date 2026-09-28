import type { Metadata } from "next";
import { getActiveDestinationIds, getDestinations, listTours, type TourFilters as Filters } from "@/lib/queries";
import { formatMonth, todayISO } from "@/lib/format";
import { regions, tourTypeLabels } from "@/lib/site";
import { TourCard } from "@/components/site/tour-card";
import { TourFilters } from "@/components/site/tour-filters";

export const metadata: Metadata = {
  title: "Tours & holiday packages",
  description: "Browse group tours, ground tours, cruises and Malaysia holidays with dates, prices and day-by-day itineraries.",
};

function str(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
}

export default async function ToursPage(props: PageProps<"/tours">) {
  const sp = await props.searchParams;
  const values = {
    q: str(sp.q),
    region: str(sp.region),
    destination: str(sp.destination),
    month: str(sp.month),
    maxPrice: str(sp.maxPrice),
    duration: str(sp.duration),
    type: str(sp.type),
  };
  const filters: Filters = { ...values, maxPrice: values.maxPrice ? Number(values.maxPrice) || undefined : undefined };

  const [tours, destinations, active] = await Promise.all([listTours(filters), getDestinations(), getActiveDestinationIds()]);

  const [y, m] = todayISO().split("-").map(Number);
  const months = Array.from({ length: 12 }, (_, i) => {
    const value = new Date(Date.UTC(y, m - 1 + i, 1)).toISOString().slice(0, 7);
    return { value, label: formatMonth(`${value}-01`) };
  });

  const countries = destinations.filter((d) => !d.parent_id && active.has(d.id));
  const destinationOptions = countries.flatMap((c) => [
    { value: c.slug, label: c.name },
    ...destinations.filter((d) => d.parent_id === c.id && active.has(d.id)).map((d) => ({ value: d.slug, label: `  – ${d.name}` })),
  ]);

  const heading =
    destinations.find((d) => d.slug === values.destination)?.name ??
    values.region ??
    (values.type ? tourTypeLabels[values.type] + "s" : "All trips");

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-sun-600">Find your trip</p>
        <h1 className="mt-1 text-3xl font-bold text-navy-900 sm:text-4xl">{heading}</h1>
        <p className="mt-2 text-navy-500">
          {tours.length} {tours.length === 1 ? "trip" : "trips"} found
          {values.month ? ` departing in ${formatMonth(`${values.month}-01`)}` : ""}
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <TourFilters
            values={values}
            destinations={destinationOptions}
            regions={regions.map((r) => ({ value: r, label: r }))}
            months={months}
            types={Object.entries(tourTypeLabels).map(([value, label]) => ({ value, label }))}
          />
        </aside>

        {tours.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {tours.map((t, i) => (
              <TourCard key={t.id} tour={t} priority={i < 3} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-12 text-center ring-1 ring-navy-100">
            <p className="text-lg font-semibold text-navy-900">No trips match these filters</p>
            <p className="mt-2 text-navy-500">Try a different month or budget, or message us and we&apos;ll plan one for you.</p>
          </div>
        )}
      </div>
    </div>
  );
}
