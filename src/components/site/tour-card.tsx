import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import type { TourCard as TourCardData } from "@/lib/queries";
import { durationLabel, formatDate, formatRM } from "@/lib/format";
import { tourTypeLabels } from "@/lib/site";

/** Full-photo tour card: title and price sit on the image, like the explorer's shelf cards. */
export function TourCard({ tour, priority = false }: { tour: TourCardData; priority?: boolean }) {
  const duration = durationLabel(tour.duration_days, tour.duration_nights);
  const price = formatRM(tour.price_from_myr, { compact: true });

  return (
    <Link
      href={`/tours/${tour.slug}`}
      className="group relative block aspect-[4/5] overflow-hidden rounded-3xl bg-navy-800 ring-1 ring-white/10 transition duration-500 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-black/40 hover:ring-sun-400/70"
    >
      {tour.cover_image_url ? (
        <Image
          src={tour.cover_image_url}
          alt={tour.title}
          fill
          priority={priority}
          sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition duration-700 group-hover:scale-110"
        />
      ) : (
        <span className="absolute inset-0 bg-gradient-to-br from-navy-600 via-navy-700 to-sun-600" />
      )}
      <span className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/40 to-transparent" />

      <span className="absolute left-4 right-4 top-4 flex items-start justify-between gap-2">
        <span className="rounded-full bg-navy-950/60 px-3 py-1 text-[11px] font-semibold text-white ring-1 ring-white/15 backdrop-blur">
          {tourTypeLabels[tour.tour_type] ?? "Tour"}
        </span>
        {tour.departure_count > 0 && (
          <span className="glass-sun rounded-full px-3 py-1 text-[11px] font-bold text-white">
            {tour.departure_count} {tour.departure_count === 1 ? "date" : "dates"}
          </span>
        )}
      </span>

      <span className="absolute inset-x-4 bottom-4 block">
        {tour.destination && (
          <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sun-300">
            <MapPin className="size-3" /> {tour.destination.name}
          </span>
        )}
        <span className="mt-1.5 line-clamp-2 block text-lg font-bold leading-snug text-white">{tour.title}</span>
        <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-navy-100">
          {duration && (
            <span className="flex items-center gap-1"><Clock className="size-3.5" /> {duration}</span>
          )}
          {tour.next_departure && (
            <span className="flex items-center gap-1"><CalendarDays className="size-3.5" /> {formatDate(tour.next_departure)}</span>
          )}
        </span>
        <span className="mt-3 flex items-center justify-between border-t border-white/15 pt-3">
          {price ? (
            <span className="text-xs text-navy-200">
              from <span className="text-lg font-bold text-white">{price}</span>
            </span>
          ) : (
            <span className="text-sm font-medium text-navy-100">Price on request</span>
          )}
          <span className="glass grid size-9 place-items-center rounded-full transition group-hover:bg-sun-500/40">
            →
          </span>
        </span>
      </span>
    </Link>
  );
}
