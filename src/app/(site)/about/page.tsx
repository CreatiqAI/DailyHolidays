import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Hotel, MapPin, Plane, Ship, ShieldCheck, Stamp, Users } from "lucide-react";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About us",
  description: site.description,
};

const services = [
  { icon: Plane, title: "Airline ticketing", body: "Domestic and international flights for holidays and business travel." },
  { icon: Users, title: "Group & incentive tours", body: "Special incentive tours for companies, associations and families, planned end to end." },
  { icon: Stamp, title: "Visa applications", body: "We prepare and submit visa applications for your destination." },
  { icon: ShieldCheck, title: "Travel insurance", body: "Protect your trip with travel insurance arranged with your booking." },
  { icon: Hotel, title: "Hotel booking & reservations", body: "Hotels worldwide, plus homestay experiences." },
  { icon: Ship, title: "Holiday cruises & coach service", body: "Cruise holidays and coach charter for groups." },
  { icon: MapPin, title: "Malaysia getaways", body: "Cameron Highlands, Genting Highlands, island tours, sport events, spa and food festival packages." },
];

export default function AboutPage() {
  return (
    <div className="pb-20 pt-28">
      <section className="mx-auto max-w-4xl px-4 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-wider text-sun-600">About us</p>
        <h1 className="mt-1 text-3xl font-bold text-navy-900 sm:text-4xl">{site.legalName}</h1>
        <p className="mt-1 text-lg text-navy-400">{site.chineseName}</p>
        <div className="mt-6 space-y-4 text-lg leading-relaxed text-navy-700">
          <p>
            Daily Holidays is a Malaysian travel agency based in Batu Caves, Selangor. We run inbound and outbound tour
            packages across Asia, Europe, the Middle East and beyond, alongside everything else you need to travel.
          </p>
          <p>
            Whether it&apos;s a family holiday, a company incentive trip or a weekend in the highlands, our team plans
            the details so you can enjoy the journey.
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-navy-800 ring-1 ring-navy-100">
            <BadgeCheck className="size-4 text-sun-500" /> Licensed: {site.licence}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-navy-800 ring-1 ring-navy-100">
            <BadgeCheck className="size-4 text-sun-500" /> Company no. {site.companyNo}
          </span>
        </div>
      </section>

      <section id="services" className="mx-auto mt-16 max-w-7xl scroll-mt-24 px-4 sm:px-6">
        <h2 className="text-2xl font-bold text-navy-900">What we do</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <div key={s.title} className="rounded-2xl bg-white p-6 ring-1 ring-navy-100">
              <s.icon className="size-6 text-sun-500" />
              <h3 className="mt-4 font-semibold text-navy-900">{s.title}</h3>
              <p className="mt-1 text-sm text-navy-600">{s.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/tours" className="rounded-full bg-navy-800 px-6 py-3 font-semibold text-white hover:bg-navy-700">Browse tours</Link>
          <Link href="/contact" className="rounded-full bg-sun-500 px-6 py-3 font-semibold text-white hover:bg-sun-600">Contact us</Link>
        </div>
      </section>
    </div>
  );
}
