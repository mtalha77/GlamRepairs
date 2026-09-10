import Link from "next/link";

import type { StudioCustomer } from "@/lib/studio/customerTypes";
import { formatStudioDate } from "@/lib/studio/formatDate";

type CustomerTableProps = {
  customers: StudioCustomer[];
  showAssignment?: boolean;
  emptyMessage?: string;
};

export default function CustomerTable({
  customers,
  showAssignment = false,
  emptyMessage = "No customers match this search yet.",
}: CustomerTableProps) {
  if (customers.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-brand-lavender bg-white px-5 py-10 text-center text-sm text-brand-gray">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-brand-lavender/70 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-brand-purple-soft/70 text-xs uppercase tracking-[0.08em] text-brand-gray">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">Payment</th>
              {showAssignment ? (
                <th className="whitespace-nowrap px-4 py-3 font-medium">Assigned</th>
              ) : null}
              <th className="px-4 py-3 font-medium">Added</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr
                key={customer.id}
                className="border-t border-brand-lavender/50 hover:bg-brand-purple-tint"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/studio/customers/${customer.id}`}
                    className="font-medium text-brand-primary hover:underline"
                  >
                    {customer.fullName || "Unnamed"}
                  </Link>
                  {/*
                    HANDOVER-18 §2 — badge the lead when the client wrote
                    something, so it is obvious before opening. This is where
                    a safety flag turns up ("it burns", "it's spreading"), and
                    a note nobody knows exists is a note nobody reads.
                  */}
                  {/*
                    HANDOVER-20 Part 1 — a returning client reads as an
                    opportunity, an accidental resubmit as a problem. Same
                    badge slot, different word and colour, so the list does
                    not flatten the two into "duplicate".
                  */}
                  {(customer.submissionNo ?? 1) > 1 ? (
                    <span
                      title={
                        customer.duplicateReason === "returning_client"
                          ? "This person has been assessed before"
                          : `Submission ${customer.submissionNo}`
                      }
                      className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[0.6875rem] ${
                        customer.duplicateReason === "returning_client"
                          ? "bg-brand-primary/15 text-brand-primary"
                          : "bg-brand-error/10 text-brand-error"
                      }`}
                    >
                      {customer.duplicateReason === "returning_client"
                        ? "Returning"
                        : `#${customer.submissionNo}`}
                    </span>
                  ) : null}
                  {customer.giftCodeUsed ? (
                    <span
                      title={`Arrived via gift code ${customer.giftCodeUsed}`}
                      className="ml-2 inline-flex items-center rounded-full bg-brand-lavender/40 px-2 py-0.5 text-[0.6875rem] text-brand-primary"
                    >
                      Gift
                    </span>
                  ) : null}
                  {customer.clientNotes?.trim() ? (
                    <span
                      title="This client left a note"
                      className="ml-2 inline-flex items-center gap-1 rounded-full bg-brand-accent/15 px-2 py-0.5 text-[0.6875rem] text-brand-accent"
                    >
                      <span aria-hidden>✎</span> Note
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-brand-gray">
                  {customer.email || "—"}
                </td>
                <td className="px-4 py-3 text-brand-ink">
                  {customer.planName || customer.selectedPlan || "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className={
                      customer.paymentStatus === "verified"
                        ? "inline-block whitespace-nowrap rounded-full bg-brand-success/15 px-2.5 py-1 text-xs text-brand-success-strong"
                        : "inline-block whitespace-nowrap rounded-full bg-brand-cream px-2.5 py-1 text-xs text-brand-gray"
                    }
                  >
                    {customer.paymentStatus === "verified" ? "Verified" : "Pending"}
                  </span>
                </td>
                {showAssignment ? (
                  <td className="whitespace-nowrap px-4 py-3 text-brand-gray">
                    {customer.assignedToName ?? "Unassigned"}
                  </td>
                ) : null}
                <td className="px-4 py-3 text-brand-gray">
                  {formatStudioDate(customer.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
