import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Hotel, MapPinned, Plane, Route, Ship, ShieldCheck, Stamp, Users } from "lucide-react";
import { getExploreCountries } from "@/lib/explore";
import { listTours } from "@/lib/queries";
import { site, whatsappLink } from "@/lib/site";
import { ExploreHero } from "@/components/site/explore-hero";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";
import { TourCard } from "@/components/site/tour-card";
import { WhatsAppIcon } from "@/components/site/icons";

export const revalidate = 300;

const features = [
  {
    icon: Route,
    title: "Day-by-day itineraries",
    body: "Every trip laid out day by day: where you go, what you see, which meals are included and where you sleep.",
  },
  {
    icon: MapPinned,
    title: "See the route on a map",
    body: "Follow each day's stops on a satellite map before you book, so you know exactly how the trip flows.",
  },
  {
    icon: CalendarDays,
    title: "Clear dates & fares",
    body: "Upcoming departure dates with the fare for each one, in Ringgit. No waiting for a PDF.",
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
  const ctaImage = countries[1]?.image ?? countries[0]?.image ?? null;

  return (
    <>
      <ExploreHero countries={countries} />

      {/* UPCOMING */}
      <section className="mx-auto max-w-7xl px-4 pt-24 sm:px-6">
        <SectionHeading eyebrow="Departing soon" title="Upcoming trips">
          <Link href="/tours" className="glass inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold text-white">
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
          <p className="rounded-3xl bg-white/[0.04] p-10 text-center text-navy-200 ring-1 ring-white/10">
            New trips are being added. Please check back soon or contact us on WhatsApp.
          </p>
        )}
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-7xl px-4 pt-28 sm:px-6">
        <SectionHeading eyebrow="Plan with confidence" title="Know the whole trip before you go" />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 90}>
              <div className="group h-full rounded-3xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-7 ring-1 ring-white/10 transition hover:ring-sun-400/40">
                <span className="grid size-12 place-items-center rounded-2xl bg-sun-500/15 text-sun-300 ring-1 ring-sun-400/30 transition group-hover:bg-sun-500/30 group-hover:text-sun-100">
                  <f.icon className="size-6" />
                </span>
                <h3 className="mt-6 text-lg font-bold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-navy-200">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-28 sm:px-6">
        <SectionHeading eyebrow="More than tours" title="Everything for your trip, in one place" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => {
            const inner = (
              <>
                <s.icon className="size-6 shrink-0 text-sun-300" />
                <div>
                  <h3 className="font-semibold text-white">{s.title}</h3>
                  <p className="mt-1 text-sm text-navy-200">{s.body}</p>
                </div>
              </>
            );
            const cls = "flex h-full gap-4 rounded-2xl bg-white/[0.04] p-5 ring-1 ring-white/10 transition hover:bg-white/[0.08]";
            return (
              <Reveal key={s.title} delay={(i % 3) * 70}>
                {s.href ? (
                  <a href={s.href} className={cls} {...(s.href.startsWith("http") ? { target: "_blank", rel: "noopener" } : {})}>
                    {inner}
                  </a>
                ) : (
                  <div className={cls}>{inner}</div>
                )}
              </Reveal>
            );
          })}
        </div>
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
