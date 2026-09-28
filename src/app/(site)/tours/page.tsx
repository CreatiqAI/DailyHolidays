import type { Metadata } from "next";
import Link from "next/link";
import { X } from "lucide-react";
import { getActiveDestinationIds, getDestinations, listTours, type TourFilters as Filters } from "@/lib/queries";
import { formatMonth, todayISO } from "@/lib/format";
import { regions, tourTypeLabels, whatsappLink } from "@/lib/site";
import { PageHero } from "@/components/site/page-hero";
import { Reveal } from "@/components/site/reveal";
import { TourCard } from "@/components/site/tour-card";
import { TourFilters } from "@/components/site/tour-filters";
import { WhatsAppIcon } from "@/components/site/icons";

export const metadata: Metadata = {
  title: "Tours & holiday packages",
  description: "Browse group tours, ground tours, cruises and Malaysia holidays with dates, prices and day-by-day itineraries.",
};

function str(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
}

const budgetLabel: Record<string, string> = { "2000": "Under RM 2,000", "4000": "Under RM 4,000", "7000": "Under RM 7,000", "10000": "Under RM 10,000" };
const durationLabels: Record<string, string> = { short: "Up to 4 days", mid: "5 – 8 days", long: "9+ days" };

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

  const chosen = destinations.find((d) => d.slug === values.destination);
  const chosenCountry = chosen?.parent_id ? destinations.find((d) => d.id === chosen.parent_id) : chosen;
  const heading = chosen?.name ?? values.region ?? (values.type ? `${tourTypeLabels[values.type]}s` : "All trips");

  // backdrop: the chosen country's hero photo, else the first generated country photo
  const heroImage =
    chosenCountry?.cover_image_url ??
    destinations.find((d) => !d.parent_id && d.cover_image_url?.includes("/hero/"))?.cover_image_url ??
    tours.find((t) => t.cover_image_url)?.cover_image_url ??
    null;

  // removable chips for the active filters
  const chipLabel: Record<string, string | undefined> = {
    q: values.q && `“${values.q}”`,
    region: values.region,
    destination: chosen?.name,
    month: values.month && formatMonth(`${values.month}-01`),
    maxPrice: values.maxPrice && budgetLabel[values.maxPrice],
    duration: values.duration && durationLabels[values.duration],
    type: values.type && tourTypeLabels[values.type],
  };
  const without = (key: string) => {
    const qs = new URLSearchParams(Object.entries(values).filter(([k, v]) => k !== key && v) as [string, string][]);
    return qs.size ? `/tours?${qs}` : "/tours";
  };

  return (
    <>
      <PageHero
        image={heroImage}
        eyebrow="Find your trip"
        title={heading}
        subtitle={
          <>
            {tours.length} {tours.length === 1 ? "trip" : "trips"}
            {values.month ? ` departing in ${formatMonth(`${values.month}-01`)}` : ""}. Every one with a day-by-day plan, a route map and the fares for each departure.
          </>
        }
      />

      <div className="relative z-10 mx-auto -mt-8 max-w-7xl px-4 sm:px-6">
        <TourFilters
          values={values}
          destinations={destinationOptions}
          regions={regions.map((r) => ({ value: r, label: r }))}
          months={months}
          types={Object.entries(tourTypeLabels).map(([value, label]) => ({ value, label }))}
        />
        {Object.values(chipLabel).some(Boolean) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(chipLabel).map(([key, label]) =>
              label ? (
                <Link
                  key={key}
                  href={without(key)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-sun-500/15 px-3 py-1.5 text-xs font-semibold text-sun-200 ring-1 ring-sun-400/40 hover:bg-sun-500/25"
                >
                  {label} <X className="size-3.5" />
                </Link>
              ) : null,
            )}
          </div>
        )}
      </div>

      <section className="mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6">
        {tours.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tours.map((t, i) => (
              <Reveal key={t.id} delay={(i % 4) * 70}>
                <TourCard tour={t} priority={i < 4} />
              </Reveal>
            ))}
          </div>
        ) : (
          <Reveal className="rounded-3xl bg-white/[0.04] p-12 text-center ring-1 ring-white/10">
            <p className="text-xl font-bold">No trips match these filters</p>
            <p className="mt-2 text-navy-200">Try a different month or budget, or tell us what you have in mind and we&apos;ll plan it.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/tours" className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold ring-1 ring-white/15 hover:bg-white/20">
                Clear filters
              </Link>
              <a
                href={whatsappLink("Hi Daily Holidays, I'm looking for a trip.")}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white"
              >
                <WhatsAppIcon className="size-4" /> WhatsApp us
              </a>
            </div>
          </Reveal>
        )}
      </section>
    </>
  );
}
