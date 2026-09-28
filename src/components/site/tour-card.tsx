import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock, MapPin } from "lucide-react";
import type { TourCard as TourCardData } from "@/lib/queries";
import { durationLabel, formatDate, formatRM } from "@/lib/format";
import { tourTypeLabels } from "@/lib/site";

/** Coastal tour card: photo on top, details on a white body. */
export function TourCard({ tour, priority = false }: { tour: TourCardData; priority?: boolean }) {
  const duration = durationLabel(tour.duration_days, tour.duration_nights);
  const price = formatRM(tour.price_from_myr, { compact: true });

  return (
    <Link
      href={`/tours/${tour.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-navy-100 bg-white transition duration-300 hover:-translate-y-1 hover:border-navy-200 hover:shadow-xl hover:shadow-navy-900/10"
    >
      <span className="relative block aspect-[4/3] overflow-hidden bg-navy-50">
        {tour.cover_image_url ? (
          <Image
            src={tour.cover_image_url}
            alt={tour.title}
            fill
            priority={priority}
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition duration-700 group-hover:scale-105"
          />
        ) : (
          <span className="absolute inset-0 bg-gradient-to-br from-navy-700 to-navy-900" />
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-navy-900 shadow-sm">
          {tourTypeLabels[tour.tour_type] ?? "Tour"}
        </span>
        {tour.departure_count > 0 && (
          <span className="absolute right-3 top-3 rounded-full bg-sun-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
            {tour.departure_count} {tour.departure_count === 1 ? "date" : "dates"}
          </span>
        )}
      </span>

      <span className="flex flex-1 flex-col p-5">
        {tour.destination && (
          <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sun-600">
            <MapPin className="size-3" /> {tour.destination.name}
          </span>
        )}
        <span className="mt-1.5 line-clamp-2 font-[family-name:var(--font-display)] text-lg font-semibold leading-snug text-navy-900">{tour.title}</span>
        <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-navy-500">
          {duration && (
            <span className="flex items-center gap-1"><Clock className="size-3.5" /> {duration}</span>
          )}
          {tour.next_departure && (
            <span className="flex items-center gap-1"><CalendarDays className="size-3.5" /> {formatDate(tour.next_departure)}</span>
          )}
        </span>
        <span className="mt-auto flex items-end justify-between pt-4">
          {price ? (
            <span className="text-sm text-navy-500">
              from <span className="text-xl font-bold text-navy-900">{price}</span>
            </span>
          ) : (
            <span className="text-sm font-medium text-navy-500">Price on request</span>
          )}
          <span className="grid size-9 place-items-center rounded-full border border-navy-200 text-navy-900 transition group-hover:border-sun-500 group-hover:bg-sun-500 group-hover:text-white">
            <ArrowRight className="size-4" />
          </span>
        </span>
      </span>
    </Link>
  );
}
