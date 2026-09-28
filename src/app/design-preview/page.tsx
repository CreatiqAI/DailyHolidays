import type { Metadata } from "next";
import Image from "next/image";
import { Fraunces } from "next/font/google";
import { ArrowRight, CalendarDays, Clock, MapPin, Phone } from "lucide-react";
import { getHeroImages, listTours, type TourCard } from "@/lib/queries";
import { durationLabel, formatDate, formatRM } from "@/lib/format";

// Temporary page for choosing the site's visual direction. Delete once a direction is chosen.
export const metadata: Metadata = { title: "Design directions", robots: { index: false } };
export const revalidate = 300;

const serif = Fraunces({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-fraunces" });

type Theme = {
  id: string;
  name: string;
  pitch: string;
  page: string;
  nav: string;
  navLink: string;
  logo: string;
  heading: string;
  eyebrow: string;
  body: string;
  primary: string;
  secondary: string;
  card: string;
  cardTitle: string;
  cardMeta: string;
  price: string;
  chip: string;
  chipOn: string;
  panel: string;
  heroShade: string;
  heroTitle: string;
  heroPrimary: string;
  heroSecondary: string;
  cta: string;
  ctaTitle: string;
  ctaBody: string;
  ctaPrimary: string;
  ctaSecondary: string;
};

const THEMES: Theme[] = [
  {
    id: "a",
    name: "A · Coastal",
    pitch: "Bright white and deep ocean navy, brand orange only for the key action. Flat, solid buttons. Calm, trustworthy, lots of air, like a modern airline.",
    page: "bg-white text-slate-900",
    nav: "bg-white/90 border-b border-slate-200",
    navLink: "text-slate-600 hover:text-slate-950",
    logo: "text-[#0b2545]",
    heading: "font-bold tracking-tight text-[#0b2545]",
    eyebrow: "text-[#e8841a]",
    body: "text-slate-600",
    primary: "rounded-full bg-[#e8841a] px-6 py-3 font-semibold text-white hover:bg-[#d4740f]",
    secondary: "rounded-full border border-slate-300 px-6 py-3 font-semibold text-[#0b2545] hover:border-[#0b2545]",
    card: "overflow-hidden rounded-2xl border border-slate-200 bg-white hover:shadow-lg",
    cardTitle: "font-semibold text-[#0b2545]",
    cardMeta: "text-slate-500",
    price: "font-bold text-[#0b2545]",
    chip: "rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700",
    chipOn: "rounded-full bg-[#0b2545] px-4 py-2 text-sm font-semibold text-white",
    panel: "rounded-2xl border border-slate-200 bg-slate-50",
    heroShade: "bg-gradient-to-r from-[#0b2545]/80 via-[#0b2545]/40 to-transparent",
    heroTitle: "font-bold tracking-tight text-white",
    heroPrimary: "rounded-full bg-[#e8841a] px-6 py-3 font-semibold text-white hover:bg-[#d4740f]",
    heroSecondary: "rounded-full bg-white px-6 py-3 font-semibold text-[#0b2545] hover:bg-slate-100",
    cta: "bg-[#0b2545]",
    ctaTitle: "font-bold text-white",
    ctaBody: "text-slate-300",
    ctaPrimary: "rounded-full bg-[#e8841a] px-6 py-3 font-semibold text-white",
    ctaSecondary: "rounded-full border border-white/40 px-6 py-3 font-semibold text-white",
  },
  {
    id: "b",
    name: "B · Editorial",
    pitch: "Warm cream paper, ink-black type and a terracotta accent, with elegant serif headlines. Feels like a premium travel magazine; photos do the talking.",
    page: "bg-[#f6f1e8] text-[#1f1b16]",
    nav: "bg-[#f6f1e8]/90 border-b border-[#1f1b16]/10",
    navLink: "text-[#1f1b16]/70 hover:text-[#1f1b16]",
    logo: "text-[#1f1b16]",
    heading: "font-[family-name:var(--font-fraunces)] font-semibold text-[#1f1b16]",
    eyebrow: "text-[#b5532b]",
    body: "text-[#1f1b16]/70",
    primary: "rounded-md bg-[#1f1b16] px-6 py-3 font-medium text-[#f6f1e8] hover:bg-[#b5532b]",
    secondary: "rounded-md border border-[#1f1b16]/30 px-6 py-3 font-medium text-[#1f1b16] hover:border-[#1f1b16]",
    card: "group",
    cardTitle: "font-[family-name:var(--font-fraunces)] text-xl font-semibold text-[#1f1b16]",
    cardMeta: "text-[#1f1b16]/60",
    price: "font-semibold text-[#b5532b]",
    chip: "rounded-md border border-[#1f1b16]/20 px-4 py-2 text-sm text-[#1f1b16]/80",
    chipOn: "rounded-md bg-[#1f1b16] px-4 py-2 text-sm font-medium text-[#f6f1e8]",
    panel: "rounded-md border border-[#1f1b16]/15 bg-[#fbf8f3]",
    heroShade: "bg-gradient-to-t from-[#1f1b16]/85 via-[#1f1b16]/25 to-transparent",
    heroTitle: "font-[family-name:var(--font-fraunces)] font-semibold text-[#fbf8f3]",
    heroPrimary: "rounded-md bg-[#b5532b] px-6 py-3 font-medium text-white hover:bg-[#9c4522]",
    heroSecondary: "rounded-md border border-white/60 px-6 py-3 font-medium text-white hover:bg-white/10",
    cta: "bg-[#b5532b]",
    ctaTitle: "font-[family-name:var(--font-fraunces)] font-semibold text-[#fbf8f3]",
    ctaBody: "text-[#fbf8f3]/80",
    ctaPrimary: "rounded-md bg-[#fbf8f3] px-6 py-3 font-medium text-[#1f1b16]",
    ctaSecondary: "rounded-md border border-white/60 px-6 py-3 font-medium text-white",
  },
  {
    id: "c",
    name: "C · Midnight",
    pitch: "The dark look you saw before, refined: deep navy, solid orange buttons (no glass, no glow), thin borders and warm gold details. Cinematic and premium.",
    page: "bg-[#0a0e22] text-white",
    nav: "bg-[#0a0e22]/85 border-b border-white/10",
    navLink: "text-white/70 hover:text-white",
    logo: "text-white",
    heading: "font-bold tracking-tight text-white",
    eyebrow: "text-[#f0b35b]",
    body: "text-white/65",
    primary: "rounded-full bg-[#e8841a] px-6 py-3 font-semibold text-white hover:bg-[#f0923a]",
    secondary: "rounded-full border border-white/25 px-6 py-3 font-semibold text-white hover:border-white/60",
    card: "overflow-hidden rounded-2xl border border-white/10 bg-[#121838] hover:border-[#f0b35b]/50",
    cardTitle: "font-semibold text-white",
    cardMeta: "text-white/55",
    price: "font-bold text-[#f0b35b]",
    chip: "rounded-full border border-white/15 px-4 py-2 text-sm text-white/75",
    chipOn: "rounded-full bg-[#e8841a] px-4 py-2 text-sm font-semibold text-white",
    panel: "rounded-2xl border border-white/10 bg-[#121838]",
    heroShade: "bg-gradient-to-t from-[#0a0e22] via-[#0a0e22]/40 to-[#0a0e22]/30",
    heroTitle: "font-bold tracking-tight text-white",
    heroPrimary: "rounded-full bg-[#e8841a] px-6 py-3 font-semibold text-white hover:bg-[#f0923a]",
    heroSecondary: "rounded-full border border-white/40 px-6 py-3 font-semibold text-white hover:bg-white/10",
    cta: "bg-[#121838] border border-white/10",
    ctaTitle: "font-bold text-white",
    ctaBody: "text-white/65",
    ctaPrimary: "rounded-full bg-[#e8841a] px-6 py-3 font-semibold text-white",
    ctaSecondary: "rounded-full border border-white/30 px-6 py-3 font-semibold text-white",
  },
];

function Sample({ t, tours, hero, cta }: { t: Theme; tours: TourCard[]; hero: string | null; cta: string | null }) {
  const [first] = tours;
  return (
    <section id={t.id} className={`${t.page} scroll-mt-16`}>
      {/* label */}
      <div className="border-y border-black/10 bg-[#fffbe6] px-6 py-4 text-[#1f1b16]">
        <p className="text-lg font-bold">{t.name}</p>
        <p className="max-w-3xl text-sm">{t.pitch}</p>
      </div>

      {/* nav */}
      <div className={`${t.nav} flex h-16 items-center justify-between px-6 lg:px-12`}>
        <span className={`font-script text-2xl ${t.logo}`}>Daily <span className="font-sans text-sm font-bold">HOLIDAYS</span></span>
        <nav className="hidden gap-7 text-sm md:flex">
          {["Tours", "Cruises", "Malaysia", "About", "Contact"].map((l) => (
            <span key={l} className={t.navLink}>{l}</span>
          ))}
        </nav>
        <span className={`${t.primary} inline-flex items-center gap-2 !px-4 !py-2 text-sm`}><Phone className="size-4" /> +603-6127 0508</span>
      </div>

      {/* hero */}
      <div className="relative isolate flex min-h-[520px] items-end overflow-hidden">
        {hero && <Image src={hero} alt="" fill sizes="100vw" className="-z-20 object-cover" />}
        <div className={`absolute inset-0 -z-10 ${t.heroShade}`} />
        <div className="max-w-3xl px-6 pb-14 lg:px-12">
          <p className={`text-xs font-semibold uppercase tracking-[0.3em] ${t.id === "b" ? "text-[#f3c9ae]" : "text-[#f0b35b]"}`}>Group tours · Ground tours · Cruises</p>
          <h2 className={`mt-3 text-5xl leading-[1.05] sm:text-6xl ${t.heroTitle}`}>Where to next?</h2>
          <p className="mt-4 max-w-xl text-lg text-white/85">Day-by-day itineraries, the route on a map and the fare for every departure.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <span className={`${t.heroPrimary} inline-flex items-center gap-2`}>Browse trips <ArrowRight className="size-4" /></span>
            <span className={t.heroSecondary}>WhatsApp us</span>
          </div>
        </div>
      </div>

      {/* cards */}
      <div className="px-6 py-16 lg:px-12">
        <p className={`text-xs font-semibold uppercase tracking-[0.3em] ${t.eyebrow}`}>Departing soon</p>
        <h3 className={`mt-2 text-4xl ${t.heading}`}>Upcoming trips</h3>
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {tours.map((tour) => (
            <div key={tour.id} className={`${t.card} transition duration-300`}>
              <div className={`relative aspect-[4/3] overflow-hidden ${t.id === "b" ? "rounded-md" : ""}`}>
                {tour.cover_image_url && <Image src={tour.cover_image_url} alt="" fill sizes="33vw" className="object-cover transition duration-700 group-hover:scale-105" />}
              </div>
              <div className={t.id === "b" ? "pt-4" : "p-5"}>
                <p className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-widest ${t.eyebrow}`}><MapPin className="size-3" /> {tour.destination?.name}</p>
                <p className={`mt-1.5 ${t.cardTitle}`}>{tour.title}</p>
                <p className={`mt-2 flex gap-4 text-sm ${t.cardMeta}`}>
                  <span className="flex items-center gap-1"><Clock className="size-3.5" /> {durationLabel(tour.duration_days, tour.duration_nights)}</span>
                  {tour.next_departure && <span className="flex items-center gap-1"><CalendarDays className="size-3.5" /> {formatDate(tour.next_departure)}</span>}
                </p>
                <p className={`mt-3 text-sm ${t.cardMeta}`}>from <span className={`text-lg ${t.price}`}>{formatRM(tour.price_from_myr, { compact: true }) ?? "on request"}</span></p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* booking */}
      {first && (
        <div className="px-6 pb-16 lg:px-12">
          <h3 className={`text-3xl ${t.heading}`}>Choose your date</h3>
          <div className={`mt-6 grid grid-cols-1 gap-6 p-6 lg:grid-cols-[1.4fr_1fr] ${t.panel}`}>
            <div>
              <div className="flex flex-wrap gap-2">
                <span className={t.chipOn}>October 2026</span>
                <span className={t.chip}>November 2026</span>
                <span className={t.chip}>December 2026</span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                {["10 Oct", "17 Oct", "24 Oct"].map((d, i) => (
                  <div key={d} className={`${i === 0 ? t.chipOn : t.chip} !rounded-xl !py-4`}>
                    <p className="text-xs opacity-70">SAT</p>
                    <p className="text-xl font-bold">{d}</p>
                    <p className="text-sm">RM 1,799</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <p className={`text-3xl ${t.heading}`}>RM 1,799 <span className={`text-sm font-normal ${t.body}`}>/ person</span></p>
              <span className={`${t.primary} flex w-full justify-center`}>Send enquiry</span>
              <span className={`${t.secondary} flex w-full justify-center`}>Ask on WhatsApp</span>
            </div>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="px-6 pb-20 lg:px-12">
        <div className={`relative isolate overflow-hidden px-8 py-14 text-center ${t.id === "b" ? "rounded-md" : "rounded-3xl"} ${t.cta}`}>
          {t.id === "c" && cta && <Image src={cta} alt="" fill sizes="100vw" className="-z-10 object-cover opacity-30" />}
          <h3 className={`text-4xl ${t.ctaTitle}`}>Can&apos;t find the trip you want?</h3>
          <p className={`mx-auto mt-3 max-w-xl ${t.ctaBody}`}>Tell us where and when. We plan custom and group trips.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <span className={t.ctaPrimary}>WhatsApp us</span>
            <span className={t.ctaSecondary}>Send an enquiry</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function DesignPreview() {
  const [tours, images] = await Promise.all([listTours({}, 3), getHeroImages()]);
  const hero = images.find((i) => i.name === "Japan")?.url ?? images[0]?.url ?? null;
  const cta = images.find((i) => i.name === "Australia")?.url ?? null;
  return (
    <div className={`${serif.variable} min-h-screen bg-neutral-200`}>
      <div className="sticky top-0 z-50 flex flex-wrap items-center gap-3 bg-neutral-900 px-6 py-3 text-sm text-white">
        <span className="font-semibold">Pick a direction:</span>
        {THEMES.map((t) => (
          <a key={t.id} href={`#${t.id}`} className="rounded-full bg-white/10 px-3 py-1 hover:bg-white/20">{t.name}</a>
        ))}
      </div>
      {THEMES.map((t) => (
        <Sample key={t.id} t={t} tours={tours} hero={hero} cta={cta} />
      ))}
    </div>
  );
}
