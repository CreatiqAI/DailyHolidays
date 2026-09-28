import type { Metadata } from "next";
import { Mail, MapPin, Navigation, Phone, Printer } from "lucide-react";
import { site, whatsappLink } from "@/lib/site";
import { EnquiryForm } from "@/components/site/enquiry-form";
import { WhatsAppIcon } from "@/components/site/icons";

export const metadata: Metadata = {
  title: "Contact us",
  description: `Visit or contact ${site.legalName} in Taman Selayang Jaya, Batu Caves, Selangor.`,
};

// Jalan SJ 6, Taman Selayang Jaya (OpenStreetMap)
const office = { lat: 3.2385847, lng: 101.6520236 };
const bbox = [office.lng - 0.006, office.lat - 0.004, office.lng + 0.006, office.lat + 0.004].join(",");

export default function ContactPage() {
  const directions = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${site.legalName}, ${site.address.join(", ")}`,
  )}`;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-wider text-sun-600">Contact</p>
      <h1 className="mt-1 text-3xl font-bold text-navy-900 sm:text-4xl">Let&apos;s plan your next trip</h1>
      <p className="mt-2 max-w-2xl text-navy-500">
        Send us your travel dates and ideas, or drop by our office in Batu Caves.      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <a href={whatsappLink("Hi Daily Holidays!")} target="_blank" rel="noopener" className="flex items-center gap-3 rounded-2xl bg-[#25D366] p-5 text-white hover:brightness-95">
              <WhatsAppIcon className="size-7" />
              <span><span className="block text-sm opacity-90">WhatsApp</span><span className="font-semibold">+60 12-218 6990</span></span>
            </a>
            <a href={site.phoneHref} className="flex items-center gap-3 rounded-2xl bg-navy-800 p-5 text-white hover:bg-navy-700">
              <Phone className="size-7" />
              <span><span className="block text-sm opacity-90">Call the office</span><span className="font-semibold">{site.phone}</span></span>
            </a>
          </div>

          <ul className="space-y-4 rounded-2xl bg-white p-6 text-sm ring-1 ring-navy-100">
            <li className="flex gap-3"><MapPin className="mt-0.5 size-5 shrink-0 text-sun-500" /><span>{site.address.map((l) => <span key={l} className="block">{l}</span>)}</span></li>
            <li className="flex gap-3"><Mail className="size-5 shrink-0 text-sun-500" /><a href={`mailto:${site.email}`} className="hover:underline">{site.email}</a></li>
            <li className="flex gap-3"><Printer className="size-5 shrink-0 text-sun-500" />Fax {site.fax}</li>
          </ul>

          <div className="overflow-hidden rounded-2xl ring-1 ring-navy-100">
            <iframe
              title="Daily Holidays office map"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${office.lat},${office.lng}`}
              className="h-72 w-full"
              loading="lazy"
            />
            <a href={directions} target="_blank" rel="noopener" className="flex items-center justify-center gap-2 bg-white py-3 text-sm font-semibold text-navy-700 hover:bg-navy-50">
              <Navigation className="size-4" /> Get directions
            </a>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 ring-1 ring-navy-100 sm:p-8">
          <h2 className="text-xl font-semibold text-navy-900">Send an enquiry</h2>
          <p className="mb-6 mt-1 text-sm text-navy-500">Tell us where you&apos;d like to go, when, and how many are travelling.</p>
          <EnquiryForm />
        </div>
      </div>
    </div>
  );
}
