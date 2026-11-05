import { NextResponse } from "next/server";

import { runOutreachQueue } from "@/lib/outreach/queue";

/**
 * Hourly: the outreach send queue (Handover 68 §4.3). Called by
 * .github/workflows/outreach.yml, because Vercel cron does not fire on this
 * project. Every send is claimed before it goes, and the workflow never
 * runs two at once, so a repeated run cannot send a step twice.
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
  const run = await runOutreachQueue();
  if (run.errors.length) console.error("[cron/outreach]", run.errors.join(" | "));
  return NextResponse.json({ ok: run.errors.length === 0, ...run });
}

export const POST = GET;
