import Form from "next/form";
import { Search } from "lucide-react";
import { todayISO, formatMonth } from "@/lib/format";

type Option = { value: string; label: string };

function nextMonths(count: number): Option[] {
  const [y, m] = todayISO().split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 + i, 1));
    const value = d.toISOString().slice(0, 7);
    return { value, label: formatMonth(`${value}-01`) };
  });
}

const budgets: Option[] = [
  { value: "2000", label: "Under RM 2,000" },
  { value: "4000", label: "Under RM 4,000" },
  { value: "7000", label: "Under RM 7,000" },
  { value: "10000", label: "Under RM 10,000" },
];

const selectClass =
  "w-full appearance-none rounded-xl border border-navy-100 bg-white px-4 py-3 text-sm text-navy-900 outline-none focus:border-sun-400 focus:ring-2 focus:ring-sun-200";

export function TripSearch({ destinations }: { destinations: Option[] }) {
  return (
    <Form action="/tours" className="grid gap-3 rounded-2xl bg-white p-3 shadow-2xl sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_auto]">
      <label className="block">
        <span className="sr-only">Where to?</span>
        <select name="destination" defaultValue="" className={selectClass}>
          <option value="">Anywhere</option>
          {destinations.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="sr-only">When?</span>
        <select name="month" defaultValue="" className={selectClass}>
          <option value="">Any month</option>
          {nextMonths(12).map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="sr-only">Budget per person</span>
        <select name="maxPrice" defaultValue="" className={selectClass}>
          <option value="">Any budget</option>
          {budgets.map((b) => (
            <option key={b.value} value={b.value}>{b.label}</option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="flex items-center justify-center gap-2 rounded-xl bg-sun-500 px-6 py-3 font-semibold text-white transition hover:bg-sun-600 sm:col-span-2 lg:col-span-1"
      >
        <Search className="size-4" /> Find trips
      </button>
    </Form>
  );
}
