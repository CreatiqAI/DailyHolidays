import { Plane } from "lucide-react";

export function TourImagePlaceholder({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-navy-700 via-navy-600 to-sun-500 p-4 text-center text-white">
      <Plane className="size-8 opacity-80" />
      <span className="line-clamp-2 text-lg font-semibold">{label}</span>
    </div>
  );
}
