"use client";

import Form from "next/form";
import Link from "next/link";
import { useRef } from "react";
import { Search, X } from "lucide-react";

type Option = { value: string; label: string };

type Props = {
  values: Record<string, string | undefined>;
  destinations: Option[];
  regions: Option[];
  months: Option[];
  types: Option[];
};

const field =
  "w-full rounded-xl border border-navy-100 bg-white px-3 py-2.5 text-sm text-navy-900 outline-none focus:border-sun-400 focus:ring-2 focus:ring-sun-200";

export function TourFilters({ values, destinations, regions, months, types }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const submit = () => formRef.current?.requestSubmit();
  const active = Object.values(values).some(Boolean);

  const select = (name: string, label: string, options: Option[], any: string) => (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-500">{label}</span>
      <select name={name} defaultValue={values[name] ?? ""} onChange={submit} className={field}>
        <option value="">{any}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );

  return (
    <Form ref={formRef} action="/tours" className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-navy-100">
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-500">Search</span>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-navy-400" />
          <input name="q" defaultValue={values.q ?? ""} placeholder="e.g. Hainan, Japan…" className={`${field} pl-9`} />
        </div>
      </label>
      {select("region", "Region", regions, "All regions")}
      {select("destination", "Destination", destinations, "All destinations")}
      {select("month", "Departing in", months, "Any month")}
      {select(
        "maxPrice",
        "Budget per person",
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
        "Trip length",
        [
          { value: "short", label: "Up to 4 days" },
          { value: "mid", label: "5 – 8 days" },
          { value: "long", label: "9+ days" },
        ],
        "Any length",
      )}
      {select("type", "Trip type", types, "All types")}
      <div className="flex gap-2 pt-1">
        <button type="submit" className="flex-1 rounded-xl bg-navy-800 py-2.5 text-sm font-semibold text-white hover:bg-navy-700">
          Apply
        </button>
        {active && (
          <Link href="/tours" className="flex items-center gap-1 rounded-xl px-3 text-sm font-medium text-navy-600 hover:bg-navy-50">
            <X className="size-4" /> Clear
          </Link>
        )}
      </div>
    </Form>
  );
}
