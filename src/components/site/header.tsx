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

/** Transparent over each page's photo hero; turns to dark glass once the page scrolls. */
export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const solid = scrolled || open;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) => href === "/tours" ? pathname.startsWith("/tours") : pathname === href.split("?")[0] && href.split("?")[0] !== "/tours";

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        solid ? "border-b border-white/10 bg-navy-950/80 shadow-lg shadow-black/20 backdrop-blur-xl" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo light />

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                isActive(item.href) ? "bg-white/10 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.label}
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
          className="rounded-lg p-2 text-white md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-white/10 px-4 pb-4 md:hidden">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="block border-b border-white/5 py-3 font-medium text-white">
              {item.label}
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
