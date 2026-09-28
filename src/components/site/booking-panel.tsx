"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Check } from "lucide-react";
import { formatDate, formatMonth, formatRM } from "@/lib/format";
import { whatsappLink } from "@/lib/site";
import { EnquiryForm } from "./enquiry-form";
import { WhatsAppIcon } from "./icons";

type Departure = { id: string; departure_date: string; price_myr: number | null; price_note: string | null; status: string };

const statusLabel: Record<string, string> = { limited: "Few seats", full: "Full" };

/** "Choose your date": month tabs and date cards on the left, the enquiry form on the right. */
export function BookingPanel({
  tourId,
  tourTitle,
  priceFrom,
  departures,
}: {
  tourId: string;
  tourTitle: string;
  priceFrom: number | null;
  departures: Departure[];
}) {
  const months = useMemo(() => [...new Set(departures.map((d) => d.departure_date.slice(0, 7)))], [departures]);
  const [month, setMonth] = useState(months[0] ?? null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = departures.find((d) => d.id === selectedId) ?? null;
  const inMonth = departures.filter((d) => d.departure_date.startsWith(month ?? "#"));
  const cheapest = (m: string) => {
    const prices = departures.filter((d) => d.departure_date.startsWith(m) && d.price_myr != null).map((d) => d.price_myr!);
    return prices.length ? Math.min(...prices) : null;
  };

  const message = selected
    ? `I'm interested in "${tourTitle}" departing ${formatDate(selected.departure_date, "long")}.`
    : `I'm interested in "${tourTitle}".`;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="rounded-3xl bg-white shadow-sm p-5 ring-1 ring-navy-100 backdrop-blur sm:p-7">
        {departures.length === 0 ? (
          <div className="flex h-full flex-col items-start justify-center gap-3 py-8">
            <CalendarDays className="size-10 text-sun-600" />
            <p className="text-xl font-bold">Dates on request</p>
            <p className="max-w-md text-navy-700">
              We don&apos;t have upcoming departures listed for this trip yet. Send an enquiry and we&apos;ll share the next available dates and fares.
            </p>
          </div>
        ) : (
          <>
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Departure month">
              {months.map((m) => {
                const active = m === month;
                const low = cheapest(m);
                return (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setMonth(m)}
                    className={`shrink-0 rounded-2xl px-4 py-2.5 text-left transition ${
                      active ? "glass-sun" : "glass-light"
                    }`}
                  >
                    <span className="block text-sm font-bold">{formatMonth(`${m}-01`)}</span>
                    <span className={`text-[11px] ${active ? "text-sun-50" : "text-navy-200"}`}>{low ? `from ${formatRM(low, { compact: true })}` : "ask us"}</span>
                  </button>
                );
              })}
            </div>

            <div key={month} className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {inMonth.map((d, i) => {
                const full = d.status === "full";
                const isSel = d.id === selectedId;
                const date = new Date(`${d.departure_date}T12:00:00Z`);
                return (
                  <button
                    key={d.id}
                    type="button"
                    disabled={full}
                    onClick={() => setSelectedId(isSel ? null : d.id)}
                    style={{ animationDelay: `${i * 40}ms` }}
                    className={`fade-up relative rounded-2xl p-4 text-left ring-1 transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      isSel ? "bg-sun-50 ring-2 ring-sun-400" : "bg-white ring-navy-100 hover:bg-sand-50 hover:ring-navy-200"
                    }`}
                  >
                    {isSel && (
                      <span className="glass-sun absolute right-3 top-3 grid size-5 place-items-center rounded-full">
                        <Check className="size-3.5 text-navy-950" />
                      </span>
                    )}
                    <span className="block text-[11px] font-semibold uppercase tracking-widest text-navy-500">
                      {date.toLocaleDateString("en-MY", { weekday: "short", timeZone: "UTC" })}
                    </span>
                    <span className="block text-2xl font-extrabold leading-tight text-navy-950">
                      {date.toLocaleDateString("en-MY", { day: "numeric", month: "short", timeZone: "UTC" })}
                    </span>
                    <span className="mt-1 block text-sm font-semibold text-sun-600">{formatRM(d.price_myr, { compact: true }) ?? "Ask us"}</span>
                    {(d.price_note || statusLabel[d.status]) && (
                      <span className="mt-1 block text-[11px] leading-snug text-navy-500">{[statusLabel[d.status], d.price_note].filter(Boolean).join(" · ")}</span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-navy-400">Fares are per person in Ringgit. Tap a date to include it in your enquiry.</p>
          </>
        )}
      </div>

      <div className="rounded-3xl bg-gradient-to-b from-white to-sand-50 p-5 ring-1 ring-navy-100 backdrop-blur sm:p-7">
        <p className="text-sm text-navy-500">{priceFrom ? "From" : "Price"}</p>
        <p className="text-3xl font-extrabold text-navy-950">
          {formatRM(priceFrom, { compact: true }) ?? "On request"}
          {priceFrom ? <span className="text-sm font-normal text-navy-500"> / person</span> : null}
        </p>
        <p className="mt-1 min-h-5 text-sm text-sun-600">{selected ? `Departing ${formatDate(selected.departure_date, "long")}` : ""}</p>
        <div className="mt-5">
          <EnquiryForm tourId={tourId} departureId={selected?.id} defaultMessage={message} compact />
        </div>
        <a
          href={whatsappLink(`Hi Daily Holidays! ${message}`)}
          target="_blank"
          rel="noopener"
          className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 font-semibold text-white transition hover:brightness-95"
        >
          <WhatsAppIcon className="size-5" /> Ask on WhatsApp
        </a>
      </div>
    </div>
  );
}
