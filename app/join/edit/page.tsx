import type { Metadata } from "next";

import JoinForm from "@/components/join/JoinForm";
import { OPEN_STATUSES } from "@/lib/practitioners/applications";
import { REVISION_FIELDS, verifyApplicationEdit } from "@/lib/practitioners/join";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Reopen an application after "request changes" — HANDOVER-52 §4.2.
 * Reached only through the signed link in the email.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Update your application",
  robots: { index: false, follow: false },
};

export default async function JoinEditPage({ searchParams }: { searchParams: Promise<{ a?: string; s?: string }> }) {
  const { a, s } = await searchParams;
  const valid = Boolean(a && s && verifyApplicationEdit(a, s));
  const admin = createAdminSupabaseClient();
  const { data: app } = valid
    ? await admin.from("practitioner_applications").select("*").eq("id", a!).is("deleted_at", null).maybeSingle()
    : { data: null };
  const { data: request } = app
    ? await admin
        .from("practitioner_revision_requests")
        .select("message, fields")
        .eq("application_id", app.id)
        .is("resolved_at", null)
        .order("requested_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };
  const open = app && OPEN_STATUSES.includes(app.status);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-brand-accent">Practitioners</p>
      <h1 className="mt-2 font-serif text-3xl text-brand-primary sm:text-4xl">Update your application</h1>

      {!app || !open ? (
        <p className="mt-8 rounded-2xl border border-brand-lavender/70 bg-white p-5 text-sm text-brand-ink">
          {app ? "This application has already been decided, so it can no longer be changed." : "This link is not valid."}
        </p>
      ) : (
        <>
          {request ? (
            <div className="mt-6 rounded-2xl border-2 border-amber-400 bg-amber-50 p-5 text-sm leading-relaxed text-brand-ink">
              <p className="font-medium">What we asked for</p>
              <p className="mt-1 whitespace-pre-line">{request.message}</p>
              {request.fields.length ? (
                <p className="mt-2 text-amber-900">
                  Highlighted below: {request.fields.map((f) => REVISION_FIELDS[f] ?? f).join(", ")}.
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="mt-8">
            <JoinForm
              mode="edit"
              applicationId={app.id}
              editKey={s!}
              email={app.email}
              kind={app.kind}
              flagged={request?.fields ?? []}
              initial={{
                fullName: app.full_name,
                phone: app.phone ?? "",
                city: app.city ?? "",
                qualification: app.qualification,
                years: app.years_experience != null ? String(app.years_experience) : "",
                clinics: app.clinics ?? "",
                about: app.about,
                portfolioUrl: app.portfolio_url ?? "",
                regBody: app.reg_body ?? "",
                regNo: app.reg_no ?? "",
              }}
            />
          </div>
        </>
      )}
    </main>
  );
}
