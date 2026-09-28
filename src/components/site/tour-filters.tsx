"use client";

import Form from "next/form";
import Link from "next/link";
import { useRef, useState } from "react";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { Dropdown } from "./dropdown";

type Option = { value: string; label: string };

type Props = {
  values: Record<string, string | undefined>;
  destinations: Option[];
  regions: Option[];
  months: Option[];
  types: Option[];
};

/** Glass filter bar: every change submits, so results update as you pick. On phones the dropdowns fold away behind a Filters button. */
export function TourFilters({ values, destinations, regions, months, types }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const submit = () => formRef.current?.requestSubmit();
  const active = Object.values(values).some(Boolean);
  const activeCount = Object.entries(values).filter(([k, v]) => k !== "q" && v).length;
  const [open, setOpen] = useState(false);

  const select = (name: string, label: string, options: Option[], any: string) => (
    <Dropdown key={`${name}-${values[name] ?? ""}`} name={name} label={label} options={options} placeholder={any} defaultValue={values[name] ?? ""} onChange={submit} />
  );

  return (
    <Form ref={formRef} action="/tours" className="rounded-3xl bg-white/90 p-4 shadow-2xl shadow-navy-900/15 ring-1 ring-navy-100 backdrop-blur-xl sm:p-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(6,minmax(0,1fr))]">
        <div className="col-span-2 flex items-end gap-2 lg:col-span-1">
          <label className="block min-w-0 flex-1">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-navy-500">Search</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-navy-300" />
              <input name="q" defaultValue={values.q ?? ""} placeholder="Hainan, Japan, cruise…" className="field pl-9" />
            </div>
          </label>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="glass-light inline-flex h-[42px] shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold sm:hidden"
          >
            <SlidersHorizontal className="size-4" /> Filters
            {activeCount > 0 && <span className="grid size-5 place-items-center rounded-full bg-sun-500 text-[11px] font-bold">{activeCount}</span>}
            <ChevronDown className={`size-4 transition ${open ? "rotate-180" : ""}`} />
          </button>
        </div>
        <div className={`${open ? "grid" : "hidden"} col-span-2 grid-cols-2 gap-3 sm:contents`}>
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
      </div>
      <div className={`mt-3 items-center justify-end gap-2 ${open ? "flex" : "hidden"} sm:flex`}>
        {active && (
          <Link href="/tours" className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-navy-700 hover:bg-navy-100">
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
