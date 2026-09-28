"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ArrowRight, Check, ChevronDown, Hotel, MapPin, Plane, Ship, ShieldCheck, Stamp, Users, type LucideIcon } from "lucide-react";
import { site, whatsappLink } from "@/lib/site";
import { WhatsAppIcon } from "./icons";
import { PIN_TOP, useScrollSteps } from "./use-scroll-steps";

type Service = {
  key: string;
  icon: LucideIcon;
  title: string;
  tagline: string;
  body: string;
  points: string[];
  link?: { href: string; label: string; external?: boolean };
};

// Only what Daily Holidays actually offers (from their own site); no promises about timing or prices.
const SERVICES: Service[] = [
  {
    key: "flights",
    icon: Plane,
    title: "Air ticketing",
    tagline: "Flights, sorted",
    body: "Domestic and international flights for holidays, business trips and visits home. Send us your route and dates and we'll come back with options.",
    points: ["Domestic & international routes", "For individuals, families and groups", "Pair it with a tour or hotel"],
  },
  {
    key: "visa",
    icon: Stamp,
    title: "Visa applications",
    tagline: "Paperwork, handled",
    body: "Heading somewhere that needs a visa? Tell us your passport and destination and we'll help you prepare and submit the application.",
    points: ["Check what your destination requires", "Help with the documents", "Apply in good time before you fly"],
    link: { href: "/visa", label: "Visa services" },
  },
  {
    key: "insurance",
    icon: ShieldCheck,
    title: "Travel insurance",
    tagline: "Travel with cover",
    body: "Insurance arranged together with your booking, so it's one less thing to sort out before you go.",
    points: ["AIG, Chubb and RHB plans", "Add it to any tour or flight", "For individuals and groups"],
    link: { href: "/travel-insurance", label: "Insurance options" },
  },
  {
    key: "hotels",
    icon: Hotel,
    title: "Hotels & homestays",
    tagline: "A place to stay",
    body: "Hotels anywhere in the world, plus homestay experiences in Malaysia for something more local.",
    points: ["Hotels worldwide", "Homestay experiences", "Combine with flights or a tour"],
    link: { href: site.hotelBooking, label: "Search hotels", external: true },
  },
  {
    key: "cruises",
    icon: Ship,
    title: "Holiday cruises",
    tagline: "Holidays at sea",
    body: "Cruise holidays around Asia and beyond: the easy way to see several places on one trip.",
    points: ["Cruise holiday packages", "Combine with flights", "Great for families and groups"],
    link: { href: "/tours?type=cruise", label: "See cruise trips" },
  },
  {
    key: "groups",
    icon: Users,
    title: "Incentive & group trips",
    tagline: "Travel together",
    body: "Company incentive trips, association outings and family reunions, planned end to end, with coach service for groups.",
    points: ["Special incentive tours", "Coach service for groups", "Planned around your dates and budget"],
  },
  {
    key: "malaysia",
    icon: MapPin,
    title: "Malaysia getaways",
    tagline: "Close to home",
    body: "Short breaks without the long flight: the highlands, the islands and more.",
    points: ["Cameron & Genting Highlands", "Island tours", "Sport events, spa and food festival packages"],
    link: { href: "/tours?type=malaysia", label: "See Malaysia trips" },
  },
];

function Actions({ s }: { s: Service }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      <a
        href={whatsappLink(`Hi Daily Holidays, I'd like to ask about ${s.title.toLowerCase()}.`)}
        target="_blank"
        rel="noopener"
        className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-95"
      >
        <WhatsAppIcon className="size-4" /> Ask about this
      </a>
      {s.link &&
        (s.link.external ? (
          <a href={s.link.href} target="_blank" rel="noopener" className="glass-light inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold">
            {s.link.label} <ArrowRight className="size-4" />
          </a>
        ) : (
          <Link href={s.link.href} className="glass-light inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold">
            {s.link.label} <ArrowRight className="size-4" />
          </Link>
        ))}
    </div>
  );
}

/**
 * Services list + detail panel. Desktop (tall enough): the section pins and scrolling walks down the list,
 * swapping the panel. Shorter desktops: hover/click. Phones: an accordion.
 */
export function ServicesExplorer({ header }: { header?: ReactNode }) {
  const [picked, setPicked] = useState(SERVICES[0].key);
  const { trackRef, stickyRef, enabled: pinned, step, sub, goTo } = useScrollSteps(SERVICES.length, "(min-width: 1024px) and (min-height: 760px)");
  const active = pinned ? SERVICES[step].key : picked;
  const current = SERVICES.find((s) => s.key === active);

  const choose = (key: string) => {
    const i = SERVICES.findIndex((s) => s.key === key);
    if (!goTo(i)) setPicked(active === key ? "" : key);
  };

  return (
    <div ref={trackRef} className={pinned ? "h-[340vh]" : ""}>
      <div
        ref={stickyRef}
        className={pinned ? "sticky flex h-[calc(100vh-96px)] flex-col justify-center pb-6" : ""}
        style={pinned ? { top: PIN_TOP } : undefined}
      >
        {header}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center">
          <ul className={pinned ? "space-y-1" : "space-y-2"}>
            {SERVICES.map((s) => {
              const on = s.key === active;
              return (
                <li key={s.key}>
                  <button
                    type="button"
                    onClick={() => choose(s.key)}
                    onPointerEnter={(e) => !pinned && e.pointerType === "mouse" && setPicked(s.key)}
                    aria-expanded={on}
                    className={`group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl px-4 text-left transition duration-300 ${pinned ? "py-2.5" : "py-3.5"} ${
                      on ? "bg-white shadow-md shadow-navy-900/10 ring-1 ring-navy-100" : "hover:bg-white/70"
                    }`}
                  >
                    <span className={`grid size-11 shrink-0 place-items-center rounded-2xl transition duration-300 ${on ? "glass-sun" : "bg-navy-50 text-navy-500"}`}>
                      <s.icon className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block font-bold ${on ? "text-navy-950" : "text-navy-700"}`}>{s.title}</span>
                      <span className="block text-xs text-navy-400">{s.tagline}</span>
                    </span>
                    <ChevronDown className={`size-4 text-navy-300 transition duration-300 lg:-rotate-90 ${on ? "rotate-180 text-sun-600 lg:rotate-0 lg:opacity-0" : ""}`} />
                    {on && pinned && (
                      <span className="absolute inset-x-4 bottom-0 h-0.5 overflow-hidden rounded-full bg-navy-50">
                        <span className="block h-full origin-left rounded-full bg-sun-500 transition-transform duration-150" style={{ transform: `scaleX(${Math.max(0.04, sub)})` }} />
                      </span>
                    )}
                  </button>

                  {/* phones: details open inline */}
                  <div className={`grid transition-all duration-500 lg:hidden ${on ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                    <div className="overflow-hidden">
                      <div className="space-y-4 px-4 pb-2 pt-4">
                        <p className="text-sm leading-relaxed text-navy-600">{s.body}</p>
                        <ul className="space-y-1.5">
                          {s.points.map((p) => (
                            <li key={p} className="flex gap-2 text-sm text-navy-700">
                              <Check className="mt-0.5 size-4 shrink-0 text-sun-600" /> {p}
                            </li>
                          ))}
                        </ul>
                        <Actions s={s} />
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* desktop: large detail panel */}
          {current && (
            <div className="relative hidden overflow-hidden rounded-[2rem] bg-white p-10 shadow-xl shadow-navy-900/10 ring-1 ring-navy-100 lg:block">
              <current.icon className="pointer-events-none absolute -right-10 -top-10 size-72 text-sun-500/[0.07]" strokeWidth={1} />
              <div key={current.key} className="fade-up relative space-y-6">
                <span className="glass-sun grid size-16 place-items-center rounded-3xl">
                  <current.icon className="size-8" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sun-600">{current.tagline}</p>
                  <h3 className="mt-2 text-3xl font-extrabold text-navy-950">{current.title}</h3>
                  <p className="mt-3 max-w-lg text-lg leading-relaxed text-navy-600">{current.body}</p>
                </div>
                <ul className="grid gap-3 sm:grid-cols-3">
                  {current.points.map((p, i) => (
                    <li key={p} className="fade-up rounded-2xl bg-sand-100 p-4 text-sm font-medium text-navy-800 ring-1 ring-navy-100" style={{ animationDelay: `${120 + i * 80}ms` }}>
                      <Check className="mb-2 size-4 text-sun-600" /> {p}
                    </li>
                  ))}
                </ul>
                <Actions s={current} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
