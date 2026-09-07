"use client";

import { useState } from "react";
import Link from "next/link";

import { formInputClassName } from "@/components/ui/fieldStyles";
import { assignCustomersBulkAction } from "@/lib/studio/actions";
import { isAbandonedFunnel } from "@/lib/studio/customerTypes";
import { leadDisplayRef } from "@/lib/leads/displayRef";
import type { StudioCustomer } from "@/lib/studio/customerTypes";
import { formatStudioDate } from "@/lib/studio/formatDate";

type TeamOption = {
  userId: string;
  role: "owner" | "staff";
  displayName: string;
};

type CustomerListProps = {
  customers: StudioCustomer[];
  showAssignment?: boolean;
  canAssign?: boolean;
  members?: TeamOption[];
  emptyMessage?: string;
};

export default function CustomerList({
  customers,
  showAssignment = false,
  canAssign = false,
  members = [],
  emptyMessage = "No customers match this search yet.",
}: CustomerListProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const team = members.filter((member) => member.role === "staff");
  const allIds = customers.map((customer) => customer.id);
  const allSelected = allIds.length > 0 && selected.length === allIds.length;

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  if (customers.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-brand-lavender bg-white px-5 py-10 text-center text-sm text-brand-gray">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {canAssign ? (
        <form
          action={assignCustomersBulkAction}
          className="flex flex-col gap-3 rounded-2xl border border-brand-lavender/70 bg-white p-4 sm:flex-row sm:items-center"
        >
          {selected.map((id) => (
            <input key={id} type="hidden" name="ids" value={id} />
          ))}
          <p className="flex-1 text-sm text-brand-gray">
            {selected.length} selected
          </p>
          <select
            name="assignedTo"
            disabled={selected.length === 0}
            className={`${formInputClassName} sm:w-52`}
            defaultValue=""
          >
            <option value="">Unassigned</option>
            {team.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.displayName}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={selected.length === 0}
            className="rounded-full bg-brand-primary px-5 py-2.5 text-sm text-white disabled:opacity-60"
          >
            Assign selected
          </button>
        </form>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-brand-lavender/70 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-brand-purple-soft/70 text-xs uppercase tracking-[0.08em] text-brand-gray">
              <tr>
                {canAssign ? (
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      aria-label="Select all customers"
                      onChange={() =>
                        setSelected(allSelected ? [] : allIds)
                      }
                    />
                  </th>
                ) : null}
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">
                  Payment
                </th>
                {showAssignment ? (
                  <th className="whitespace-nowrap px-4 py-3 font-medium">
                    Assigned
                  </th>
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
                  {canAssign ? (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.includes(customer.id)}
                        aria-label={`Select ${customer.fullName || "customer"}`}
                        onChange={() => toggle(customer.id)}
                      />
                    </td>
                  ) : null}
                  <td className="px-4 py-3">
                    <Link
                      href={`/studio/customers/${customer.id}`}
                      className="font-medium text-brand-primary hover:underline"
                    >
                      {customer.fullName || "Unnamed"}
                    </Link>
                    {isAbandonedFunnel(customer) ? (
                      <span className="ml-2 inline-block rounded-full bg-brand-cream px-2 py-0.5 text-[11px] text-brand-gray">
                        Left funnel
                      </span>
                    ) : null}
                    {/* HANDOVER-9 §1 — the reference the client is told to
                        put in their bank transfer note. Reconciliation is
                        guesswork without it visible next to the name. */}
                    {leadDisplayRef(customer.sessionId) ? (
                      <span className="mt-0.5 block font-mono text-[11px] text-brand-gray">
                        {leadDisplayRef(customer.sessionId)}
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
                      {customer.paymentStatus === "verified"
                        ? "Verified"
                        : "Pending"}
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
    </div>
  );
}
