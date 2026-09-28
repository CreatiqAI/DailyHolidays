import type { ReactNode } from "react";

export function Section({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl bg-white ring-1 ring-navy-100">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-navy-100 px-5 py-4">
        <div>
          <h2 className="font-semibold text-navy-900">{title}</h2>
          {description && <p className="text-sm text-navy-500">{description}</p>}
        </div>
        {actions}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}
