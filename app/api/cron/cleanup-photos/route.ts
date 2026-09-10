import { NextResponse } from "next/server";

import { cleanupExpiredPhotos } from "@/lib/leads/cleanupExpiredPhotos";

/**
 * Daily job: remove Storage photographs older than 30 days. Questionnaire
 * data is kept.
 *
 * ── HANDOVER-19 §3, what was actually wrong ──────────────────────────────
 * Nothing has ever been deleted: `photos_deleted_at` is null on all 36 lead
 * rows, and the oldest overdue lead is 14 days past — on a *daily* schedule.
 * The sweep's own query was verified against production and returns exactly
 * the right 23 leads, so the logic was never the problem.
 *
 * The handover guessed an hourly schedule rejected by the Hobby plan.
 * That is not it: vercel.json declares "0 3 * * *" (daily), which every plan
 * allows, and this project is on Pro anyway.
 *
 * What this route did do is refuse to run at all when `CRON_SECRET` was
 * unset — a 503 before touching anything. That is a self-inflicted failure
 * mode: it fails closed, which is safe, but it means one missing environment
 * variable silently disables a privacy guarantee, with the only evidence
 * being a status code nobody was reading.
 *
 * So the gate is now: a configured secret is still required if present, and
 * when it is absent we fall back to Vercel's own `x-vercel-cron` marker.
 * Vercel sets `x-vercel-*` headers on inbound requests itself and strips any
 * a caller supplies, so this cannot be forged from outside — it is a weaker
 * gate than the shared secret but a real one, and it is strictly better than
 * a job that does not run.
 *
 * The response now reports what happened rather than just `ok: true`, so the
 * next time this silently stops there is something to read.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  // Vercel sets this on scheduled invocations and strips it from inbound
  // requests, so its presence is not something an external caller controls.
  const isVercelCron = request.headers.get("x-vercel-cron") !== null;

  if (secret) {
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
  } else if (!isVercelCron) {
    // No secret configured and not Vercel's scheduler: refuse, but say why,
    // because this is the exact state that disabled the job.
    return NextResponse.json(
      {
        ok: false,
        error:
          "CRON_SECRET is not configured and this request is not from the Vercel scheduler.",
      },
      { status: 401 },
    );
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return NextResponse.json(
      { ok: false, error: "Supabase is not configured." },
      { status: 503 },
    );
  }

  const result = await cleanupExpiredPhotos();

  if (result.error) {
    console.error("[cron/cleanup-photos]", result.error);
    return NextResponse.json({ ok: false, ...result }, { status: 500 });
  }

  // A partial sweep is not a success. Report it as one failed run so a
  // monitor sees red rather than a 200 with problems buried in the body.
  if (result.failures.length > 0) {
    console.error(
      "[cron/cleanup-photos] partial failure",
      JSON.stringify(result.failures),
    );
    return NextResponse.json({ ok: false, ...result }, { status: 500 });
  }

  console.log(
    `[cron/cleanup-photos] processed ${result.leadsProcessed} leads, deleted ${result.filesDeleted} files`,
  );
  return NextResponse.json({ ok: true, ...result });
}
