import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Sparkles } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { deleteTour } from "@/app/admin/actions";
import { ConfirmButton } from "@/components/admin/ui";
import { TourDetailsForm } from "./details-form";
import { DeparturesEditor } from "./departures-editor";
import { DaysEditor } from "./days-editor";
import { MediaManager } from "./media-manager";

// re-reading a PDF with AI can take a while
export const maxDuration = 300;

export default async function EditTourPage(props: PageProps<"/admin/tours/[id]">) {
  const { id } = await props.params;
  const { imported } = await props.searchParams;
  const { supabase } = await requireAdmin();

  const [{ data: tour }, { data: destinations }] = await Promise.all([
    supabase
      .from("tours")
      .select(
        `*,
         tour_departures(id, departure_date, price_myr, price_note, status),
         tour_days(id, day_number, title, description, meals, hotel,
           tour_day_places(sort_order, place:places(id, name, lat, lng))),
         tour_media(id, kind, url, caption, sort_order)`,
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("destinations").select("id, name, parent_id").order("name"),
  ]);
  if (!tour) notFound();

  const departures = [...tour.tour_departures].sort((a, b) => a.departure_date.localeCompare(b.departure_date));
  const days = [...tour.tour_days]
    .sort((a, b) => a.day_number - b.day_number)
    .map((d) => ({
      ...d,
      places: [...d.tour_day_places]
        .sort((a, b) => a.sort_order - b.sort_order)
        .flatMap((l) => (l.place ? [l.place] : [])),
    }));
  const media = [...tour.tour_media].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/admin/tours" className="inline-flex items-center gap-1 text-sm text-navy-500 hover:text-navy-800">
            <ArrowLeft className="size-4" /> Tours
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-navy-900">{tour.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {tour.status === "published" && (
            <Link
              href={`/tours/${tour.slug}`}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-navy-800 ring-1 ring-navy-200 hover:bg-navy-50"
            >
              <ExternalLink className="size-4" /> View live
            </Link>
          )}
          <ConfirmButton action={deleteTour.bind(null, tour.id)} message={`Delete "${tour.title}" permanently?`}>
            Delete
          </ConfirmButton>
        </div>
      </div>

      {imported && (
        <div className="flex gap-3 rounded-xl bg-sun-50 p-4 text-sm text-sun-800 ring-1 ring-sun-200">
          <Sparkles className="size-5 shrink-0" />
          <p>
            Draft created from the PDF. Check the dates, prices and itinerary below, add photos, click
            <strong> Locate places</strong> to plot the route map, then set the status to <strong>Published</strong>.
          </p>
        </div>
      )}

      <TourDetailsForm tour={tour} destinations={destinations ?? []} />
      <DeparturesEditor tourId={tour.id} departures={departures} />
      <DaysEditor tourId={tour.id} days={days} />
      <MediaManager tourId={tour.id} media={media} coverUrl={tour.cover_image_url} />
    </div>
  );
}
