import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BedDouble, Check, ChevronRight, Clock, Download, FileText, MapPin, Minus, Plane, Sparkles } from "lucide-react";
import { getTour } from "@/lib/queries";
import { durationLabel } from "@/lib/format";
import { tourTypeLabels } from "@/lib/site";
import { BookingPanel } from "@/components/site/booking-panel";
import { Gallery } from "@/components/site/gallery";
import { ItineraryExplorer } from "@/components/site/itinerary-explorer";
import { RichText } from "@/components/site/rich-text";
import { TourImagePlaceholder } from "@/components/site/tour-image-placeholder";

export const revalidate = 300;

// Render each tour on first visit, then serve it from cache (revalidated every 5 min or on admin save).
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata(props: PageProps<"/tours/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const tour = await getTour(slug);
  if (!tour) return {};
  return {
    title: tour.title,
    description: tour.summary ?? undefined,
    openGraph: { title: tour.title, description: tour.summary ?? undefined, images: tour.cover_image_url ? [tour.cover_image_url] : [] },
  };
}

export default async function TourPage(props: PageProps<"/tours/[slug]">) {
  const { slug } = await props.params;
  const tour = await getTour(slug);
  if (!tour) notFound();

  const duration = durationLabel(tour.duration_days, tour.duration_nights);
  const dest = tour.destination;
  const country = dest?.parent ?? dest;

  const facts = [
    duration && { icon: Clock, label: "Duration", value: duration },
    dest && { icon: MapPin, label: "Destination", value: dest.parent ? `${dest.name}, ${dest.parent.name}` : dest.name },
    tour.airline && { icon: Plane, label: "Airline", value: tour.airline },
    tour.hotel_rating && { icon: BedDouble, label: "Hotels", value: tour.hotel_rating },
  ].filter(Boolean) as { icon: typeof Clock; label: string; value: string }[];

  return (
    <article>
      {/* HERO */}
      <section className="relative isolate flex min-h-[60vh] items-end overflow-hidden bg-navy-900 pt-16">
        {tour.cover_image_url ? (
          <Image src={tour.cover_image_url} alt={tour.title} fill priority sizes="100vw" className="-z-10 object-cover" />
        ) : (
          <div className="-z-10"><TourImagePlaceholder label="" /></div>
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-950/90 via-navy-950/30 to-navy-950/40" />
        <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-24 sm:px-6">
          <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-navy-100" aria-label="Breadcrumb">
            <Link href="/tours" className="hover:text-white">Tours</Link>
            {country && (
              <>
                <ChevronRight className="size-4" />
                <Link href={`/tours?destination=${country.slug}`} className="hover:text-white">{country.name}</Link>
              </>
            )}
            {dest?.parent && (
              <>
                <ChevronRight className="size-4" />
                <Link href={`/tours?destination=${dest.slug}`} className="hover:text-white">{dest.name}</Link>
              </>
            )}
          </nav>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-sun-500 px-3 py-1 text-xs font-semibold text-white">
              {tourTypeLabels[tour.tour_type] ?? "Tour"}
            </span>
            {duration && <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">{duration}</span>}
            {tour.code && <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">{tour.code}</span>}
          </div>
          <h1 className="mt-3 max-w-4xl text-3xl font-extrabold leading-tight text-white sm:text-5xl">{tour.title}</h1>
          {tour.summary && <p className="mt-3 max-w-3xl text-lg text-navy-100">{tour.summary}</p>}
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-14">
          {/* FACTS + HIGHLIGHTS */}
          <section className="space-y-6">
            {facts.length > 0 && (
              <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {facts.map((f) => (
                  <div key={f.label} className="rounded-2xl bg-white p-4 ring-1 ring-navy-100">
                    <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-navy-400">
                      <f.icon className="size-3.5" /> {f.label}
                    </dt>
                    <dd className="mt-1 font-semibold text-navy-900">{f.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {tour.highlights.length > 0 && (
              <div className="rounded-2xl bg-gradient-to-br from-navy-800 to-navy-700 p-6 text-white">
                <h2 className="flex items-center gap-2 font-semibold"><Sparkles className="size-5 text-sun-300" /> Trip highlights</h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {tour.highlights.map((h) => (
                    <li key={h} className="flex gap-2 text-sm text-navy-50">
                      <Check className="mt-0.5 size-4 shrink-0 text-sun-300" /> {h}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* ITINERARY */}
          {tour.days.length > 0 ? (
            <section id="itinerary">
              <h2 className="mb-6 text-2xl font-bold text-navy-900">Day-by-day itinerary</h2>
              <ItineraryExplorer days={tour.days} />
            </section>
          ) : (
            tour.description && (
              <section>
                <h2 className="mb-4 text-2xl font-bold text-navy-900">About this trip</h2>
                <RichText text={tour.description} />
              </section>
            )
          )}

          {/* INCLUDED */}
          {(tour.inclusions.length > 0 || tour.exclusions.length > 0) && (
            <section className="grid gap-6 md:grid-cols-2">
              {tour.inclusions.length > 0 && (
                <div className="rounded-2xl bg-white p-6 ring-1 ring-navy-100">
                  <h2 className="font-semibold text-navy-900">What&apos;s included</h2>
                  <ul className="mt-4 space-y-2 text-sm text-navy-700">
                    {tour.inclusions.map((x) => (
                      <li key={x} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-green-600" /> {x}</li>
                    ))}
                  </ul>
                </div>
              )}
              {tour.exclusions.length > 0 && (
                <div className="rounded-2xl bg-white p-6 ring-1 ring-navy-100">
                  <h2 className="font-semibold text-navy-900">Not included</h2>
                  <ul className="mt-4 space-y-2 text-sm text-navy-700">
                    {tour.exclusions.map((x) => (
                      <li key={x} className="flex gap-2"><Minus className="mt-0.5 size-4 shrink-0 text-navy-400" /> {x}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* GALLERY */}
          {tour.images.length > 1 && (
            <section>
              <h2 className="mb-4 text-2xl font-bold text-navy-900">Photos</h2>
              <Gallery images={tour.images} title={tour.title} />
            </section>
          )}

          {/* DOWNLOADS */}
          {tour.pdfs.length > 0 && (
            <section>
              <h2 className="mb-4 text-2xl font-bold text-navy-900">Downloads</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {tour.pdfs.map((p) => (
                  <li key={p.id}>
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener"
                      className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-navy-100 transition hover:ring-sun-300"
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600"><FileText className="size-5" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-navy-900">{p.caption ?? "Itinerary (PDF)"}</span>
                        <span className="text-xs text-navy-500">Full itinerary with terms</span>
                      </span>
                      <Download className="size-4 text-navy-400" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <BookingPanel
            tourId={tour.id}
            tourTitle={tour.title}
            priceFrom={tour.price_from_myr}
            departures={tour.departures}
          />
        </aside>
      </div>
    </article>
  );
}
