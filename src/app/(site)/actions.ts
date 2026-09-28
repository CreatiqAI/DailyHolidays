"use server";

import { createPublicClient } from "@/lib/supabase/server";

export type EnquiryState = { ok: boolean; error?: string } | null;

const uuid = /^[0-9a-f-]{36}$/i;

export async function submitEnquiry(_prev: EnquiryState, formData: FormData): Promise<EnquiryState> {
  // honeypot: bots fill every field
  if (String(formData.get("company") ?? "")) return { ok: true };

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;
  const message = String(formData.get("message") ?? "").trim() || null;
  const paxRaw = Number(formData.get("pax"));
  const pax = Number.isInteger(paxRaw) && paxRaw >= 1 && paxRaw <= 99 ? paxRaw : null;
  const tourId = String(formData.get("tour_id") ?? "");
  const departureId = String(formData.get("departure_id") ?? "");

  if (!name || name.length > 200) return { ok: false, error: "Please enter your name." };
  if (!/^[+\d][\d\s-]{5,29}$/.test(phone)) return { ok: false, error: "Please enter a valid phone number." };
  if (email && (email.length > 200 || !/^\S+@\S+\.\S+$/.test(email)))
    return { ok: false, error: "Please enter a valid email address." };
  if (message && message.length > 2000) return { ok: false, error: "Message is too long (2,000 characters max)." };

  const { error } = await createPublicClient()
    .from("enquiries")
    .insert({
      name,
      phone,
      email,
      message,
      pax,
      tour_id: uuid.test(tourId) ? tourId : null,
      departure_id: uuid.test(departureId) ? departureId : null,
    });

  if (error) {
    console.error("enquiry insert failed", error);
    return { ok: false, error: "Sorry, something went wrong. Please WhatsApp or call us instead." };
  }
  return { ok: true };
}
