import { NextResponse } from "next/server";

import { runClientEmailJob } from "@/lib/email/clientEmailJob";

/**
 * Hourly: abandonment recovery and the 15/30 day follow-up emails
 * (20 October 2026). See lib/email/clientEmailJob.ts.
 *
 * Called by .github/workflows/client-emails.yml, because Vercel cron does
 * not fire on this project. Every send is claimed or staged before it goes,
 * and the workflow never runs two at once.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const hasSecret = Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
  const isVercelCron = request.headers.get("x-vercel-cron") !== null;
  if (!hasSecret && !isVercelCron) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const run = await runClientEmailJob();
  if (run.errors.length) console.error("[cron/client-emails]", run.errors.join(" | "));
  return NextResponse.json({ ok: run.errors.length === 0, ...run });
}

export const POST = GET;
