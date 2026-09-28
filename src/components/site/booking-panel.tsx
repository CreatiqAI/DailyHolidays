"use client";

import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { formatDate, formatMonth, formatRM } from "@/lib/format";
import { whatsappLink } from "@/lib/site";
import { EnquiryForm } from "./enquiry-form";
import { WhatsAppIcon } from "./icons";

type Departure = { id: string; departure_date: string; price_myr: number | null; price_note: string | null; status: string };

const statusLabel: Record<string, string> = { limited: "Few seats", full: "Full" };

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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = departures.find((d) => d.id === selectedId) ?? null;

  const byMonth = useMemo(() => {
    const groups = new Map<string, Departure[]>();
    for (const d of departures) {
      const key = d.departure_date.slice(0, 7);
      groups.set(key, [...(groups.get(key) ?? []), d]);
    }
    return [...groups.entries()];
  }, [departures]);

  const message = selected
    ? `I'm interested in "${tourTitle}" departing ${formatDate(selected.departure_date, "long")}.`
    : `I'm interested in "${tourTitle}".`;

  return (
    <div className="space-y-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy-100">
      <div>
        <p className="text-sm text-navy-500">{priceFrom ? "From" : "Price"}</p>
        <p className="text-3xl font-bold text-navy-900">
          {formatRM(priceFrom, { compact: true }) ?? "On request"}
          {priceFrom ? <span className="text-sm font-normal text-navy-500"> / person</span> : null}
        </p>
      </div>

      <div>
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-navy-900">
          <CalendarDays className="size-4 text-sun-500" /> Choose a departure date
        </p>
        {departures.length === 0 ? (
          <p className="rounded-xl bg-navy-50 p-3 text-sm text-navy-600">
            No upcoming dates listed yet. Send an enquiry and we&apos;ll share the next available departures.
          </p>
        ) : (
          <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
            {byMonth.map(([month, list]) => (
              <div key={month}>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-navy-400">{formatMonth(`${month}-01`)}</p>
                <div className="grid grid-cols-2 gap-2">
                  {list.map((d) => {
                    const full = d.status === "full";
                    const isSel = d.id === selectedId;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        disabled={full}
                        onClick={() => setSelectedId(isSel ? null : d.id)}
                        className={`rounded-xl border px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          isSel ? "border-sun-500 bg-sun-50 ring-2 ring-sun-200" : "border-navy-100 hover:border-navy-300"
                        }`}
                      >
                        <span className="block text-sm font-semibold text-navy-900">{formatDate(d.departure_date)}</span>
                        <span className="block text-xs text-navy-500">
                          {formatRM(d.price_myr, { compact: true }) ?? "Ask us"}
                          {statusLabel[d.status] ? ` · ${statusLabel[d.status]}` : ""}
                        </span>
                        {d.price_note && <span className="block text-[11px] font-medium text-sun-600">{d.price_note}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-navy-50 pt-5">
        <p className="mb-3 text-sm font-semibold text-navy-900">Enquire about this trip</p>
        <EnquiryForm tourId={tourId} departureId={selected?.id} defaultMessage={message} compact />
      </div>

      <a
        href={whatsappLink(`Hi Daily Holidays! ${message}`)}
        target="_blank"
        rel="noopener"
        className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 font-semibold text-white hover:brightness-95"
      >
        <WhatsAppIcon className="size-5" /> Ask on WhatsApp
      </a>
    </div>
  );
}
