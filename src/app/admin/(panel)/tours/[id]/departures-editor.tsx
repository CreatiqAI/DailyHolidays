"use client";

import { Trash2 } from "lucide-react";
import { addDeparture, deleteDeparture, updateDeparture } from "@/app/admin/actions";
import { todayISO } from "@/lib/format";
import { ActionForm, Status, SubmitButton, input } from "@/components/admin/ui";
import { Section } from "./section";

type Departure = { id: string; departure_date: string; price_myr: number | null; price_note: string | null; status: string };

const statuses = [
  { value: "available", label: "Available" },
  { value: "limited", label: "Few seats" },
  { value: "full", label: "Full" },
  { value: "cancelled", label: "Cancelled" },
];

function Fields({ d }: { d?: Departure }) {
  return (
    <>
      <input name="departure_date" type="date" required defaultValue={d?.departure_date} className={input} />
      <input name="price_myr" inputMode="decimal" placeholder="Price RM / pax" defaultValue={d?.price_myr ?? ""} className={input} />
      <input name="price_note" placeholder="Note e.g. Buy 1 Free 1" defaultValue={d?.price_note ?? ""} className={input} />
      <select name="status" defaultValue={d?.status ?? "available"} className={input}>
        {statuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
    </>
  );
}

const grid = "grid grid-cols-2 items-center gap-2 md:grid-cols-[150px_140px_1fr_130px_auto]";

export function DeparturesEditor({ tourId, departures }: { tourId: string; departures: Departure[] }) {
  const today = todayISO();
  const upcoming = departures.filter((d) => d.departure_date >= today);
  const past = departures.length - upcoming.length;

  return (
    <Section
      title="Departure dates & prices"
      description={`${upcoming.length} upcoming${past ? ` · ${past} past (hidden from customers)` : ""}. The lowest upcoming price becomes the "from" price.`}
    >
      <div className="space-y-2">
        {upcoming.map((d) => (
          <div key={d.id} className="flex items-center gap-2">
            <ActionForm action={updateDeparture.bind(null, d.id, tourId)} className={`${grid} flex-1`}>
              {(state) => (
                <>
                  <Fields d={d} />
                  <div className="flex items-center gap-2">
                    <SubmitButton variant="secondary">Save</SubmitButton>
                    <Status state={state} />
                  </div>
                </>
              )}
            </ActionForm>
            <form action={deleteDeparture.bind(null, d.id, tourId)}>
              <button type="submit" aria-label="Delete date" className="rounded-lg p-2 text-navy-400 hover:bg-red-50 hover:text-red-600">
                <Trash2 className="size-4" />
              </button>
            </form>
          </div>
        ))}
        {upcoming.length === 0 && <p className="text-sm text-navy-400">No upcoming dates yet.</p>}
      </div>

      <div className="mt-5 rounded-lg bg-navy-50/60 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-500">Add a date</p>
        <ActionForm action={addDeparture.bind(null, tourId)} className={grid}>
          {(state) => (
            <>
              <Fields />
              <div className="flex items-center gap-2">
                <SubmitButton>Add</SubmitButton>
                <Status state={state} />
              </div>
            </>
          )}
        </ActionForm>
      </div>
    </Section>
  );
}
