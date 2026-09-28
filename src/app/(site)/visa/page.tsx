import type { Metadata } from "next";
import { CircleAlert, FileCheck2, MessageCircle, Stamp } from "lucide-react";
import { getHeroImages } from "@/lib/queries";
import { whatsappLink } from "@/lib/site";
import { EnquiryForm } from "@/components/site/enquiry-form";
import { PageHero } from "@/components/site/page-hero";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";
import { VisaCountries, type VisaCountry } from "@/components/site/visa-countries";
import { WhatsAppIcon } from "@/components/site/icons";

export const metadata: Metadata = {
  title: "Visa applications",
  description: "Visa application help for China, India, the USA, Canada, Russia, Morocco and more, from Daily Holidays in Batu Caves, Selangor.",
};
export const revalidate = 3600;

// From Daily Holidays' own visa page. Fees and processing times are left out on purpose: they change.
const COUNTRIES: VisaCountry[] = [
  { name: "China", note: "China issues different visa types depending on the purpose of your visit and your passport." },
  {
    name: "India",
    docs: [
      "Completed application form",
      "3 recent passport photos, 2 × 2 inches, white background",
      "Passport valid for at least 6 months",
      "Confirmed air ticket",
      "Business visa: company letter and an invitation letter from India",
    ],
  },
  {
    name: "USA",
    note: "US visas need an interview appointment at the U.S. Embassy in Kuala Lumpur. We'll help you prepare the documents.",
    docs: ["Document checklist for US visas (we'll send you the current one)", "Visa application fee paid before the interview", "Interview at the U.S. Embassy, Kuala Lumpur"],
  },
  { name: "Canada", docs: ["Document checklist for Canadian visas (we'll send you the current one)"] },
  {
    name: "Russia",
    docs: [
      "Original passport with at least 2 blank visa pages",
      "2 passport photos, signed on the back",
      "Completed and signed application form",
      "Invitation letter from a Russian travel agent, college or university",
    ],
  },
  {
    name: "Morocco",
    docs: [
      "Completed and signed application form",
      "Original passport, valid 6+ months, with a blank visa page",
      "2 passport photos, 2 × 2 inches, white background",
      "Copies of your passport and IC",
      "Tour and flight itinerary",
      "Hotel reservations in your name",
    ],
  },
  { name: "Myanmar" },
  { name: "Nepal" },
  { name: "Sri Lanka" },
];

const STEPS = [
  { icon: MessageCircle, title: "Tell us where and when", body: "Your destination, travel dates and passport. We'll confirm which visa you need." },
  { icon: FileCheck2, title: "Get your checklist", body: "We send the current document list and check your documents before submission." },
  { icon: Stamp, title: "We handle the application", body: "We prepare and submit it, and keep you posted until your visa is ready." },
];

export default async function VisaPage() {
  const images = await getHeroImages();
  const hero = images.find((i) => i.name === "China")?.url ?? images[0]?.url ?? null;

  return (
    <>
      <PageHero
        image={hero}
        eyebrow="Visa applications"
        title="Visas, handled for you"
        subtitle="Tell us where you're going. We'll tell you what you need and take care of the paperwork."
      >
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#enquire" className="glass-sun inline-flex items-center rounded-full px-6 py-3 font-semibold">
            Start a visa enquiry
          </a>
          <a
            href={whatsappLink("Hi Daily Holidays, I need help with a visa.")}
            target="_blank"
            rel="noopener"
            className="glass inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold"
          >
            <WhatsAppIcon className="size-4" /> WhatsApp us
          </a>
        </div>
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        <SectionHeading eyebrow="How it works" title="Three steps to your visa" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 90}>
              <div className="h-full rounded-2xl border border-navy-100 bg-white p-6">
                <span className="flex items-center gap-3">
                  <span className="glass-sun grid size-11 place-items-center rounded-2xl"><s.icon className="size-5" /></span>
                  <span className="text-xs font-semibold tracking-[0.2em] text-navy-400">STEP 0{i + 1}</span>
                </span>
                <h3 className="mt-4 text-lg font-semibold text-navy-900">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-navy-600">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        <SectionHeading eyebrow="Destinations" title="Countries we handle">
          <p className="max-w-sm text-sm text-navy-500">Tap a country for the documents usually needed. Going somewhere else? Ask us.</p>
        </SectionHeading>
        <Reveal>
          <VisaCountries countries={COUNTRIES} />
        </Reveal>
        <Reveal className="mt-6 flex gap-3 rounded-2xl bg-sun-50 p-5 text-sm text-navy-700 ring-1 ring-sun-200">
          <CircleAlert className="size-5 shrink-0 text-sun-600" />
          <p>Visa rules, fees and processing times change often. We&apos;ll confirm the latest requirements for your passport before you apply, so apply in good time before you fly.</p>
        </Reveal>
      </section>

      <section id="enquire" className="mx-auto max-w-3xl scroll-mt-24 px-4 py-24 sm:px-6">
        <Reveal className="rounded-3xl border border-navy-100 bg-white p-6 shadow-sm sm:p-10">
          <h2 className="text-2xl font-bold text-navy-900">Visa enquiry</h2>
          <p className="mb-6 mt-1 text-sm text-navy-500">Tell us your destination, travel dates and how many passports.</p>
          <EnquiryForm defaultMessage="Visa enquiry: destination, travel dates, number of travellers: " />
        </Reveal>
      </section>
    </>
  );
}
