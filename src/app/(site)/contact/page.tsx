import type { Metadata } from "next";
import { Mail, MapPin, Navigation, Phone, Printer } from "lucide-react";
import { site, whatsappLink } from "@/lib/site";
import { getHeroImages } from "@/lib/queries";
import { EnquiryForm } from "@/components/site/enquiry-form";
import { PageHero } from "@/components/site/page-hero";
import { Reveal } from "@/components/site/reveal";
import { WhatsAppIcon } from "@/components/site/icons";

export const metadata: Metadata = {
  title: "Contact us",
  description: `Visit or contact ${site.legalName} in Taman Selayang Jaya, Batu Caves, Selangor.`,
};

export const revalidate = 3600;

// Jalan SJ 6, Taman Selayang Jaya (OpenStreetMap)
const office = { lat: 3.2385847, lng: 101.6520236 };
const bbox = [office.lng - 0.006, office.lat - 0.004, office.lng + 0.006, office.lat + 0.004].join(",");

export default async function ContactPage() {
  const images = await getHeroImages();
  const hero = images.find((i) => i.name === "Vietnam")?.url ?? images[0]?.url ?? null;
  const directions = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${site.legalName}, ${site.address.join(", ")}`)}`;

  return (
    <>
      <PageHero
        image={hero}
        eyebrow="Contact"
        title="Let's plan your next trip"
        subtitle="Send us your travel dates and ideas, message us on WhatsApp, or drop by our office in Batu Caves."
      />

      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 pb-24 pt-10 sm:px-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-6">
          <Reveal className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <a
              href={whatsappLink("Hi Daily Holidays!")}
              target="_blank"
              rel="noopener"
              className="group flex items-center gap-4 rounded-3xl bg-[#25D366]/15 p-5 ring-1 ring-[#25D366]/40 transition hover:bg-[#25D366]/25"
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-[#25D366] text-white"><WhatsAppIcon className="size-6" /></span>
              <span><span className="block text-sm text-navy-500">WhatsApp</span><span className="font-semibold">+60 12-218 6990</span></span>
            </a>
            <a href={site.phoneHref} className="group flex items-center gap-4 rounded-3xl bg-sun-500/15 p-5 ring-1 ring-sun-400/40 transition hover:bg-sun-500/25">
              <span className="glass-sun grid size-12 place-items-center rounded-2xl text-white"><Phone className="size-6" /></span>
              <span><span className="block text-sm text-navy-500">Call the office</span><span className="font-semibold">{site.phone}</span></span>
            </a>
          </Reveal>

          <Reveal delay={80} className="rounded-3xl bg-white shadow-sm p-6 ring-1 ring-navy-100">
            <ul className="space-y-4 text-sm text-navy-700">
              <li className="flex gap-3"><MapPin className="mt-0.5 size-5 shrink-0 text-sun-600" /><span>{site.address.map((l) => <span key={l} className="block">{l}</span>)}</span></li>
              <li className="flex gap-3"><Mail className="size-5 shrink-0 text-sun-600" /><a href={`mailto:${site.email}`} className="hover:text-navy-950 hover:underline">{site.email}</a></li>
              <li className="flex gap-3"><Printer className="size-5 shrink-0 text-sun-600" />Fax {site.fax}</li>
            </ul>
          </Reveal>

          <Reveal delay={160} className="overflow-hidden rounded-3xl ring-1 ring-navy-100">
            <iframe
              title="Daily Holidays office map"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${office.lat},${office.lng}`}
              className="h-72 w-full"
              loading="lazy"
            />
            <a href={directions} target="_blank" rel="noopener" className="flex items-center justify-center gap-2 bg-navy-50 py-3 text-sm font-semibold text-navy-950 hover:bg-navy-100">
              <Navigation className="size-4 text-sun-600" /> Get directions
            </a>
          </Reveal>
        </div>

        <Reveal delay={100} className="rounded-3xl bg-gradient-to-b from-white to-sand-50 p-6 ring-1 ring-navy-100 backdrop-blur sm:p-8">
          <h2 className="text-2xl font-extrabold">Send an enquiry</h2>
          <p className="mb-6 mt-1 text-sm text-navy-500">Tell us where you&apos;d like to go, when, and how many are travelling.</p>
          <EnquiryForm />
        </Reveal>
      </section>
    </>
  );
}
