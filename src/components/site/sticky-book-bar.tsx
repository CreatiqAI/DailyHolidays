"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { formatDate, formatRM } from "@/lib/format";
import { whatsappLink } from "@/lib/site";
import { WhatsAppIcon } from "./icons";

/** Slim bar that follows the reader after the hero and gets out of the way on the booking section. */
export function StickyBookBar({
  title,
  priceFrom,
  nextDeparture,
  heroId,
  bookId,
}: {
  title: string;
  priceFrom: number | null;
  nextDeparture: string | null;
  heroId: string;
  bookId: string;
}) {
  const [pastHero, setPastHero] = useState(false);
  const [atBook, setAtBook] = useState(false);

  useEffect(() => {
    const hero = document.getElementById(heroId);
    const book = document.getElementById(bookId);
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === hero) setPastHero(!e.isIntersecting);
        if (e.target === book) setAtBook(e.isIntersecting);
      }
    });
    if (hero) io.observe(hero);
    if (book) io.observe(book);
    return () => io.disconnect();
  }, [heroId, bookId]);

  const show = pastHero && !atBook;

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 transition duration-500 ${show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0"}`}
      aria-hidden={!show}
    >
      <div className="mx-auto mb-3 flex max-w-5xl items-center gap-3 rounded-2xl bg-navy-900/85 p-3 pl-5 shadow-2xl shadow-black/50 ring-1 ring-white/15 backdrop-blur-xl sm:mb-5 sm:mr-24 lg:mr-auto">
        <div className="min-w-0 flex-1">
          <p className="hidden truncate text-sm font-semibold text-white sm:block">{title}</p>
          <p className="text-xs text-navy-200">
            {priceFrom ? (
              <>
                from <span className="text-base font-bold text-sun-300">{formatRM(priceFrom, { compact: true })}</span>
              </>
            ) : (
              "Price on request"
            )}
            {nextDeparture && <span className="ml-2 hidden sm:inline">· next {formatDate(nextDeparture)}</span>}
          </p>
        </div>
        <a
          href={whatsappLink(`Hi Daily Holidays! I'm interested in "${title}".`)}
          target="_blank"
          rel="noopener"
          aria-label="Ask on WhatsApp"
          tabIndex={show ? 0 : -1}
          className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#25D366] text-white hover:brightness-95"
        >
          <WhatsAppIcon className="size-5" />
        </a>
        <a
          href={`#${bookId}`}
          tabIndex={show ? 0 : -1}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-sun-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sun-500/30 hover:bg-sun-600"
        >
          <CalendarDays className="size-4" /> Choose a date
        </a>
      </div>
    </div>
  );
}
