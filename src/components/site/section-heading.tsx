import type { ReactNode } from "react";
import { Reveal } from "./reveal";

/** Eyebrow + large title, with optional content (a link or a note) on the right. */
export function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sun-300">{eyebrow}</p>
        <h2 className="mt-2 text-3xl font-extrabold leading-tight text-white sm:text-4xl">{title}</h2>
      </div>
      {children}
    </Reveal>
  );
}
