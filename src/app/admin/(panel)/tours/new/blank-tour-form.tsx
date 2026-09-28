"use client";

import { PencilLine } from "lucide-react";
import { createTour } from "@/app/admin/actions";
import { tourTypeLabels } from "@/lib/site";
import { ActionForm, Status, SubmitButton, input, label } from "@/components/admin/ui";
import { DestinationSelect } from "@/components/admin/destination-select";

export function BlankTourForm({ destinations }: { destinations: { id: string; name: string; parent_id: string | null }[] }) {
  return (
    <div className="rounded-xl bg-white p-6 ring-1 ring-navy-100">
      <PencilLine className="size-6 text-navy-500" />
      <h2 className="mt-3 font-semibold text-navy-900">Start from scratch</h2>
      <p className="mt-1 text-sm text-navy-500">Create an empty draft and fill in the details yourself.</p>
      <ActionForm action={createTour} className="mt-5 space-y-4">
        {(state) => (
          <>
            <label className="block">
              <span className={label}>Title</span>
              <input name="title" required placeholder="e.g. 6D5N Hokkaido Winter" className={input} />
            </label>
            <label className="block">
              <span className={label}>Type</span>
              <select name="tour_type" className={input}>
                {Object.entries(tourTypeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className="block">
              <span className={label}>Destination</span>
              <DestinationSelect name="destination_id" destinations={destinations} />
            </label>
            <SubmitButton className="w-full">Create draft</SubmitButton>
            <Status state={state} />
          </>
        )}
      </ActionForm>
    </div>
  );
}
