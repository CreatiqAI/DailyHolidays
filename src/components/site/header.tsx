"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, Menu, Phone, X } from "lucide-react";
import { Logo } from "./logo";
import { site } from "@/lib/site";

const nav: { href: string; label: string; external?: boolean }[] = [
  { href: "/tours", label: "Tours" },
  { href: site.hotelBooking, label: "Hotel booking", external: true },
  { href: "/visa", label: "Visa" },
  { href: "/travel-insurance", label: "Travel insurance" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

/** Transparent over each page's photo hero; turns to dark glass once the page scrolls. */
export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [overHero, setOverHero] = useState(true);
  const solid = !overHero || open;

  // transparent (white text) only while sitting on a photo header marked with data-hero
  useEffect(() => {
    const update = () => {
      setOverHero(!!document.querySelector("[data-hero]") && window.scrollY < 40);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [pathname]);

  const isActive = (href: string) => (href === "/tours" ? pathname.startsWith("/tours") : pathname === href);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        solid ? "border-b border-navy-100 bg-white/80 shadow-sm backdrop-blur-xl" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo light={!solid} />

        <nav className="hidden items-center gap-0.5 lg:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              {...(item.external ? { target: "_blank", rel: "noopener" } : {})}
              className={`inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                solid
                  ? isActive(item.href)
                    ? "bg-navy-50 text-navy-950"
                    : "text-navy-700 hover:bg-navy-50 hover:text-navy-950"
                  : isActive(item.href)
                    ? "bg-white/15 text-white"
                    : "text-white/85 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.label}
              {item.external && <ArrowUpRight className="size-3.5 opacity-60" />}
            </Link>
          ))}
          <a
            href={site.phoneHref}
            className="glass-sun ml-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white transition"
          >
            <Phone className="size-4" /> {site.phone}
          </a>
        </nav>

        <button
          type="button"
          className={`rounded-lg p-2 lg:hidden ${solid ? "text-navy-900" : "text-white"}`}
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-navy-100 px-4 pb-4 lg:hidden">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              {...(item.external ? { target: "_blank", rel: "noopener" } : {})}
              className="flex items-center gap-1.5 border-b border-navy-50 py-3 font-medium text-navy-900"
            >
              {item.label}
              {item.external && <ArrowUpRight className="size-4 text-navy-400" />}
            </Link>
          ))}
          <a href={site.phoneHref} className="glass-sun mt-4 flex items-center justify-center gap-2 rounded-full py-3 font-semibold text-white">
            <Phone className="size-4" /> Call {site.phone}
          </a>
        </nav>
      )}
    </header>
  );
}
