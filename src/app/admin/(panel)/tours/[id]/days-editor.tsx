"use client";

import { useState, useTransition } from "react";
import { ChevronDown, LoaderCircle, MapPin, MapPinned, Plus, Trash2 } from "lucide-react";
import { deleteDay, locatePlaces, saveDay, updatePlace } from "@/app/admin/actions";
import type { ActionResult } from "@/lib/admin";
import { ActionForm, Status, SubmitButton, input, label } from "@/components/admin/ui";
import { Section } from "./section";

type Place = { id: string; name: string; lat: number | null; lng: number | null };
type Day = {
  id: string;
  day_number: number;
  title: string;
  description: string | null;
  meals: string[];
  hotel: string | null;
  places: Place[];
};

const MEALS = ["Breakfast", "Lunch", "Dinner"];

function DayFields({ day, nextNumber }: { day?: Day; nextNumber?: number }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[90px_1fr]">
        <label className="block">
          <span className={label}>Day</span>
          <input name="day_number" type="number" min={1} required defaultValue={day?.day_number ?? nextNumber} className={input} />
        </label>
        <label className="block">
          <span className={label}>Title</span>
          <input name="title" required defaultValue={day?.title} placeholder="e.g. Kuala Lumpur – Haikou" className={input} />
        </label>
      </div>
      <label className="block">
        <span className={label}>What happens this day</span>
        <textarea name="description" rows={3} defaultValue={day?.description ?? ""} className={input} />
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className={label}>Places visited (one per line, used for the map)</span>
          <textarea name="places" rows={4} defaultValue={day?.places.map((p) => p.name).join("\n")} className={input} />
        </label>
        <div className="space-y-3">
          <fieldset>
            <legend className={label}>Meals included</legend>
            <div className="flex gap-4">
              {MEALS.map((m) => (
                <label key={m} className="flex items-center gap-1.5 text-sm text-navy-700">
                  <input type="checkbox" name="meals" value={m} defaultChecked={day?.meals.includes(m)} className="size-4 accent-navy-700" /> {m}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block">
            <span className={label}>Hotel</span>
            <input name="hotel" defaultValue={day?.hotel ?? ""} className={input} />
          </label>
        </div>
      </div>
    </div>
  );
}

function PlaceRow({ place, tourId }: { place: Place; tourId: string }) {
  const [open, setOpen] = useState(false);
  const located = place.lat != null && place.lng != null;
  return (
    <li className="text-sm">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center gap-1.5 rounded-full bg-navy-50 px-3 py-1 text-navy-700 hover:bg-navy-100">
        <MapPin className={`size-3.5 ${located ? "text-green-600" : "text-navy-300"}`} />
        {place.name}
        {!located && <span className="text-xs text-navy-400">(not on map)</span>}
      </button>
      {open && (
        <ActionForm action={updatePlace.bind(null, place.id, tourId)} className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-navy-50/60 p-2">
          {(state) => (
            <>
              <input name="name" defaultValue={place.name} className={`${input} w-48`} />
              <input name="lat" placeholder="Latitude" defaultValue={place.lat ?? ""} className={`${input} w-32`} />
              <input name="lng" placeholder="Longitude" defaultValue={place.lng ?? ""} className={`${input} w-32`} />
              <SubmitButton variant="secondary">Save place</SubmitButton>
              {located && (
                <a href={`https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}#map=14/${place.lat}/${place.lng}`} target="_blank" rel="noopener" className="text-xs text-navy-600 underline">
                  Check on map
                </a>
              )}
              <Status state={state} />
            </>
          )}
        </ActionForm>
      )}
    </li>
  );
}

function LocateButton({ tourId, missing }: { tourId: string; missing: number }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult>(null);
  return (
    <div className="flex items-center gap-3">
      <Status state={result} />
      <button
        type="button"
        disabled={pending || missing === 0}
        onClick={() => start(async () => setResult(await locatePlaces(tourId)))}
        className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-navy-800 ring-1 ring-navy-200 hover:bg-navy-50 disabled:opacity-50"
      >
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <MapPinned className="size-4" />}
        {missing ? `Locate ${missing} place${missing === 1 ? "" : "s"} on map` : "All places on map"}
      </button>
    </div>
  );
}

export function DaysEditor({ tourId, days }: { tourId: string; days: Day[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const missing = new Set(days.flatMap((d) => d.places.filter((p) => p.lat == null).map((p) => p.id))).size;
  const nextNumber = (days.at(-1)?.day_number ?? 0) + 1;

  return (
    <Section
      title="Day-by-day itinerary"
      description="Each day's places are plotted on the tour map. Green pins are located; click a place to fix its position."
      actions={<LocateButton tourId={tourId} missing={missing} />}
    >
      <ol className="space-y-3">
        {days.map((d) => {
          const open = openId === d.id;
          return (
            <li key={d.id} className="rounded-lg ring-1 ring-navy-100">
              <button type="button" onClick={() => setOpenId(open ? null : d.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-navy-700 text-xs font-bold text-white">{d.day_number}</span>
                <span className="min-w-0 flex-1 truncate font-medium text-navy-900">{d.title}</span>
                <span className="text-xs text-navy-400">{d.places.length} places</span>
                <ChevronDown className={`size-4 text-navy-400 transition ${open ? "rotate-180" : ""}`} />
              </button>
              {!open && d.places.length > 0 && (
                <ul className="flex flex-wrap gap-2 px-4 pb-3">
                  {d.places.map((p) => <PlaceRow key={p.id} place={p} tourId={tourId} />)}
                </ul>
              )}
              {open && (
                <div className="border-t border-navy-100 p-4">
                  <ActionForm action={saveDay.bind(null, tourId, d.id)}>
                    {(state) => (
                      <>
                        <DayFields day={d} />
                        <div className="mt-4 flex items-center gap-3">
                          <SubmitButton>Save day</SubmitButton>
                          <Status state={state} />
                        </div>
                      </>
                    )}
                  </ActionForm>
                  <form
                    action={deleteDay.bind(null, d.id, tourId)}
                    onSubmit={(e) => { if (!confirm(`Delete day ${d.day_number}?`)) e.preventDefault(); }}
                    className="mt-3"
                  >
                    <button type="submit" className="inline-flex items-center gap-1 text-sm text-red-600 hover:underline">
                      <Trash2 className="size-4" /> Delete day
                    </button>
                  </form>
                </div>
              )}
            </li>
          );
        })}
        {days.length === 0 && <p className="text-sm text-navy-400">No itinerary yet. Add days below, or create the tour from a PDF.</p>}
      </ol>

      {adding ? (
        <div className="mt-4 rounded-lg bg-navy-50/60 p-4">
          <ActionForm action={saveDay.bind(null, tourId, null)}>
            {(state) => (
              <>
                <DayFields nextNumber={nextNumber} />
                <div className="mt-4 flex items-center gap-3">
                  <SubmitButton>Add day</SubmitButton>
                  <button type="button" onClick={() => setAdding(false)} className="text-sm text-navy-500 hover:underline">Close</button>
                  <Status state={state} />
                </div>
              </>
            )}
          </ActionForm>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-navy-700 hover:underline">
          <Plus className="size-4" /> Add a day
        </button>
      )}
    </Section>
  );
}
