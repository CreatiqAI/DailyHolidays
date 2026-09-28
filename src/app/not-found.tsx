import Link from "next/link";
import { Compass } from "lucide-react";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";

export default function NotFound() {
  // root-level, so it also covers unknown URLs outside the site's route group
  return (
    <div className="flex min-h-screen flex-col bg-sand-50 text-navy-950">
      <Header />
      <main className="flex-1">
        <div className="relative isolate flex min-h-[80svh] items-center justify-center overflow-hidden px-4 pt-16 text-center">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(232,132,26,0.18),transparent_60%)]" />
          <div className="fade-up max-w-xl">
            <Compass className="mx-auto size-14 text-sun-600" />
            <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.3em] text-sun-600">
              Off the map
            </p>
            <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">
              We couldn&apos;t find that page
            </h1>
            <p className="mt-3 text-navy-500">
              The trip may have ended or moved. Browse our current tours
              instead.
            </p>
            <Link
              href="/tours"
              className="glass-sun mt-8 inline-flex rounded-full px-6 py-3 font-semibold text-white"
            >
              See all tours
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
