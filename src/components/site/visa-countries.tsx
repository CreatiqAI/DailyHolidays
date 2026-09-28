"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { whatsappLink } from "@/lib/site";
import { WhatsAppIcon } from "./icons";

export type VisaCountry = { name: string; note?: string; docs?: string[] };

/** Countries the agency handles visas for; each opens its usual document checklist. */
export function VisaCountries({ countries }: { countries: VisaCountry[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 lg:grid-cols-3">
      {countries.map((c) => {
        const on = open === c.name;
        return (
          <div key={c.name} className={`rounded-2xl border bg-white transition ${on ? "border-navy-300 shadow-lg shadow-navy-900/5" : "border-navy-100 hover:border-navy-200"}`}>
            <button type="button" onClick={() => setOpen(on ? null : c.name)} aria-expanded={on} className="flex w-full items-center gap-3 p-5 text-left">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-navy-50 font-[family-name:var(--font-display)] text-sm font-bold text-navy-800">
                {c.name.slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-navy-900">{c.name}</span>
                <span className="block text-xs text-navy-500">{c.docs ? "Document checklist inside" : "Ask us for the current checklist"}</span>
              </span>
              <ChevronDown className={`size-4 text-navy-400 transition ${on ? "rotate-180" : ""}`} />
            </button>
            <div className={`grid transition-all duration-300 ${on ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
              <div className="overflow-hidden">
                <div className="space-y-4 border-t border-navy-50 p-5">
                  {c.note && <p className="text-sm text-navy-600">{c.note}</p>}
                  {c.docs ? (
                    <ul className="space-y-2">
                      {c.docs.map((d) => (
                        <li key={d} className="flex gap-2 text-sm text-navy-700">
                          <Check className="mt-0.5 size-4 shrink-0 text-sun-600" /> {d}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-navy-600">Requirements depend on your passport and the purpose of your trip. Message us and we&apos;ll send the latest list.</p>
                  )}
                  <a
                    href={whatsappLink(`Hi Daily Holidays, I'd like to apply for a ${c.name} visa.`)}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-white hover:brightness-95"
                  >
                    <WhatsAppIcon className="size-4" /> Ask about a {c.name} visa
                  </a>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
