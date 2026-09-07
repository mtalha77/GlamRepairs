import ChangePasswordForm from "@/components/studio/ChangePasswordForm";
import PricingRegionsForm from "@/components/studio/PricingRegionsForm";
import { listActivePricingRegions } from "@/lib/pricing/regions";
import { requireStudioMember } from "@/lib/studio/member";

const PRICING_ERROR_COPY: Record<string, string> = {
  pricing_forbidden: "Only a super admin can change pricing.",
  pricing_invalid: "Enter a valid, non-negative price for both plans.",
  pricing_save: "Could not save that price. Try again.",
};

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
          <h2 className="mb-1 font-serif text-xl text-brand-primary">
            Regional pricing
          </h2>
          <p className="mb-4 text-sm text-brand-gray">
            Prices are fixed per region and never FX-converted — changing one
            here takes effect immediately, no deploy needed.
          </p>
          {params.error && PRICING_ERROR_COPY[params.error] ? (
            <p
              role="alert"
              className="mb-4 rounded-xl bg-brand-error/10 px-4 py-3 text-sm text-brand-error-strong"
            >
              {PRICING_ERROR_COPY[params.error]}
            </p>
          ) : null}
          {params.saved === "pricing" ? (
            <p className="mb-4 rounded-xl bg-brand-success/15 px-4 py-3 text-sm text-brand-success-strong">
              Pricing updated.
            </p>
          ) : null}
          <PricingRegionsForm regions={await listActivePricingRegions()} />
        </section>
      ) : null}
    </div>
  );
}
