"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Menu, Phone, X } from "lucide-react";
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

type Pill = { left: number; width: number; visible: boolean };

/** Transparent over each page's photo header, frosted white once scrolled. A pill glides between links. */
export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [overHero, setOverHero] = useState(true);
  const solid = !overHero || open;

  const navRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [hover, setHover] = useState<number | null>(null);
  const [pill, setPill] = useState<Pill>({ left: 0, width: 0, visible: false });

  const isActive = (href: string) => (href === "/tours" ? pathname.startsWith("/tours") : pathname === href);
  const activeIndex = nav.findIndex((n) => !n.external && isActive(n.href));
  const target = hover ?? (activeIndex >= 0 ? activeIndex : null);

  // transparent (white text) only while sitting on a photo header marked with data-hero
  useEffect(() => {
    const update = () => setOverHero(!!document.querySelector("[data-hero]") && window.scrollY < 40);
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [pathname]);

  const place = useCallback(() => {
    const el = target != null ? linkRefs.current[target] : null;
    const box = navRef.current;
    if (!el || !box) return setPill((p) => ({ ...p, visible: false }));
    setPill({ left: el.offsetLeft, width: el.offsetWidth, visible: true });
  }, [target]);

  useLayoutEffect(place, [place]);
  useEffect(() => {
    window.addEventListener("resize", place);
    // web fonts can change link widths after first paint
    document.fonts?.ready.then(place);
    return () => window.removeEventListener("resize", place);
  }, [place]);

  const linkClass = (i: number) => {
    const lit = i === target;
    return `relative z-10 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 ${
      solid ? (lit ? "text-navy-950" : "text-navy-600 hover:text-navy-950") : lit ? "text-white" : "text-white/80 hover:text-white"
    }`;
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,box-shadow] duration-300 ${
        open ? "border-b border-navy-100 bg-white shadow-lg" : solid ? "border-b border-navy-100 bg-white/85 shadow-sm backdrop-blur-xl" : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo light={!solid} />

        <div className="hidden items-center gap-4 lg:flex">
          <nav ref={navRef} className="relative flex items-center" onPointerLeave={() => setHover(null)}>
            <span
              aria-hidden
              className={`absolute top-1/2 h-9 -translate-y-1/2 rounded-full transition-all duration-300 ease-out ${
                solid ? "bg-navy-50" : "bg-white/15"
              } ${pill.visible ? "opacity-100" : "opacity-0"}`}
              style={{ left: pill.left, width: pill.width }}
            />
            {nav.map((item, i) => (
              <Link
                key={item.href}
                ref={(el) => {
                  linkRefs.current[i] = el;
                }}
                href={item.href}
                {...(item.external ? { target: "_blank", rel: "noopener" } : {})}
                aria-current={i === activeIndex ? "page" : undefined}
                onPointerEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                className={linkClass(i)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <a
            href={site.phoneHref}
            className="glass-sun inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white"
          >
            <Phone className="size-4" /> {site.phone}
          </a>
        </div>

        <button
          type="button"
          className={`rounded-lg p-2 transition-colors lg:hidden ${solid ? "text-navy-900" : "text-white"}`}
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      <div className={`grid transition-all duration-300 ease-out lg:hidden ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <nav className="overflow-hidden" inert={!open}>
          <div className="border-t border-navy-100 px-4 pb-4 pt-2">
            {nav.map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                {...(item.external ? { target: "_blank", rel: "noopener" } : {})}
                className={`block rounded-xl px-3 py-3 font-medium transition-colors ${i === activeIndex ? "bg-navy-50 text-navy-950" : "text-navy-700 hover:bg-navy-50"}`}
              >
                {item.label}
              </Link>
            ))}
            <a href={site.phoneHref} className="glass-sun mt-3 flex items-center justify-center gap-2 rounded-full py-3 font-semibold text-white">
              <Phone className="size-4" /> Call {site.phone}
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
}
