import { notFound } from "next/navigation";

import AssignCustomerForm from "@/components/studio/AssignCustomerForm";
import AnswerList from "@/components/studio/AnswerList";
import ComposeEmailForm from "@/components/studio/ComposeEmailForm";
import CreateReportForm from "@/components/studio/CreateReportForm";
import CustomerStatusForm from "@/components/studio/CustomerStatusForm";
import EmailHistory from "@/components/studio/EmailHistory";
import PhotoGallery from "@/components/studio/PhotoGallery";
import ReportHistory from "@/components/studio/ReportHistory";
import ReviewForm from "@/components/studio/ReviewForm";
import ReviewList from "@/components/studio/ReviewList";
import VerifyPaymentButton from "@/components/studio/VerifyPaymentButton";
import { formatBookingWhatsAppMessage } from "@/lib/funnel/formatBookingSummary";
import { formatCustomerAnswers } from "@/lib/studio/answers";
import { CUSTOMER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/studio/constants";
import { getStudioCustomer } from "@/lib/studio/customers";
import { listCustomerEmails } from "@/lib/studio/emails";
import { formatStudioDateTime } from "@/lib/studio/formatDate";
import { listStudioMembers, requireStudioMember } from "@/lib/studio/member";
import { listCustomerReports } from "@/lib/studio/reports";
import {
  listCustomerReviews,
  reviewToReportDefaults,
} from "@/lib/studio/reviews";

type CustomerDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    saved?: string;
    emailed?: string;
    paid?: string;
    assigned?: string;
    reported?: string;
    reviewed?: string;
    sender?: string;
    error?: string;
    message?: string;
  }>;
};

export default async function CustomerDetailPage({
  params,
  searchParams,
}: CustomerDetailPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const [{ member }, customer] = await Promise.all([
    requireStudioMember(),
    getStudioCustomer(id),
  ]);

  if (!customer || !member) {
    notFound();
  }

  const isOwner = member.role === "owner";
  const canSendReport = member.canSendReport;
  const [answers, emails, reports, reviews, members] = await Promise.all([
    Promise.resolve(formatCustomerAnswers(customer.answers)),
    listCustomerEmails(customer.id),
    listCustomerReports(customer.id),
    listCustomerReviews(customer.id),
    isOwner ? listStudioMembers() : Promise.resolve([]),
  ]);
  const reportDefaults = reviewToReportDefaults(reviews[0] ?? null);
  const whatsappSummary = formatBookingWhatsAppMessage({
    answers: customer.answers,
    fullName: customer.fullName ?? undefined,
    email: customer.email ?? undefined,
    sessionId: customer.sessionId,
    selectedPlan: customer.selectedPlan,
    planName: customer.planName,
    planPrice: customer.planPrice,
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-brand-accent">
          {customer.source === "manual" ? "Added in Studio" : "Funnel lead"}
        </p>
        <h1 className="mt-1 font-serif text-3xl text-brand-primary">
          {customer.fullName || "Unnamed customer"}
        </h1>
        <p className="mt-1 text-sm text-brand-gray">
          {customer.email || "No email"} ·{" "}
          {customer.planName || customer.selectedPlan || "No plan"} ·{" "}
          {CUSTOMER_STATUS_LABELS[customer.status]} ·{" "}
          {PAYMENT_STATUS_LABELS[customer.paymentStatus]}
          {customer.assignedToName ? ` · Assigned to ${customer.assignedToName}` : " · Unassigned"}
          {" · Added "}
          {formatStudioDateTime(customer.createdAt)}
        </p>
      </div>

      {query.saved ? (
        <p className="rounded-xl bg-brand-success/15 px-4 py-3 text-sm text-brand-success-strong">
          Customer details saved.
        </p>
      ) : null}
      {query.paid ? (
        <p className="rounded-xl bg-brand-success/15 px-4 py-3 text-sm text-brand-success-strong">
          Payment verified.
        </p>
      ) : null}
      {query.assigned ? (
        <p className="rounded-xl bg-brand-success/15 px-4 py-3 text-sm text-brand-success-strong">
          Customer assignment saved.
        </p>
      ) : null}
      {query.reported ? (
        <p className="rounded-xl bg-brand-success/15 px-4 py-3 text-sm text-brand-success-strong">
          PDF report emailed to the customer.
        </p>
      ) : null}
      {query.reviewed ? (
        <p className="rounded-xl bg-brand-success/15 px-4 py-3 text-sm text-brand-success-strong">
          Photo review sent to the owner.
        </p>
      ) : null}
      {query.emailed ? (
        <p className="rounded-xl bg-brand-success/15 px-4 py-3 text-sm text-brand-success-strong">
          Email sent.
        </p>
      ) : null}
      {query.error === "report" ? (
        <p className="rounded-xl bg-brand-error/10 px-4 py-3 text-sm text-brand-error-strong">
          {query.message || "Could not send the PDF report."}
        </p>
      ) : null}
      {query.error === "email" ? (
        <p className="rounded-xl bg-brand-error/10 px-4 py-3 text-sm text-brand-error-strong">
          {query.message || "Could not send email."}
        </p>
      ) : null}
      {query.error === "assign" ? (
        <p className="rounded-xl bg-brand-error/10 px-4 py-3 text-sm text-brand-error-strong">
          Could not assign this customer.
        </p>
      ) : null}
      {query.error === "review" ? (
        <p className="rounded-xl bg-brand-error/10 px-4 py-3 text-sm text-brand-error-strong">
          {query.message || "Could not save the photo review."}
        </p>
      ) : null}
      {query.error === "save" ? (
        <p className="rounded-xl bg-brand-error/10 px-4 py-3 text-sm text-brand-error-strong">
          Could not save customer details.
        </p>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <div>
            <h2 className="mb-3 font-serif text-xl text-brand-primary">Photos</h2>
            <PhotoGallery customer={customer} />
          </div>
          <div>
            <h2 className="mb-3 font-serif text-xl text-brand-primary">
              Quiz answers
            </h2>
            <AnswerList answers={answers} whatsappSummary={whatsappSummary} />
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-2xl border border-brand-lavender/70 bg-white p-5">
            <h2 className="mb-4 font-serif text-xl text-brand-primary">
              Payment
            </h2>
            <VerifyPaymentButton
              customerId={customer.id}
              paymentStatus={customer.paymentStatus}
              canVerify={member.canVerifyPayment}
            />
          </div>
          <div className="rounded-2xl border border-brand-lavender/70 bg-white p-5">
            <h2 className="mb-4 font-serif text-xl text-brand-primary">Status</h2>
            <CustomerStatusForm
              customerId={customer.id}
              status={customer.status}
              notes={customer.notes ?? ""}
            />
          </div>
          {isOwner ? (
            <div className="rounded-2xl border border-brand-lavender/70 bg-white p-5">
              <h2 className="mb-4 font-serif text-xl text-brand-primary">
                Assign to team
              </h2>
              <AssignCustomerForm
                customerId={customer.id}
                assignedTo={customer.assignedTo}
                members={members}
              />
            </div>
          ) : null}
        </div>
      </section>

      {isOwner ? (
        <section>
          <h2 className="mb-4 font-serif text-xl text-brand-primary">
            Team reviews
          </h2>
          <ReviewList reviews={reviews} />
        </section>
      ) : (
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-brand-lavender/70 bg-white p-5">
            <h2 className="mb-4 font-serif text-xl text-brand-primary">
              Photo review for owner
            </h2>
            <ReviewForm leadId={customer.id} />
          </div>
          <div>
            <h2 className="mb-4 font-serif text-xl text-brand-primary">
              Your reviews
            </h2>
            <ReviewList reviews={reviews} />
          </div>
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-brand-lavender/70 bg-white p-5">
          <h2 className="mb-4 font-serif text-xl text-brand-primary">
            Skin report PDF
          </h2>
          {canSendReport ? (
            <CreateReportForm
              key={reviews[0]?.id ?? "no-review"}
              leadId={customer.id}
              toEmail={customer.email ?? ""}
              defaults={reportDefaults}
            />
          ) : (
            <p className="text-sm text-brand-gray">
              You do not have permission to send reports. Ask the owner to
              enable it in Team.
            </p>
          )}
        </div>
        <div>
          <h2 className="mb-4 font-serif text-xl text-brand-primary">
            Sent reports
          </h2>
          <ReportHistory reports={reports} customerId={customer.id} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-brand-lavender/70 bg-white p-5">
          <h2 className="mb-4 font-serif text-xl text-brand-primary">
            Email customer
          </h2>
          <ComposeEmailForm
            leadId={customer.id}
            toEmail={customer.email ?? ""}
            customerName={customer.fullName ?? ""}
          />
        </div>
        <div>
          <h2 className="mb-4 font-serif text-xl text-brand-primary">
            Sent emails
          </h2>
          <EmailHistory emails={emails} />
        </div>
      </section>
    </div>
  );
}
