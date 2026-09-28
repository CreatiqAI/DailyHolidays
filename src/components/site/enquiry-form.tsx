"use client";

import { useActionState } from "react";
import { CircleCheck, LoaderCircle, Send } from "lucide-react";
import { submitEnquiry, type EnquiryState } from "@/app/(site)/actions";

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
      <div className="fade-up flex flex-col items-center gap-2 rounded-2xl bg-emerald-500/10 p-8 text-center ring-1 ring-emerald-400/30">
        <CircleCheck className="size-10 text-emerald-300" />
        <p className="text-lg font-semibold text-white">Thank you, we&apos;ve received your enquiry.</p>
        <p className="text-sm text-navy-100">Our team will contact you shortly.</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="tour_id" value={tourId ?? ""} />
      <input type="hidden" name="departure_id" value={departureId ?? ""} />
      <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <input name="name" required maxLength={200} placeholder="Your name" autoComplete="name" aria-label="Your name" className="field-dark" />
      <div className={compact ? "grid grid-cols-[1fr_96px] gap-3" : "grid gap-3 sm:grid-cols-2"}>
        <input name="phone" required type="tel" placeholder="Phone / WhatsApp" autoComplete="tel" aria-label="Phone or WhatsApp" className="field-dark" />
        {compact ? (
          <input name="pax" type="number" min={1} max={99} placeholder="Pax" aria-label="Number of travellers" className="field-dark" />
        ) : (
          <input name="email" type="email" placeholder="Email (optional)" autoComplete="email" aria-label="Email" className="field-dark" />
        )}
      </div>
      {!compact && <input name="pax" type="number" min={1} max={99} placeholder="Number of travellers" aria-label="Number of travellers" className="field-dark" />}
      <textarea
        key={defaultMessage}
        name="message"
        rows={compact ? 3 : 5}
        maxLength={2000}
        defaultValue={defaultMessage}
        placeholder="Anything we should know?"
        aria-label="Message"
        className="field-dark"
      />
      {state?.error && <p className="text-sm text-red-300">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="glass-sun flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white transition disabled:opacity-60"
      >
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />} Send enquiry
      </button>
    </form>
  );
}
