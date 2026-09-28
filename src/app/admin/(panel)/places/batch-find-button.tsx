"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
import { findPlaceMedia } from "@/app/admin/actions";
import type { ActionResult } from "@/lib/admin";
import { Status } from "@/components/admin/ui";

/** Finds photos for the next batch of never-searched stops. */
export function BatchFindButton({ ids }: { ids: string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult>(null);
  return (
    <div className="flex items-center gap-3">
      <Status state={result} />
      <button
        type="button"
        disabled={pending || ids.length === 0}
        onClick={() =>
          start(async () => {
            setResult(await findPlaceMedia(ids));
            router.refresh();
          })
        }
        className="inline-flex items-center gap-2 rounded-lg bg-sun-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sun-600 disabled:opacity-50"
      >
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        {pending ? "Searching Wikipedia…" : ids.length ? `Find photos for next ${ids.length} stops` : "All stops searched"}
      </button>
    </div>
  );
}
