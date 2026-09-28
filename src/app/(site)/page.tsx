import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  FileText,
  Hotel,
  MapPinned,
  Plane,
  Route,
  Ship,
  ShieldCheck,
  Stamp,
  Users,
} from "lucide-react";
import { getDestinationStats, getSiteStats, listTours } from "@/lib/queries";
import { site, whatsappLink } from "@/lib/site";
import { TourCard } from "@/components/site/tour-card";
import { TripSearch } from "@/components/site/trip-search";
import { WhatsAppIcon } from "@/components/site/icons";

export const revalidate = 300;

const features = [
  {
    icon: Route,
    title: "Day-by-day itineraries",
    body: "Every trip is laid out day by day: where you go, what you see, which meals are included and where you sleep.",
  },
  {
    icon: MapPinned,
    title: "See the route on a map",
    body: "Follow each day's stops on an interactive map before you book, so you know exactly how the trip flows.",
  },
  {
    icon: CalendarDays,
    title: "Clear dates & prices",
    body: "Upcoming departure dates with the fare for each one, in Ringgit. No need to wait for a PDF.",
  },
];

const services = [
  { icon: Plane, title: "Air ticketing", body: "Flights for leisure and business travel, worldwide." },
  { icon: Stamp, title: "Visa applications", body: "We handle the paperwork for your travel visas." },
  { icon: ShieldCheck, title: "Travel insurance", body: "Cover for your trip, arranged with your booking." },
  { icon: Hotel, title: "Hotel booking", body: "Reserve hotels anywhere in the world.", href: site.hotelBooking },
  { icon: Ship, title: "Holiday cruises", body: "Cruise packages around Asia and beyond.", href: "/tours?type=cruise" },
  { icon: Users, title: "Incentive & group trips", body: "Tailor-made trips for companies, clubs and families." },
];

export default async function HomePage() {
  const [upcoming, destinations, stats] = await Promise.all([
    listTours({}, 8),
    getDestinationStats(),
    getSiteStats(),
  ]);
  // destination covers are full-size photos; tour covers extracted from PDFs can be small
  const heroImage = destinations.find((d) => d.image)?.image ?? upcoming.find((t) => t.cover_image_url)?.cover_image_url;

  return (
    <>
      {/* HERO */}
      <section className="relative isolate flex min-h-[92vh] items-center overflow-hidden bg-navy-900 pt-16">
        {heroImage && (
          <Image src={heroImage} alt="" fill priority sizes="100vw" className="-z-10 object-cover opacity-60" />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-navy-950/70 via-navy-900/40 to-navy-950/80" />
        <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm text-white backdrop-blur">
            <ShieldCheck className="size-4 text-sun-300" /> Licensed travel agency · {site.licence}
          </p>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight text-white sm:text-6xl">
            Holidays planned <span className="font-script text-sun-300">day by day</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-navy-100">
            Group tours, ground tours and cruises from Malaysia to {stats.countries}+ countries. See every day of the
            trip, the route on a map and the fare for each departure date.
          </p>
          <div className="mt-10 max-w-5xl">
            <TripSearch
              destinations={destinations.map((d) => ({ value: d.destination.slug, label: d.destination.name }))}
            />
          </div>
          <dl className="mt-10 grid max-w-2xl grid-cols-3 gap-6 text-white">
            <div>
              <dt className="text-sm text-navy-200">Trips</dt>
              <dd className="text-3xl font-bold">{stats.tours}</dd>
            </div>
            <div>
              <dt className="text-sm text-navy-200">Destinations</dt>
              <dd className="text-3xl font-bold">{stats.countries}</dd>
            </div>
            <div>
              <dt className="text-sm text-navy-200">Upcoming departures</dt>
              <dd className="text-3xl font-bold">{stats.departures}</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* UPCOMING */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-sun-600">Departing soon</p>
            <h2 className="mt-1 text-3xl font-bold text-navy-900">Upcoming trips</h2>
          </div>
          <Link href="/tours" className="inline-flex items-center gap-1 font-semibold text-navy-700 hover:text-sun-600">
            See all trips <ArrowRight className="size-4" />
          </Link>
        </div>
        {upcoming.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {upcoming.map((t, i) => (
              <TourCard key={t.id} tour={t} priority={i < 4} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl bg-white p-10 text-center text-navy-500 ring-1 ring-navy-100">
            New trips are being added. Please check back soon or contact us on WhatsApp.
          </p>
        )}
      </section>

      {/* DESTINATIONS */}
      {destinations.length > 0 && (
        <section className="bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-sun-600">Explore</p>
            <h2 className="mt-1 text-3xl font-bold text-navy-900">Where would you like to go?</h2>
            <div className="mt-8 grid auto-rows-[180px] grid-cols-2 gap-4 md:grid-cols-4">
              {destinations.slice(0, 8).map((d, i) => (
                <Link
                  key={d.destination.id}
                  href={`/tours?destination=${d.destination.slug}`}
                  className={`group relative overflow-hidden rounded-2xl bg-navy-700 ${i === 0 ? "col-span-2 row-span-2" : ""}`}
                >
                  {d.image && (
                    <Image
                      src={d.image}
                      alt={d.destination.name}
                      fill
                      sizes={i === 0 ? "50vw" : "25vw"}
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-navy-950/10 to-transparent" />
                  <div className="absolute bottom-0 p-4 text-white">
                    <p className={`font-bold ${i === 0 ? "text-3xl" : "text-lg"}`}>{d.destination.name}</p>
                    <p className="text-sm text-navy-100">
                      {d.count} {d.count === 1 ? "trip" : "trips"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FEATURES */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-sun-600">Plan with confidence</p>
          <h2 className="mt-1 text-3xl font-bold text-navy-900">Know the whole trip before you go</h2>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl bg-white p-6 ring-1 ring-navy-100">
              <span className="grid size-12 place-items-center rounded-xl bg-sun-100 text-sun-600">
                <f.icon className="size-6" />
              </span>
              <h3 className="mt-5 text-lg font-semibold text-navy-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-navy-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="bg-navy-900 py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-sun-300">More than tours</p>
          <h2 className="mt-1 text-3xl font-bold">Everything for your trip, in one place</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => {
              const inner = (
                <>
                  <s.icon className="size-6 text-sun-300" />
                  <div>
                    <h3 className="font-semibold">{s.title}</h3>
                    <p className="mt-1 text-sm text-navy-200">{s.body}</p>
                  </div>
                </>
              );
              const cls = "flex gap-4 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10 transition hover:bg-white/10";
              return s.href ? (
                <a key={s.title} href={s.href} className={cls} {...(s.href.startsWith("http") ? { target: "_blank", rel: "noopener" } : {})}>
                  {inner}
                </a>
              ) : (
                <div key={s.title} className={cls}>{inner}</div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sun-500 to-sun-600 px-6 py-14 text-center text-white sm:px-12">
          <FileText className="absolute -right-6 -top-6 size-40 opacity-10" />
          <h2 className="text-3xl font-bold">Can&apos;t find the trip you want?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sun-50">
            Tell us where and when. We plan custom and group trips and reply on WhatsApp.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href={whatsappLink("Hi Daily Holidays, I'd like help planning a trip.")}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-sun-700 shadow hover:bg-sun-50"
            >
              <WhatsAppIcon className="size-5" /> WhatsApp us
            </a>
            <Link href="/contact" className="inline-flex items-center gap-2 rounded-full border border-white/60 px-6 py-3 font-semibold hover:bg-white/10">
              Send an enquiry
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
