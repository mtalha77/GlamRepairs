import Link from "next/link";
import ChangePasswordForm from "@/components/studio/ChangePasswordForm";
import { requireStudioMember } from "@/lib/studio/member";

type SettingsPageProps = {
  searchParams: Promise<{ error?: string; saved?: string }>;
};

export default async function StudioSettingsPage({
  searchParams,
}: SettingsPageProps) {
  const { user, member } = await requireStudioMember();
  if (!member || !user) return null;

  const params = await searchParams;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl text-brand-primary">Settings</h1>
        <p className="mt-1 text-sm text-brand-gray">
          Manage your Studio account.
        </p>
      </div>

      <section className="max-w-lg rounded-2xl border border-brand-lavender/70 bg-white p-5">
        <h2 className="font-serif text-xl text-brand-primary">Account</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-[0.08em] text-brand-gray">
              Name
            </dt>
            <dd className="mt-1 text-brand-ink">{member.displayName}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.08em] text-brand-gray">
              Email
            </dt>
            <dd className="mt-1 text-brand-ink">{user.email || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.08em] text-brand-gray">
              Role
            </dt>
            <dd className="mt-1 capitalize text-brand-ink">{member.role}</dd>
          </div>
        </dl>
      </section>

      <section>
        <h2 className="mb-4 font-serif text-xl text-brand-primary">
          Change password
        </h2>
        <ChangePasswordForm
          errorCode={params.error}
          saved={params.saved === "1"}
        />
      </section>

      {member.isSuperAdmin ? (
        <section>
          <h2 className="mb-1 font-serif text-xl text-brand-primary">Pricing</h2>
          {/* HANDOVER-62: one pricing system. Prices are per country now,
              set in Studio → Countries, which also holds the switches that
              decide which countries can be charged at all. */}
          <p className="text-sm text-brand-gray">
            Prices are set per country in{" "}
            <Link href="/studio/countries" className="text-brand-primary underline underline-offset-2">
              Studio → Countries
            </Link>
            . A change takes effect immediately and is logged with who made it.
          </p>
        </section>
      ) : null}
    </div>
  );
}
