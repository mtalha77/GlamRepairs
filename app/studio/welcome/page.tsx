import StudioAuthCard from "@/components/studio/StudioAuthCard";
import { acceptWelcomeLinkAction } from "@/lib/studio/actions";
import { welcomeLinkIsLive } from "@/lib/studio/welcomeLinks";

export const dynamic = "force-dynamic";

/**
 * The page a welcome link opens. Opening it spends nothing, so an inbox or
 * WhatsApp link preview cannot use it up; pressing Accept does.
 */
export default async function StudioWelcomePage({ searchParams }: { searchParams: Promise<{ t?: string; r?: string }> }) {
  const params = await searchParams;
  const token = params.t?.trim() ?? "";
  const reset = params.r === "1";
  if (!(await welcomeLinkIsLive(token))) {
    return (
      <StudioAuthCard
        title="This link has been used or has expired"
        description="If you have already set a password, sign in below. Otherwise request a new link."
      >
        <a href="/studio/login" className="block text-center text-sm text-brand-primary hover:underline">
          Go to sign in
        </a>
        <a href="/studio/forgot-password" className="mt-3 block text-center text-sm text-brand-primary hover:underline">
          Send me a new link
        </a>
      </StudioAuthCard>
    );
  }
  return (
    <StudioAuthCard
      title={reset ? "Reset your password" : "Welcome to GlamRepairs"}
      description={reset ? "Press continue, then choose a new password." : "Press accept, then choose your password."}
    >
      <form action={acceptWelcomeLinkAction} className="space-y-4">
        <input type="hidden" name="t" value={token} />
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center rounded-full bg-brand-primary px-5 py-3 text-sm font-medium tracking-[0.08em] text-white"
        >
          {reset ? "Continue and choose a new password" : "Accept and set my password"}
        </button>
      </form>
    </StudioAuthCard>
  );
}
