import Link from "next/link";
import { Mail, MapPin, Phone, Printer } from "lucide-react";
import { Logo } from "./logo";
import { FacebookIcon, TikTokIcon, WhatsAppIcon } from "./icons";
import { site, whatsappLink } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-white/10 bg-navy-950 text-navy-100">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo light />
          <p className="text-sm leading-relaxed text-navy-200">
            {site.legalName} ({site.companyNo}) is a licensed Malaysian travel agency, {site.licence}, serving
            travellers from Batu Caves, Selangor.
          </p>
          <div className="flex gap-3">
            <a href={site.facebook} target="_blank" rel="noopener" aria-label="Facebook" className="rounded-full bg-white/10 p-2 hover:bg-white/20">
              <FacebookIcon className="size-4" />
            </a>
            <a href={site.tiktok} target="_blank" rel="noopener" aria-label="TikTok" className="rounded-full bg-white/10 p-2 hover:bg-white/20">
              <TikTokIcon className="size-4" />
            </a>
            <a href={whatsappLink()} target="_blank" rel="noopener" aria-label="WhatsApp" className="rounded-full bg-white/10 p-2 hover:bg-white/20">
              <WhatsAppIcon className="size-4" />
            </a>
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Holidays</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/tours" className="hover:text-white">All tours</Link></li>
            <li><Link href="/tours?region=Asia" className="hover:text-white">Asia</Link></li>
            <li><Link href="/tours?region=Europe" className="hover:text-white">Europe</Link></li>
            <li><Link href="/tours?region=Middle+East" className="hover:text-white">Middle East</Link></li>
            <li><Link href="/tours?type=cruise" className="hover:text-white">Cruises</Link></li>
            <li><Link href="/tours?type=malaysia" className="hover:text-white">Malaysia tours</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Services</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/about#services" className="hover:text-white">Air ticketing</Link></li>
            <li><Link href="/about#services" className="hover:text-white">Visa applications</Link></li>
            <li><Link href="/about#services" className="hover:text-white">Travel insurance</Link></li>
            <li><a href={site.hotelBooking} target="_blank" rel="noopener" className="hover:text-white">Hotel booking</a></li>
            <li><Link href="/contact" className="hover:text-white">Corporate &amp; incentive trips</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Visit us</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3"><MapPin className="mt-0.5 size-4 shrink-0 text-sun-400" /><span>{site.address.join(", ")}</span></li>
            <li className="flex gap-3"><Phone className="size-4 shrink-0 text-sun-400" /><a href={site.phoneHref} className="hover:text-white">{site.phone}</a></li>
            <li className="flex gap-3"><Printer className="size-4 shrink-0 text-sun-400" /><span>{site.fax}</span></li>
            <li className="flex gap-3"><Mail className="size-4 shrink-0 text-sun-400" /><a href={`mailto:${site.email}`} className="break-all hover:text-white">{site.email}</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-navy-300 sm:flex-row sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} {site.legalName} ({site.companyNo}) · {site.licence}</p>
          <p>{site.chineseName}</p>
        </div>
      </div>
    </footer>
  );
}
