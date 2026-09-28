"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileUp, LoaderCircle, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { importTourFromPdf } from "@/app/admin/actions";

export function PdfImport() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<"idle" | "uploading" | "reading">("idle");
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!file) return;
    setError(null);
    setStep("uploading");
    const path = `imports/${crypto.randomUUID()}.pdf`;
    const { error: upErr } = await createClient()
      .storage.from("tour-media")
      .upload(path, file, { contentType: "application/pdf" });
    if (upErr) {
      setStep("idle");
      setError(`Upload failed: ${upErr.message}`);
      return;
    }
    setStep("reading");
    const res = await importTourFromPdf(path, file.name);
    if (res.error || !res.id) {
      setStep("idle");
      setError(res.error ?? "Import failed.");
      return;
    }
    router.push(`/admin/tours/${res.id}?imported=1`);
  }

  const busy = step !== "idle";

  return (
    <div className="rounded-xl bg-white p-6 ring-1 ring-navy-100">
      <Sparkles className="size-6 text-sun-500" />
      <h2 className="mt-3 font-semibold text-navy-900">Create from itinerary PDF</h2>
      <p className="mt-1 text-sm text-navy-500">
        Upload the operator&apos;s PDF (English or Chinese). AI reads the dates, fares and day-by-day plan and creates a
        <strong> draft</strong> for you to check before publishing.
      </p>
      <label className="mt-5 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-navy-200 p-6 text-center hover:border-navy-400">
        <FileUp className="size-6 text-navy-400" />
        <span className="text-sm font-medium text-navy-700">{file ? file.name : "Choose a PDF"}</span>
        <input
          type="file"
          accept="application/pdf"
          className="sr-only"
          disabled={busy}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>
      <button
        type="button"
        onClick={run}
        disabled={!file || busy}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-sun-500 py-2.5 text-sm font-semibold text-white hover:bg-sun-600 disabled:opacity-50"
      >
        {busy && <LoaderCircle className="size-4 animate-spin" />}
        {step === "uploading" ? "Uploading…" : step === "reading" ? "Reading PDF with AI (up to 2 min)…" : "Create draft"}
      </button>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
