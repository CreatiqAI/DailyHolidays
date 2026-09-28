import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BedDouble, CalendarDays, Check, ChevronRight, Clock, Download, FileText, MapPin, Minus, Plane, Sparkles } from "lucide-react";
import { getTour, listTours } from "@/lib/queries";
import { durationLabel, formatDate, formatRM } from "@/lib/format";
import { tourTypeLabels, whatsappLink } from "@/lib/site";
import { BookingPanel } from "@/components/site/booking-panel";
import { Gallery } from "@/components/site/gallery";
import { ItineraryExplorer } from "@/components/site/itinerary-explorer";
import { Reveal } from "@/components/site/reveal";
import { RichText } from "@/components/site/rich-text";
import { SectionHeading } from "@/components/site/section-heading";
import { StickyBookBar } from "@/components/site/sticky-book-bar";
import { TourCard } from "@/components/site/tour-card";
import { WhatsAppIcon } from "@/components/site/icons";

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
  const hero = tour.cover_image_url ?? tour.images[0]?.url ?? null;
  const next = tour.departures[0]?.departure_date ?? null;

  // more trips from the same area, topped up from the same country
  const related = (await listTours({ destination: dest?.slug }, 9)).filter((t) => t.id !== tour.id);
  if (related.length < 4 && country && country.slug !== dest?.slug) {
    for (const t of await listTours({ destination: country.slug }, 12)) {
      if (t.id !== tour.id && !related.some((r) => r.id === t.id)) related.push(t);
    }
  }

  const facts = [
    duration && { icon: Clock, label: "Duration", value: duration },
    dest && { icon: MapPin, label: "Destination", value: dest.parent ? `${dest.name}, ${dest.parent.name}` : dest.name },
    tour.airline && { icon: Plane, label: "Airline", value: tour.airline },
    tour.hotel_rating && { icon: BedDouble, label: "Hotels", value: tour.hotel_rating },
    next && { icon: CalendarDays, label: "Next departure", value: formatDate(next, "long") },
  ].filter(Boolean) as { icon: typeof Clock; label: string; value: string }[];

  return (
    <article>
      {/* HERO */}
      <section id="tour-hero" data-hero className="relative isolate flex min-h-[100svh] items-end overflow-hidden text-white">
        <div className="absolute inset-0 -z-10 overflow-hidden bg-navy-950">
          {hero ? (
            <div className="hero-bg absolute inset-0">
              <Image src={hero} alt={tour.title} fill priority sizes="100vw" className="object-cover" />
            </div>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-navy-700 via-navy-800 to-sun-700" />
          )}
        </div>
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(0deg, #0b0f29 0%, rgba(11,15,41,0.8) 30%, rgba(11,15,41,0.2) 65%, rgba(11,15,41,0.55) 100%), linear-gradient(90deg, rgba(11,15,41,0.75) 0%, rgba(11,15,41,0) 65%)",
          }}
        />
        <div className="fade-up mx-auto w-full max-w-7xl px-4 pb-12 pt-32 sm:px-6">
          <nav className="mb-5 flex flex-wrap items-center gap-1 text-sm text-navy-100" aria-label="Breadcrumb">
            <Link href="/tours" className="hover:text-white">Tours</Link>
            {country && (
              <>
                <ChevronRight className="size-4 opacity-60" />
                <Link href={`/tours?destination=${country.slug}`} className="hover:text-white">{country.name}</Link>
              </>
            )}
            {dest?.parent && (
              <>
                <ChevronRight className="size-4 opacity-60" />
                <Link href={`/tours?destination=${dest.slug}`} className="hover:text-white">{dest.name}</Link>
              </>
            )}
          </nav>
          <div className="flex flex-wrap gap-2">
            <span className="glass-sun rounded-full px-3 py-1 text-xs font-semibold text-white">{tourTypeLabels[tour.tour_type] ?? "Tour"}</span>
            {tour.code && <span className="glass rounded-full px-3 py-1 text-xs font-semibold text-white">{tour.code}</span>}
            {tour.departures.length > 0 && (
              <span className="glass rounded-full px-3 py-1 text-xs font-semibold text-white">{tour.departures.length} upcoming dates</span>
            )}
          </div>
          <h1 className="mt-4 max-w-4xl text-4xl font-extrabold leading-[1.05] sm:text-6xl">{tour.title}</h1>
          {tour.summary && <p className="mt-4 max-w-2xl text-base text-navy-100 sm:text-lg">{tour.summary}</p>}

          <div className="mt-8 flex flex-wrap items-end gap-x-8 gap-y-5">
            <div>
              <p className="text-xs uppercase tracking-widest text-navy-200">{tour.price_from_myr ? "From" : "Price"}</p>
              <p className="text-4xl font-extrabold text-white">
                {formatRM(tour.price_from_myr, { compact: true }) ?? "On request"}
                {tour.price_from_myr ? <span className="text-base font-medium text-navy-200"> / person</span> : null}
              </p>
            </div>
            <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto sm:flex-wrap">
              <a href="#book" className="glass-sun inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 font-semibold text-white transition sm:px-6">
                <CalendarDays className="size-4" /> Choose a date
              </a>
              <a
                href={whatsappLink(`Hi Daily Holidays! I'm interested in "${tour.title}".`)}
                target="_blank"
                rel="noopener"
                className="glass inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 font-semibold text-white transition sm:px-6"
              >
                <WhatsAppIcon className="size-4" /> WhatsApp us
              </a>
            </div>
          </div>

          {facts.length > 0 && (
            <dl className="glass mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl sm:grid-cols-3 lg:grid-cols-5">
              {facts.map((f, i) => (
                <div
                  key={f.label}
                  className={`bg-navy-950/40 p-4 ${i === facts.length - 1 && facts.length % 2 === 1 ? "col-span-2 sm:col-span-1" : ""}`}
                >
                  <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-navy-200">
                    <f.icon className="size-3.5 text-sun-300" /> {f.label}
                  </dt>
                  <dd className="mt-1 font-semibold text-white">{f.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      {/* HIGHLIGHTS */}
      {tour.highlights.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
          <SectionHeading eyebrow="Why you'll love it" title="Trip highlights" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tour.highlights.map((h, i) => (
              <Reveal key={h} delay={i * 70}>
                <div className="flex h-full gap-4 rounded-3xl bg-white shadow-sm p-5 ring-1 ring-navy-100 transition hover:shadow-md hover:ring-sun-400/40">
                  <span className="text-2xl font-extrabold text-sun-400/80">{String(i + 1).padStart(2, "0")}</span>
                  <p className="pt-1 font-medium leading-snug text-navy-950">{h}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* JOURNEY */}
      {tour.days.length > 0 ? (
        <section id="itinerary" className="mx-auto max-w-7xl px-4 pt-24 sm:px-6">
          <SectionHeading eyebrow="Day by day" title="Your journey">
            <p className="max-w-sm text-sm text-navy-500">Scroll through the days: the map follows along. Tap a day number to jump to it.</p>
          </SectionHeading>
          <ItineraryExplorer days={tour.days} />
        </section>
      ) : (
        tour.description && (
          <section className="mx-auto max-w-4xl px-4 pt-24 sm:px-6">
            <SectionHeading eyebrow="The trip" title="About this trip" />
            <Reveal className="rounded-3xl bg-white shadow-sm p-6 ring-1 ring-navy-100 sm:p-8">
              <RichText text={tour.description} />
            </Reveal>
          </section>
        )
      )}

      {/* BOOK */}
      <section id="book" className="scroll-mt-20 mx-auto max-w-7xl px-4 pt-24 sm:px-6">
        <SectionHeading eyebrow="Dates & fares" title={tour.departures.length ? "Choose your date" : "Plan your trip with us"} />
        <Reveal>
          <BookingPanel tourId={tour.id} tourTitle={tour.title} priceFrom={tour.price_from_myr} departures={tour.departures} />
        </Reveal>
      </section>

      {/* INCLUDED */}
      {(tour.inclusions.length > 0 || tour.exclusions.length > 0) && (
        <section className="mx-auto max-w-7xl px-4 pt-24 sm:px-6">
          <SectionHeading eyebrow="The fine print" title="What's included" />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {tour.inclusions.length > 0 && (
              <Reveal className="rounded-3xl bg-white shadow-sm p-6 ring-1 ring-navy-100">
                <h3 className="flex items-center gap-2 font-semibold text-navy-950"><span className="grid size-7 place-items-center rounded-full bg-emerald-500/20"><Check className="size-4 text-emerald-600" /></span> Included</h3>
                <ul className="mt-4 space-y-2.5 text-sm text-navy-700">
                  {tour.inclusions.map((x) => (
                    <li key={x} className="flex gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-emerald-600" /> {x}</li>
                  ))}
                </ul>
              </Reveal>
            )}
            {tour.exclusions.length > 0 && (
              <Reveal delay={100} className="rounded-3xl bg-white shadow-sm p-6 ring-1 ring-navy-100">
                <h3 className="flex items-center gap-2 font-semibold text-navy-950"><span className="grid size-7 place-items-center rounded-full bg-navy-50"><Minus className="size-4 text-navy-500" /></span> Not included</h3>
                <ul className="mt-4 space-y-2.5 text-sm text-navy-700">
                  {tour.exclusions.map((x) => (
                    <li key={x} className="flex gap-2.5"><Minus className="mt-0.5 size-4 shrink-0 text-navy-400" /> {x}</li>
                  ))}
                </ul>
              </Reveal>
            )}
          </div>
        </section>
      )}

      {/* PHOTOS */}
      {tour.images.length > 1 && (
        <section className="mx-auto max-w-7xl px-4 pt-24 sm:px-6">
          <SectionHeading eyebrow="Gallery" title="Photos from the trip" />
          <Reveal>
            <Gallery images={tour.images} title={tour.title} />
          </Reveal>
        </section>
      )}

      {/* DOWNLOADS */}
      {tour.pdfs.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-24 sm:px-6">
          <SectionHeading eyebrow="Take it with you" title="Full itinerary" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tour.pdfs.map((p, i) => (
              <Reveal key={p.id} delay={i * 70}>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener"
                  className="group flex items-center gap-4 rounded-2xl bg-white shadow-sm p-4 ring-1 ring-navy-100 transition hover:shadow-md hover:ring-sun-400/50"
                >
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-red-500/15 text-red-600"><FileText className="size-6" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-navy-950">{p.caption ?? "Itinerary (PDF)"}</span>
                    <span className="text-xs text-navy-500">PDF with full terms and conditions</span>
                  </span>
                  <Download className="size-5 text-navy-400 transition group-hover:translate-y-0.5 group-hover:text-sun-600" />
                </a>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* MORE TRIPS */}
      {related.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-24 sm:px-6">
          <SectionHeading eyebrow="Keep exploring" title={`More trips in ${dest?.name ?? "the area"}`}>
            {country && (
              <Link href={`/tours?destination=${country.slug}`} className="glass-light inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold text-navy-950">
                All {country.name} trips <ChevronRight className="size-4" />
              </Link>
            )}
          </SectionHeading>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.slice(0, 4).map((t, i) => (
              <Reveal key={t.id} delay={i * 80}>
                <TourCard tour={t} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* CLOSING */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <Reveal className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sun-500 to-sun-700 px-6 py-12 text-center text-white sm:px-12">
          <Sparkles className="absolute -right-4 -top-4 size-32 opacity-15" />
          <h2 className="text-3xl font-extrabold">Questions about this trip?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sun-50">Our team in Batu Caves can walk you through the itinerary, dates and visa requirements.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a
              href={whatsappLink(`Hi Daily Holidays! I have a question about "${tour.title}".`)}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-sun-700 shadow hover:bg-sun-50"
            >
              <WhatsAppIcon className="size-5" /> WhatsApp us
            </a>
            <a href="#book" className="inline-flex items-center gap-2 rounded-full border border-white/60 px-6 py-3 font-semibold hover:bg-white/10">
              Send an enquiry
            </a>
          </div>
        </Reveal>
      </section>

      <StickyBookBar title={tour.title} priceFrom={tour.price_from_myr} nextDeparture={next} heroId="tour-hero" bookId="book" />
    </article>
  );
}
