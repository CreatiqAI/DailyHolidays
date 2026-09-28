import Link from "next/link";
import { ArrowRight, CalendarDays, FileText, Hotel, MapPinned, Plane, Route, Ship, ShieldCheck, Stamp, Users } from "lucide-react";
import { getExploreCountries } from "@/lib/explore";
import { listTours } from "@/lib/queries";
import { site, whatsappLink } from "@/lib/site";
import { ExploreHero } from "@/components/site/explore-hero";
import { TourCard } from "@/components/site/tour-card";
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
  const [countries, upcoming] = await Promise.all([getExploreCountries(10), listTours({}, 8)]);

  return (
    <>
      <ExploreHero countries={countries} />

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
            {upcoming.map((t) => (
              <TourCard key={t.id} tour={t} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl bg-white p-10 text-center text-navy-500 ring-1 ring-navy-100">
            New trips are being added. Please check back soon or contact us on WhatsApp.
          </p>
        )}
      </section>

      {/* FEATURES */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-sun-600">Plan with confidence</p>
            <h2 className="mt-1 text-3xl font-bold text-navy-900">Know the whole trip before you go</h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl bg-sand-50 p-6 ring-1 ring-navy-100">
                <span className="grid size-12 place-items-center rounded-xl bg-sun-100 text-sun-600">
                  <f.icon className="size-6" />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-navy-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-navy-600">{f.body}</p>
              </div>
            ))}
          </div>
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
