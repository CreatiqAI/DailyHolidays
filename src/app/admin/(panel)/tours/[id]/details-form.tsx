"use client";

import { updateTour } from "@/app/admin/actions";
import { tourTypeLabels } from "@/lib/site";
import type { Tables } from "@/lib/database.types";
import { ActionForm, Status, SubmitButton, input, label } from "@/components/admin/ui";
import { DestinationSelect } from "@/components/admin/destination-select";
import { Section } from "./section";

export function TourDetailsForm({
  tour,
  destinations,
}: {
  tour: Tables<"tours">;
  destinations: { id: string; name: string; parent_id: string | null }[];
}) {
  return (
    <Section title="Tour details" description="What customers see on the tour page.">
      <ActionForm action={updateTour.bind(null, tour.id)} className="space-y-5">
        {(state) => (
          <>
            <div className="grid gap-4 md:grid-cols-[1fr_180px]">
              <label className="block">
                <span className={label}>Title</span>
                <input name="title" defaultValue={tour.title} required className={input} />
              </label>
              <label className="block">
                <span className={label}>Status</span>
                <select name="status" defaultValue={tour.status} className={input}>
                  <option value="draft">Draft (hidden)</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived (hidden)</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <span className={label}>Type</span>
                <select name="tour_type" defaultValue={tour.tour_type} className={input}>
                  {Object.entries(tourTypeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
              <label className="block">
                <span className={label}>Destination</span>
                <DestinationSelect name="destination_id" destinations={destinations} defaultValue={tour.destination_id} />
              </label>
              <label className="block">
                <span className={label}>Days</span>
                <input name="duration_days" type="number" min={1} defaultValue={tour.duration_days ?? ""} className={input} />
              </label>
              <label className="block">
                <span className={label}>Nights</span>
                <input name="duration_nights" type="number" min={0} defaultValue={tour.duration_nights ?? ""} className={input} />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <span className={label}>Tour code</span>
                <input name="code" defaultValue={tour.code ?? ""} className={input} />
              </label>
              <label className="block">
                <span className={label}>Airline</span>
                <input name="airline" defaultValue={tour.airline ?? ""} className={input} />
              </label>
              <label className="block">
                <span className={label}>Hotels</span>
                <input name="hotel_rating" defaultValue={tour.hotel_rating ?? ""} placeholder="e.g. Local 4*" className={input} />
              </label>
              <label className="block">
                <span className={label}>URL slug</span>
                <input name="slug" defaultValue={tour.slug} required className={input} />
              </label>
            </div>

            <label className="block">
              <span className={label}>Summary (1–2 sentences, shown on cards and at the top of the page)</span>
              <textarea name="summary" rows={2} defaultValue={tour.summary ?? ""} className={input} />
            </label>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="block">
                <span className={label}>Highlights (one per line)</span>
                <textarea name="highlights" rows={6} defaultValue={tour.highlights.join("\n")} className={input} />
              </label>
              <label className="block">
                <span className={label}>Included (one per line)</span>
                <textarea name="inclusions" rows={6} defaultValue={tour.inclusions.join("\n")} className={input} />
              </label>
              <label className="block">
                <span className={label}>Not included (one per line)</span>
                <textarea name="exclusions" rows={6} defaultValue={tour.exclusions.join("\n")} className={input} />
              </label>
            </div>

            <label className="block">
              <span className={label}>Description (shown when there is no day-by-day itinerary; supports **bold**, ## headings and - lists)</span>
              <textarea name="description" rows={6} defaultValue={tour.description ?? ""} className={input} />
            </label>

            <div className="flex items-center gap-4">
              <SubmitButton>Save details</SubmitButton>
              <Status state={state} />
            </div>
          </>
        )}
      </ActionForm>
    </Section>
  );
}
