import Image from "next/image";
import type { ReactNode } from "react";

/** Full-bleed photo header used across the public pages (same treatment as the explorer). */
export function PageHero({
  image,
  eyebrow,
  title,
  subtitle,
  children,
  size = "md",
}: {
  image: string | null;
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  size?: "md" | "lg";
}) {
  return (
    <section data-hero className={`relative isolate flex items-end overflow-hidden text-white ${size === "lg" ? "min-h-[70svh]" : "min-h-[52svh]"}`}>
      <div className="absolute inset-0 -z-10 overflow-hidden bg-navy-950">
        {image && (
          <div className="hero-bg absolute inset-0">
            <Image src={image} alt="" fill priority sizes="100vw" className="object-cover" />
          </div>
        )}
      </div>
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(0deg, #0b0f29 0%, rgba(11,15,41,0.75) 28%, rgba(11,15,41,0.25) 65%, rgba(11,15,41,0.6) 100%), linear-gradient(90deg, rgba(11,15,41,0.7) 0%, rgba(11,15,41,0) 60%)",
        }}
      />
      <div className="fade-up mx-auto w-full max-w-7xl px-4 pb-12 pt-32 sm:px-6">
        {eyebrow && <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-sun-300">{eyebrow}</p>}
        <h1 className="max-w-4xl text-4xl font-extrabold leading-[1.05] sm:text-6xl">{title}</h1>
        {subtitle && <div className="mt-4 max-w-2xl text-base text-navy-100 sm:text-lg">{subtitle}</div>}
        {children}
      </div>
    </section>
  );
}
