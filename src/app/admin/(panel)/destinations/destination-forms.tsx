"use client";

import { useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import { deleteDestination, saveDestination } from "@/app/admin/actions";
import { regions } from "@/lib/site";
import type { Tables } from "@/lib/database.types";
import { ActionForm, Status, SubmitButton, input, label } from "@/components/admin/ui";
import { DestinationSelect } from "@/components/admin/destination-select";

type Opt = { id: string; name: string; parent_id: string | null };

function Fields({ d, destinations }: { d?: Tables<"destinations">; destinations: Opt[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="block">
        <span className={label}>Name</span>
        <input name="name" required defaultValue={d?.name} className={input} />
      </label>
      <label className="block">
        <span className={label}>Region</span>
        <select name="region" defaultValue={d?.region ?? ""} className={input}>
          <option value="">—</option>
          {regions.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </label>
      <label className="block">
        <span className={label}>Inside country (for areas)</span>
        <DestinationSelect
          name="parent_id"
          destinations={destinations.filter((x) => x.id !== d?.id)}
          defaultValue={d?.parent_id}
          emptyLabel="— It is a country —"
          onlyCountries
        />
      </label>
      <label className="block">
        <span className={label}>URL slug</span>
        <input name="slug" defaultValue={d?.slug} placeholder="auto from name" className={input} />
      </label>
      <label className="block sm:col-span-2">
        <span className={label}>Cover image URL (optional; otherwise a tour photo is used)</span>
        <input name="cover_image_url" defaultValue={d?.cover_image_url ?? ""} className={input} />
      </label>
      <label className="block">
        <span className={label}>Map pin latitude</span>
        <input name="lat" inputMode="decimal" placeholder="e.g. 20.02" defaultValue={d?.lat ?? ""} className={input} />
      </label>
      <label className="block">
        <span className={label}>Map pin longitude</span>
        <input name="lng" inputMode="decimal" placeholder="e.g. 110.35" defaultValue={d?.lng ?? ""} className={input} />
      </label>
      {d?.lat != null && d?.lng != null && (
        <a
          href={`https://www.openstreetmap.org/?mlat=${d.lat}&mlon=${d.lng}#map=7/${d.lat}/${d.lng}`}
          target="_blank"
          rel="noopener"
          className="text-xs text-navy-600 underline sm:col-span-2 lg:col-span-4"
        >
          Check the pin position on a map
        </a>
      )}
    </div>
  );
}

export function DestinationRow({ d, destinations, count }: { d: Tables<"destinations">; destinations: Opt[]; count: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg bg-white ring-1 ring-navy-100">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <span className="font-medium text-navy-900">{d.name}</span>
        {d.region && <span className="rounded-full bg-navy-50 px-2 py-0.5 text-xs text-navy-600">{d.region}</span>}
        <span className="ml-auto text-sm text-navy-400">{count} tours</span>
        <ChevronDown className={`size-4 text-navy-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-navy-100 p-4">
          <ActionForm action={saveDestination.bind(null, d.id)}>
            {(state) => (
              <>
                <Fields d={d} destinations={destinations} />
                <div className="mt-4 flex items-center gap-3">
                  <SubmitButton>Save</SubmitButton>
                  <Status state={state} />
                </div>
              </>
            )}
          </ActionForm>
          <form
            action={deleteDestination.bind(null, d.id)}
            onSubmit={(e) => { if (!confirm(`Delete ${d.name}? Its tours will have no destination.`)) e.preventDefault(); }}
            className="mt-3"
          >
            <button type="submit" className="inline-flex items-center gap-1 text-sm text-red-600 hover:underline">
              <Trash2 className="size-4" /> Delete destination
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export function NewDestination({ destinations }: { destinations: Opt[] }) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-700">
        Add destination
      </button>
    );
  return (
    <div className="rounded-xl bg-white p-5 ring-1 ring-navy-100">
      <ActionForm action={saveDestination.bind(null, null)}>
        {(state) => (
          <>
            <Fields destinations={destinations} />
            <div className="mt-4 flex items-center gap-3">
              <SubmitButton>Add</SubmitButton>
              <button type="button" onClick={() => setOpen(false)} className="text-sm text-navy-500 hover:underline">Close</button>
              <Status state={state} />
            </div>
          </>
        )}
      </ActionForm>
    </div>
  );
}
