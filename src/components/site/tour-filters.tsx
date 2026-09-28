"use client";

import Form from "next/form";
import Link from "next/link";
import { useRef } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

type Option = { value: string; label: string };

type Props = {
  values: Record<string, string | undefined>;
  destinations: Option[];
  regions: Option[];
  months: Option[];
  types: Option[];
};

/** Glass filter bar: every change submits, so results update as you pick. */
export function TourFilters({ values, destinations, regions, months, types }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const submit = () => formRef.current?.requestSubmit();
  const active = Object.values(values).some(Boolean);

  const select = (name: string, label: string, options: Option[], any: string) => (
    <label className="block min-w-0">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-navy-200">{label}</span>
      <select name={name} defaultValue={values[name] ?? ""} onChange={submit} className={`field-dark ${values[name] ? "border-sun-400/70" : ""}`}>
        <option value="">{any}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );

  return (
    <Form ref={formRef} action="/tours" className="rounded-3xl bg-navy-900/70 p-4 shadow-2xl shadow-black/40 ring-1 ring-white/10 backdrop-blur-xl sm:p-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(6,minmax(0,1fr))]">
        <label className="block min-w-0 sm:col-span-2 lg:col-span-1">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-navy-200">Search</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-navy-300" />
            <input name="q" defaultValue={values.q ?? ""} placeholder="Hainan, Japan, cruise…" className="field-dark pl-9" />
          </div>
        </label>
        {select("region", "Region", regions, "All regions")}
        {select("destination", "Destination", destinations, "Anywhere")}
        {select("month", "Departing", months, "Any month")}
        {select(
          "maxPrice",
          "Budget",
          [
            { value: "2000", label: "Under RM 2,000" },
            { value: "4000", label: "Under RM 4,000" },
            { value: "7000", label: "Under RM 7,000" },
            { value: "10000", label: "Under RM 10,000" },
          ],
          "Any budget",
        )}
        {select(
          "duration",
          "Length",
          [
            { value: "short", label: "Up to 4 days" },
            { value: "mid", label: "5 – 8 days" },
            { value: "long", label: "9+ days" },
          ],
          "Any length",
        )}
        {select("type", "Type", types, "All types")}
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        {active && (
          <Link href="/tours" className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-navy-100 hover:bg-white/10">
            <X className="size-4" /> Clear filters
          </Link>
        )}
        <button type="submit" className="glass-sun inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white">
          <SlidersHorizontal className="size-4" /> Show trips
        </button>
      </div>
    </Form>
  );
}
