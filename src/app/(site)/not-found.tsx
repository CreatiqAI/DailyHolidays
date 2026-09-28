import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 pb-24 pt-36 text-center">
      <Compass className="size-12 text-sun-500" />
      <h1 className="mt-4 text-3xl font-bold text-navy-900">We couldn&apos;t find that page</h1>
      <p className="mt-2 text-navy-500">The trip may have ended or moved. Browse our current tours instead.</p>
      <Link href="/tours" className="mt-8 rounded-full bg-navy-800 px-6 py-3 font-semibold text-white hover:bg-navy-700">
        See all tours
      </Link>
    </div>
  );
}
