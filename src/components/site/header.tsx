"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Phone, X } from "lucide-react";
import { Logo } from "./logo";
import { site } from "@/lib/site";

const nav = [
  { href: "/tours", label: "Tours" },
  { href: "/tours?type=cruise", label: "Cruises" },
  { href: "/tours?type=malaysia", label: "Malaysia" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const overHero = pathname === "/" && !scrolled && !open;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        overHero ? "bg-transparent" : "border-b border-navy-100 bg-white/95 shadow-sm backdrop-blur"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo light={overHero} />

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                overHero ? "text-white/90 hover:bg-white/10 hover:text-white" : "text-navy-800 hover:bg-navy-50"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <a
            href={site.phoneHref}
            className="ml-3 inline-flex items-center gap-2 rounded-full bg-sun-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sun-600"
          >
            <Phone className="size-4" /> {site.phone}
          </a>
        </nav>

        <button
          type="button"
          className={`rounded-lg p-2 md:hidden ${overHero ? "text-white" : "text-navy-800"}`}
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-navy-100 bg-white px-4 pb-4 md:hidden">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="block border-b border-navy-50 py-3 font-medium text-navy-800">
              {item.label}
            </Link>
          ))}
          <a
            href={site.phoneHref}
            className="mt-4 flex items-center justify-center gap-2 rounded-full bg-sun-500 py-3 font-semibold text-white"
          >
            <Phone className="size-4" /> Call {site.phone}
          </a>
        </nav>
      )}
    </header>
  );
}
