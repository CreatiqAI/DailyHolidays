import type { Metadata } from "next";
import { CircleAlert, HeartPulse, Luggage, PlaneTakeoff, ShieldCheck, TimerReset } from "lucide-react";
import { getHeroImages } from "@/lib/queries";
import { whatsappLink } from "@/lib/site";
import { EnquiryForm } from "@/components/site/enquiry-form";
import { PageHero } from "@/components/site/page-hero";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";
import { WhatsAppIcon } from "@/components/site/icons";

export const metadata: Metadata = {
  title: "Travel insurance",
  description: "Travel insurance from AIG, Chubb and RHB, arranged with your tour or flight by Daily Holidays in Batu Caves, Selangor.",
};
export const revalidate = 3600;

// Providers listed on Daily Holidays' own site.
const PROVIDERS = [
  { name: "AIG", body: "Travel insurance plans from AIG." },
  { name: "Chubb", body: "Travel insurance plans from Chubb." },
  { name: "RHB", body: "Travel insurance plans from RHB." },
];

// Kept general on purpose: what's covered, limits and exclusions depend on the plan.
const COVER = [
  { icon: HeartPulse, title: "Medical care abroad", body: "Help with medical costs if you fall ill or get hurt while travelling." },
  { icon: TimerReset, title: "Cancelled or cut-short trips", body: "Cover for trips that have to be cancelled or cut short for covered reasons." },
  { icon: Luggage, title: "Baggage & belongings", body: "Cover for lost, stolen or delayed baggage and personal items." },
  { icon: PlaneTakeoff, title: "Travel delays", body: "Support when flights or connections are delayed." },
];

export default async function TravelInsurancePage() {
  const images = await getHeroImages();
  const hero = images.find((i) => i.name === "New Zealand")?.url ?? images[0]?.url ?? null;

  return (
    <>
      <PageHero
        image={hero}
        eyebrow="Travel insurance"
        title="Travel with cover"
        subtitle="Insurance arranged together with your tour or flight, from providers you know."
      >
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#enquire" className="glass-sun inline-flex items-center rounded-full px-6 py-3 font-semibold">
            Get a quote
          </a>
          <a
            href={whatsappLink("Hi Daily Holidays, I'd like travel insurance for my trip.")}
            target="_blank"
            rel="noopener"
            className="glass inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold"
          >
            <WhatsAppIcon className="size-4" /> WhatsApp us
          </a>
        </div>
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        <SectionHeading eyebrow="Our providers" title="Plans from trusted insurers" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {PROVIDERS.map((p, i) => (
            <Reveal key={p.name} delay={i * 90}>
              <div className="flex h-full items-center gap-4 rounded-2xl border border-navy-100 bg-white p-6">
                <span className={`grid size-14 shrink-0 place-items-center rounded-2xl bg-navy-900 font-[family-name:var(--font-display)] font-bold text-white ${p.name.length > 3 ? "text-sm" : "text-lg"}`}>
                  {p.name}
                </span>
                <span>
                  <span className="block text-lg font-semibold text-navy-900">{p.name} Travel Insurance</span>
                  <span className="block text-sm text-navy-500">{p.body}</span>
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        <SectionHeading eyebrow="Why insure" title="What travel insurance can help with">
          <p className="max-w-sm text-sm text-navy-500">Every plan is different. We&apos;ll explain what each one covers before you choose.</p>
        </SectionHeading>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {COVER.map((c, i) => (
            <Reveal key={c.title} delay={i * 80}>
              <div className="h-full rounded-2xl border border-navy-100 bg-white p-6">
                <span className="grid size-11 place-items-center rounded-2xl bg-navy-50 text-navy-700"><c.icon className="size-5" /></span>
                <h3 className="mt-4 font-semibold text-navy-900">{c.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-navy-600">{c.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-6 flex gap-3 rounded-2xl bg-sun-50 p-5 text-sm text-navy-700 ring-1 ring-sun-200">
          <CircleAlert className="size-5 shrink-0 text-sun-600" />
          <p>What&apos;s covered, the limits and the exclusions depend on the plan and insurer. Please read the policy wording; we&apos;re happy to go through it with you.</p>
        </Reveal>
      </section>

      <section id="enquire" className="mx-auto max-w-3xl scroll-mt-24 px-4 py-24 sm:px-6">
        <Reveal className="rounded-3xl border border-navy-100 bg-white p-6 shadow-sm sm:p-10">
          <span className="glass-sun mb-4 grid size-12 place-items-center rounded-2xl"><ShieldCheck className="size-6" /></span>
          <h2 className="text-2xl font-bold text-navy-900">Get an insurance quote</h2>
          <p className="mb-6 mt-1 text-sm text-navy-500">Tell us where you&apos;re going, your travel dates and how many travellers.</p>
          <EnquiryForm defaultMessage="Travel insurance quote: destination, travel dates, number of travellers: " />
        </Reveal>
      </section>
    </>
  );
}
