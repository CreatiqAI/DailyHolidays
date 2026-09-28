import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Hotel, MapPin, Plane, Ship, ShieldCheck, Stamp, Users } from "lucide-react";
import { site } from "@/lib/site";
import { getHeroImages } from "@/lib/queries";
import { PageHero } from "@/components/site/page-hero";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";

export const metadata: Metadata = {
  title: "About us",
  description: site.description,
};

export const revalidate = 3600;

const services = [
  { icon: Plane, title: "Airline ticketing", body: "Domestic and international flights for holidays and business travel." },
  { icon: Users, title: "Group & incentive tours", body: "Special incentive tours for companies, associations and families, planned end to end." },
  { icon: Stamp, title: "Visa applications", body: "We prepare and submit visa applications for your destination." },
  { icon: ShieldCheck, title: "Travel insurance", body: "Protect your trip with travel insurance arranged with your booking." },
  { icon: Hotel, title: "Hotel booking & reservations", body: "Hotels worldwide, plus homestay experiences." },
  { icon: Ship, title: "Holiday cruises & coach service", body: "Cruise holidays and coach charter for groups." },
  { icon: MapPin, title: "Malaysia getaways", body: "Cameron Highlands, Genting Highlands, island tours, sport events, spa and food festival packages." },
];

export default async function AboutPage() {
  const images = await getHeroImages();
  const hero = images.find((i) => i.name === "Japan")?.url ?? images[0]?.url ?? null;
  const strip = images.slice(0, 6);

  return (
    <>
      <PageHero
        image={hero}
        eyebrow="About us"
        title={
          <>
            Holidays planned <span className="font-script font-semibold text-sun-300">day by day</span>
          </>
        }
        subtitle={<>{site.legalName} · {site.chineseName}</>}
      >
        <div className="mt-6 flex flex-wrap gap-3">
          <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium">
            <BadgeCheck className="size-4 text-sun-300" /> Licensed: {site.licence}
          </span>
          <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium">
            <BadgeCheck className="size-4 text-sun-300" /> Company no. {site.companyNo}
          </span>
        </div>
      </PageHero>

      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 pt-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <Reveal className="space-y-5 text-lg leading-relaxed text-navy-100">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sun-300">Who we are</p>
          <p className="text-2xl font-bold leading-snug text-white sm:text-3xl">
            A Malaysian travel agency in Batu Caves, taking travellers across Asia, Europe, the Middle East and beyond.
          </p>
          <p>
            We run inbound and outbound tour packages alongside everything else you need to travel: flights, visas, insurance and hotels.
          </p>
          <p>
            Whether it&apos;s a family holiday, a company incentive trip or a weekend in the highlands, our team plans the details so you can enjoy the journey.
          </p>
        </Reveal>
        {strip.length > 0 && (
          <Reveal delay={120} className="grid grid-cols-3 gap-3">
            {strip.map((img, i) => (
              <div key={img.url} className={`relative overflow-hidden rounded-2xl ring-1 ring-white/10 ${i % 3 === 1 ? "mt-8" : ""} aspect-[3/4]`}>
                <Image src={img.url} alt={img.name} fill sizes="(min-width: 1024px) 15vw, 30vw" className="object-cover" />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950/90 to-transparent p-2 text-xs font-semibold">{img.name}</span>
              </div>
            ))}
          </Reveal>
        )}
      </section>

      <section id="services" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-24 sm:px-6">
        <SectionHeading eyebrow="What we do" title="Everything for your trip" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => (
            <Reveal key={s.title} delay={(i % 3) * 70}>
              <div className="h-full rounded-3xl bg-white/[0.04] p-6 ring-1 ring-white/10 transition hover:bg-white/[0.07] hover:ring-sun-400/40">
                <span className="grid size-11 place-items-center rounded-2xl bg-sun-500/15 text-sun-300 ring-1 ring-sun-400/30">
                  <s.icon className="size-5" />
                </span>
                <h3 className="mt-5 font-bold text-white">{s.title}</h3>
                <p className="mt-1.5 text-sm text-navy-200">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <Reveal className="flex flex-wrap items-center justify-between gap-6 rounded-3xl bg-gradient-to-r from-white/[0.08] to-white/[0.02] p-8 ring-1 ring-white/10">
          <div>
            <h2 className="text-2xl font-extrabold">Ready to go somewhere?</h2>
            <p className="mt-1 text-navy-200">Browse the trips or tell us what you have in mind.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/tours" className="glass-sun inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold text-white">
              Browse trips <ArrowRight className="size-4" />
            </Link>
            <Link href="/contact" className="glass rounded-full px-6 py-3 font-semibold">
              Contact us
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
