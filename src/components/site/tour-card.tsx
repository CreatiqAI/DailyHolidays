import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import type { TourCard as TourCardData } from "@/lib/queries";
import { durationLabel, formatDate, formatRM } from "@/lib/format";
import { tourTypeLabels } from "@/lib/site";
import { TourImagePlaceholder } from "./tour-image-placeholder";

export function TourCard({ tour, priority = false }: { tour: TourCardData; priority?: boolean }) {
  const duration = durationLabel(tour.duration_days, tour.duration_nights);
  const price = formatRM(tour.price_from_myr, { compact: true });

  return (
    <Link
      href={`/tours/${tour.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-navy-100 transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-navy-100">
        {tour.cover_image_url ? (
          <Image
            src={tour.cover_image_url}
            alt={tour.title}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <TourImagePlaceholder label={tour.destination?.name ?? tour.title} />
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-navy-800 backdrop-blur">
          {tourTypeLabels[tour.tour_type] ?? "Tour"}
        </span>
        {tour.departure_count > 0 && (
          <span className="absolute right-3 top-3 rounded-full bg-sun-500 px-3 py-1 text-xs font-semibold text-white">
            {tour.departure_count} {tour.departure_count === 1 ? "date" : "dates"}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        {tour.destination && (
          <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-sun-600">
            <MapPin className="size-3.5" /> {tour.destination.name}
          </p>
        )}
        <h3 className="line-clamp-2 font-semibold leading-snug text-navy-900 group-hover:text-navy-600">{tour.title}</h3>
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-navy-500">
          {duration && (
            <span className="flex items-center gap-1"><Clock className="size-3.5" /> {duration}</span>
          )}
          {tour.next_departure && (
            <span className="flex items-center gap-1"><CalendarDays className="size-3.5" /> Next: {formatDate(tour.next_departure)}</span>
          )}
        </div>
        <div className="flex items-end justify-between border-t border-navy-50 pt-3">
          {price ? (
            <p className="text-xs text-navy-500">
              From <span className="block text-lg font-bold text-navy-900">{price}</span>
            </p>
          ) : (
            <p className="text-sm font-medium text-navy-500">Price on request</p>
          )}
          <span className="text-sm font-semibold text-sun-600 group-hover:underline">View trip →</span>
        </div>
      </div>
    </Link>
  );
}
