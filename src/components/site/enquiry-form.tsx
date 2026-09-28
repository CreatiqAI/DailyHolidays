"use client";

import { useActionState } from "react";
import { CircleCheck, LoaderCircle } from "lucide-react";
import { submitEnquiry, type EnquiryState } from "@/app/(site)/actions";

const field =
  "w-full rounded-xl border border-navy-100 bg-white px-3 py-2.5 text-sm text-navy-900 outline-none placeholder:text-navy-300 focus:border-sun-400 focus:ring-2 focus:ring-sun-200";

export function EnquiryForm({
  tourId,
  departureId,
  defaultMessage,
  compact = false,
}: {
  tourId?: string;
  departureId?: string;
  defaultMessage?: string;
  compact?: boolean;
}) {
  const [state, action, pending] = useActionState<EnquiryState, FormData>(submitEnquiry, null);

  if (state?.ok) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl bg-green-50 p-6 text-center text-green-800">
        <CircleCheck className="size-8" />
        <p className="font-semibold">Thank you, we&apos;ve received your enquiry.</p>
        <p className="text-sm">Our team will contact you shortly, usually on WhatsApp.</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="tour_id" value={tourId ?? ""} />
      <input type="hidden" name="departure_id" value={departureId ?? ""} />
      <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <input name="name" required maxLength={200} placeholder="Your name" autoComplete="name" className={field} />
      <div className={compact ? "grid grid-cols-[1fr_90px] gap-3" : "grid gap-3 sm:grid-cols-2"}>
        <input name="phone" required type="tel" placeholder="Phone / WhatsApp" autoComplete="tel" className={field} />
        {compact ? (
          <input name="pax" type="number" min={1} max={99} placeholder="Pax" className={field} />
        ) : (
          <input name="email" type="email" placeholder="Email (optional)" autoComplete="email" className={field} />
        )}
      </div>
      {!compact && <input name="pax" type="number" min={1} max={99} placeholder="Number of travellers" className={field} />}
      <textarea
        key={defaultMessage}
        name="message"
        rows={compact ? 3 : 5}
        maxLength={2000}
        defaultValue={defaultMessage}
        placeholder="Anything we should know?"
        className={field}
      />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-sun-500 py-3 font-semibold text-white transition hover:bg-sun-600 disabled:opacity-60"
      >
        {pending && <LoaderCircle className="size-4 animate-spin" />} Send enquiry
      </button>
    </form>
  );
}
