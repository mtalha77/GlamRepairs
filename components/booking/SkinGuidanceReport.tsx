"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  avoidItems,
  monitoringNote,
  morningRoutine,
  nightRoutine,
  reportNoticedItems,
  reportPatient,
  reportPhotos,
} from "@/components/booking/skinGuidanceReportData";
import FunnelStepGuard from "@/components/funnel/FunnelStepGuard";
import { BOOKING_REPORT_UNLOCK } from "@/lib/funnel/funnelProgress";
import { useFunnelStore } from "@/lib/funnel/useFunnelStore";
import { buildWhatsAppBookingSummaryLink } from "@/lib/funnel/whatsapp";

const reportLogo = "/svgs/GLAM REPAIR LOGO-08 2 (1).svg";

const SKIN_TYPE_LABELS: Record<string, string> = {
  dry: "Dry skin",
  normal: "Normal skin",
  oily: "Oily skin",
  combination: "Combination skin",
};

const ADDITIONAL_CONCERN_LABELS: Record<string, string> = {
  dryness: "Dryness",
  oiliness: "Oiliness",
  textural: "Textural concerns",
  "puffy-eyes": "Puffy eyes",
  "crows-feet": "Crow's feet",
  "double-chin": "Double chin",
  "dark-circles": "Dark circles",
  "sagging-skin": "Sagging skin",
};

const GENDER_LABELS: Record<string, string> = {
  female: "Female",
  male: "Male",
  "prefer-not-to-say": "Prefer not to say",
};

const PLAN_LABELS: Record<string, string> = {
  free: "Free Plan",
  clarity: "Clarity Plan",
  transform: "Transform Plan",
};

function formatReportDate(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

function useReportPatient() {
  const answers = useFunnelStore((state) => state.answers);
  const fullName = useFunnelStore((state) => state.fullName);
  const selectedPlan = useFunnelStore((state) => state.selectedPlan);

  const get = (key: string) =>
    typeof answers[key] === "string" ? (answers[key] as string) : "";

  const concerns = Array.isArray(answers["booking.additionalConcerns"])
    ? (answers["booking.additionalConcerns"] as string[])
    : [];
  const concernLabel =
    concerns
      .map((value) => ADDITIONAL_CONCERN_LABELS[value])
      .filter(Boolean)
      .slice(0, 2)
      .join(", ") ||
    SKIN_TYPE_LABELS[get("booking.skinType")] ||
    reportPatient.concern;

  const age = get("onboarding.age");
  const gender = get("onboarding.gender");

  return {
    clientName: fullName.trim() || get("booking.name") || reportPatient.clientName,
    gender: GENDER_LABELS[gender] ?? reportPatient.gender,
    concern: concernLabel,
    age: age ? `${age} years` : reportPatient.age,
    plan: (selectedPlan && PLAN_LABELS[selectedPlan]) || reportPatient.plan,
    duration: reportPatient.duration,
    reportDate: formatReportDate(new Date()),
    location: get("booking.location") || reportPatient.location,
  };
}

function ReportSection({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <h2 className="font-serif text-xl leading-snug text-brand-primary sm:text-[1.375rem]">
        {title}
      </h2>
      <div className="mt-3 rounded-2xl bg-brand-purple-soft/70 px-4 py-4 sm:mt-4 sm:px-5 sm:py-5">
        {children}
      </div>
    </section>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-brand-gray sm:text-xs">{label}</p>
      <p className="mt-0.5 text-sm leading-snug text-brand-ink sm:text-[0.9375rem]">
        {value}
      </p>
    </div>
  );
}

function NoticeCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-brand-lavender/50 bg-white p-3.5 shadow-sm sm:p-4">
      <span className="flex h-8 w-8 items-center justify-center sm:h-9 sm:w-9">
        <Image
          src={icon}
          alt=""
          width={36}
          height={36}
          className="h-7 w-auto object-contain sm:h-8"
        />
      </span>
      <h3 className="mt-2.5 text-sm font-semibold text-brand-primary sm:text-[0.9375rem]">
        {title}
      </h3>
      <p className="mt-1.5 text-xs leading-relaxed text-brand-gray sm:text-[0.8125rem]">
        {description}
      </p>
    </div>
  );
}

function RoutineCard({ week, text }: { week: string; text: string }) {
  return (
    <div className="rounded-2xl border border-brand-lavender/50 bg-white px-4 py-3.5 shadow-sm sm:px-5 sm:py-4">
      <p className="font-serif text-sm text-brand-primary sm:text-[0.9375rem]">
        {week}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-brand-gray sm:mt-2 sm:text-[0.8125rem]">
        {text}
      </p>
    </div>
  );
}

function AvoidList() {
  return (
    <ul className="space-y-2.5 sm:space-y-3">
      {avoidItems.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-sm text-brand-ink sm:text-[0.9375rem]">
          <span
            aria-hidden
            className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-brand-error"
          >
            <svg viewBox="0 0 12 12" className="h-3.5 w-3.5" fill="none">
              <path
                d="M3 3L9 9M9 3L3 9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function SkinGuidanceReport() {
  const patient = useReportPatient();
  const answers = useFunnelStore((state) => state.answers);
  const fullName = useFunnelStore((state) => state.fullName);
  const email = useFunnelStore((state) => state.email);
  const sessionId = useFunnelStore((state) => state.sessionId);
  const selfie = useFunnelStore(
    (state) => state.answers["booking.selfie"] as string | undefined,
  );
  const photos = selfie ? [selfie, reportPhotos[1]] : [...reportPhotos];

  const premiumWhatsAppHref = buildWhatsAppBookingSummaryLink({
    answers,
    fullName,
    email,
    sessionId,
    intro:
      "Hi Glam Repair! I finished the free skin quiz and want to upgrade to a Premium plan.",
  });

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-brand-purple-soft via-white to-brand-lavender/20 px-4 py-8 sm:px-6 sm:py-10">
      <FunnelStepGuard flow="booking" step={BOOKING_REPORT_UNLOCK} />
      <article className="mx-auto w-full max-w-[40rem] rounded-[2rem] border border-brand-lavender/60 bg-white px-5 py-7 shadow-sm sm:px-8 sm:py-9">
        <header className="text-center">
          <Image
            src={reportLogo}
            alt="Glam Repairs"
            width={121}
            height={45}
            priority
            unoptimized
            className="mx-auto h-10 w-auto sm:h-11"
          />
          <h1 className="mt-4 font-serif text-[1.625rem] leading-tight text-brand-ink sm:text-[1.875rem]">
            Skin Guidance Report
          </h1>
        </header>

        <section className="mt-8 sm:mt-9">
          <h2 className="text-sm font-semibold text-brand-ink sm:text-[0.9375rem]">
            1. Patient information:
          </h2>
          <p className="mt-3 text-sm font-semibold text-brand-primary sm:text-[0.9375rem]">
            Demographics:
          </p>

          <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3 sm:gap-x-8 sm:gap-y-4">
            <InfoField label="Client Name" value={patient.clientName} />
            <InfoField label="Gender" value={patient.gender} />
            <InfoField label="Concern" value={patient.concern} />
            <InfoField label="Age" value={patient.age} />
            <InfoField label="Plan" value={patient.plan} />
            <InfoField label="Duration" value={patient.duration} />
            <InfoField label="Report Date" value={patient.reportDate} />
            <InfoField label="Location" value={patient.location} />
          </div>

          <div className="mt-5 flex justify-start gap-3 sm:mt-6 sm:gap-4">
            {photos.map((photo, index) => (
              <div
                key={index}
                className="relative aspect-[4/5] w-[6.75rem] overflow-hidden rounded-2xl bg-brand-surface sm:w-[7.75rem]"
              >
                <Image
                  src={photo}
                  alt={index === 0 ? "Before skin photo" : "After skin photo"}
                  fill
                  unoptimized
                  sizes="124px"
                  className="object-cover object-center"
                />
              </div>
            ))}
          </div>
        </section>

        <ReportSection title="Weather climate consideration" className="mt-8 sm:mt-9">
          <div className="rounded-2xl border border-brand-lavender/50 bg-white px-4 py-4 text-center shadow-sm sm:px-5 sm:py-5">
            <p className="text-sm text-brand-ink sm:text-[0.9375rem]">
              {patient.location}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-5 sm:gap-4">
            <div className="rounded-2xl border border-brand-lavender/50 bg-white px-3 py-4 text-center shadow-sm sm:px-4">
              <Image
                src="/svgs/Sun_Allergy.svg"
                alt=""
                width={40}
                height={40}
                className="mx-auto h-9 w-auto object-contain"
              />
              <p className="mt-2 text-xs text-brand-gray sm:text-[0.8125rem]">
                Dry Climate
              </p>
              <p className="mt-1 text-lg font-medium text-brand-ink">12</p>
            </div>
            <div className="rounded-2xl border border-brand-lavender/50 bg-white px-3 py-4 text-center shadow-sm sm:px-4">
              <Image
                src="/svgs/Group (6).svg"
                alt=""
                width={40}
                height={40}
                className="mx-auto h-9 w-auto object-contain"
              />
              <p className="mt-2 text-xs text-brand-gray sm:text-[0.8125rem]">
                Humid Climate
              </p>
              <p className="mt-1 text-lg font-medium text-brand-ink">7%</p>
            </div>
          </div>
        </ReportSection>

        <ReportSection title="What we noticed" className="mt-8 sm:mt-9">
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            {reportNoticedItems.map((item) => (
              <NoticeCard key={item.title} {...item} />
            ))}
          </div>
        </ReportSection>

        <ReportSection title="Morning Routine" className="mt-8 sm:mt-9">
          <div className="space-y-3 sm:space-y-3.5">
            {morningRoutine.map((item, index) => (
              <RoutineCard key={`${item.week}-${index}`} {...item} />
            ))}
          </div>
        </ReportSection>

        <ReportSection title="Night Routine" className="mt-8 sm:mt-9">
          <div className="space-y-3 sm:space-y-3.5">
            {nightRoutine.map((item, index) => (
              <RoutineCard key={`${item.week}-${index}`} {...item} />
            ))}
          </div>
        </ReportSection>

        <section className="mt-8 sm:mt-9">
          <h2 className="font-serif text-xl leading-snug text-brand-primary sm:text-[1.375rem]">
            What to avoid
          </h2>
          <div className="mt-3 rounded-2xl border border-brand-lavender/50 bg-white px-4 py-4 shadow-sm sm:mt-4 sm:px-5 sm:py-5">
            <h3 className="text-sm font-semibold text-brand-primary sm:text-[0.9375rem]">
              Avoid These During Your Treatment
            </h3>
            <div className="mt-3 sm:mt-4">
              <AvoidList />
            </div>
          </div>
        </section>

        <ReportSection title="What we noticed" className="mt-8 sm:mt-9">
          <NoticeCard {...monitoringNote} />
        </ReportSection>

        <section className="mt-8 rounded-2xl bg-brand-cream/70 px-4 py-5 sm:mt-9 sm:px-5 sm:py-6">
          <h2 className="font-serif text-xl leading-snug text-brand-primary sm:text-[1.375rem]">
            Ready for a deeper routine?
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-brand-gray sm:mt-3 sm:text-[0.8125rem]">
            Upgrade for a manual expert review, personalized AM + PM routine, and
            a written skin assessment — we&apos;ll send your quiz answers ahead
            on WhatsApp.
          </p>
          <div className="mt-4 flex flex-col items-stretch gap-3 sm:mt-5 sm:flex-row sm:items-center sm:justify-end">
            <a
              href={premiumWhatsAppHref}
              target="_blank"
              rel="noopener noreferrer"
              className="subscribe-fill-btn inline-flex items-center justify-center rounded-full bg-brand-primary px-8 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white transition-opacity hover:opacity-90 sm:px-10 sm:text-sm"
            >
              Get Premium
            </a>
          </div>
        </section>

        <div className="mt-8 flex justify-center sm:mt-9">
          <Link
            href="/"
            className="rounded-full bg-brand-light px-8 py-3 text-xs uppercase tracking-[0.14em] text-white transition-opacity hover:opacity-90 sm:px-10 sm:text-sm"
          >
            Back to Home
          </Link>
        </div>
      </article>
    </div>
  );
}
