import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getExploreCountries } from "@/lib/explore";
import { getFeaturedTour, getHomeStats, listTours } from "@/lib/queries";
import { whatsappLink } from "@/lib/site";
import { ExploreHero } from "@/components/site/explore-hero";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";
import { ServicesExplorer } from "@/components/site/services-explorer";
import { StatsStrip } from "@/components/site/stats-strip";
import { TourCard } from "@/components/site/tour-card";
import { TripShowcase } from "@/components/site/trip-showcase";
import { WhatsAppIcon } from "@/components/site/icons";

export const revalidate = 300;

export default async function HomePage() {
  const [countries, upcoming, featured, stats] = await Promise.all([getExploreCountries(10), listTours({}, 8), getFeaturedTour(), getHomeStats()]);
  const ctaImage = countries[1]?.image ?? countries[0]?.image ?? null;

  return (
    <>
      <ExploreHero countries={countries} />

      {/* UPCOMING */}
      <section className="mx-auto max-w-7xl px-4 pt-24 sm:px-6">
        <SectionHeading eyebrow="Departing soon" title="Upcoming trips">
          <Link href="/tours" className="glass-light inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold text-navy-950">
            See all trips <ArrowRight className="size-4" />
          </Link>
        </SectionHeading>
        {upcoming.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {upcoming.map((t, i) => (
              <Reveal key={t.id} delay={(i % 4) * 80}>
                <TourCard tour={t} />
              </Reveal>
            ))}
          </div>
        ) : (
          <p className="rounded-3xl bg-white shadow-sm p-10 text-center text-navy-500 ring-1 ring-navy-100">
            New trips are being added. Please check back soon or contact us on WhatsApp.
          </p>
        )}
      </section>

      {/* NUMBERS */}
      <section className="mx-auto max-w-7xl px-4 pt-24 sm:px-6">
        <Reveal>
          <StatsStrip
            items={[
              { value: stats.tours, label: "trips to choose from" },
              { value: stats.countries, label: "countries", suffix: "+" },
              { value: stats.departures, label: "upcoming departures" },
              { value: stats.stops, label: "sights on the map" },
            ]}
          />
        </Reveal>
      </section>

      {/* SHOWCASE */}
      {featured && (
        <section id="showcase" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-28 sm:px-6">
          <SectionHeading eyebrow="See it before you book" title={<>Your whole holiday, <span className="text-sun-600">before you pay</span></>}>
            <p className="max-w-sm text-sm text-navy-500">Every trip page shows the full plan. Here&apos;s one of ours, live.</p>
          </SectionHeading>
          <Reveal>
            <TripShowcase tour={featured} />
          </Reveal>
        </section>
      )}

      {/* SERVICES */}
      <section id="services" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-28 sm:px-6">
        <SectionHeading eyebrow="More than tours" title="Everything else for your trip">
          <p className="max-w-sm text-sm text-navy-500">Flights, visas, insurance and hotels, from the same team that plans your tour.</p>
        </SectionHeading>
        <Reveal>
          <ServicesExplorer />
        </Reveal>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-28 sm:px-6">
        <Reveal className="relative isolate overflow-hidden rounded-[2rem] px-6 py-16 text-center ring-1 ring-white/10 sm:px-12">
          {ctaImage && <Image src={ctaImage} alt="" fill sizes="100vw" className="-z-20 object-cover" />}
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-950/90 via-navy-950/70 to-sun-700/60" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sun-300">Tailor-made</p>
          <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">Can&apos;t find the trip you want?</h2>
          <p className="mx-auto mt-3 max-w-xl text-navy-100">Tell us where and when. We plan custom and group trips and reply on WhatsApp.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href={whatsappLink("Hi Daily Holidays, I'd like help planning a trip.")}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-6 py-3 font-semibold text-white shadow-lg hover:brightness-95"
            >
              <WhatsAppIcon className="size-5" /> WhatsApp us
            </a>
            <Link href="/contact" className="glass inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold">
              Send an enquiry
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
