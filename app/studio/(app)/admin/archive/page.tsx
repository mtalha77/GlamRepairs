import { notFound } from "next/navigation";

import ArchivedCustomerRow from "@/components/studio/ArchivedCustomerRow";
import { leadDisplayRef } from "@/lib/leads/displayRef";
import { listArchivedCustomers } from "@/lib/studio/customers";
import { requireStudioMember } from "@/lib/studio/member";

/**
 * HANDOVER-18 §1 — the archive.
 *
 * Permanent deletion is reachable only from here, and only by a super
 * admin. Restricting the entry point is most of the safety: you cannot
 * permanently delete a client you are looking at in the normal working
 * list, so the destructive action is never one mis-click away from routine
 * work.
 */

type ArchivePageProps = {
  searchParams: Promise<{
    restored?: string;
    deleted?: string;
    ref?: string;
    error?: string;
    message?: string;
  }>;
};

export default async function ArchivePage({ searchParams }: ArchivePageProps) {
  const { member } = await requireStudioMember();
  if (!member?.isSuperAdmin) {
    notFound();
  }

  const query = await searchParams;
  const customers = await listArchivedCustomers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-brand-primary">Archive</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-gray">
          Clients hidden from every list. Nothing here has been destroyed —
          the photographs, assessments and reports are all intact, and
          restoring puts the client back exactly as they were.
        </p>
      </div>

      {query.restored ? (
        <p className="rounded-2xl border border-brand-primary/30 bg-brand-lavender/20 px-4 py-3 text-sm text-brand-ink">
          Client restored.
        </p>
      ) : null}
      {query.deleted ? (
        <p className="rounded-2xl border border-brand-primary/30 bg-brand-lavender/20 px-4 py-3 text-sm text-brand-ink">
          {query.ref ?? "The client"} was permanently deleted, photographs
          first.
        </p>
      ) : null}
      {query.error ? (
        <p className="rounded-2xl border border-brand-error/30 bg-brand-error/5 px-4 py-3 text-sm text-brand-ink">
          {query.message ?? "Something went wrong."}
        </p>
      ) : null}

      {customers.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-brand-lavender bg-white px-4 py-8 text-center text-sm text-brand-gray">
          Nothing archived.
        </p>
      ) : (
        <ul className="space-y-3">
          {customers.map((customer) => (
            <ArchivedCustomerRow
              key={customer.id}
              leadId={customer.id}
              displayRef={leadDisplayRef(customer.sessionId) ?? customer.id}
              fullName={customer.fullName}
              email={customer.email}
              deletedAt={customer.deletedAt}
              deletionReason={customer.deletionReason}
              photoCount={customer.photoPaths?.length ?? 0}
              isTest={customer.isTest}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
