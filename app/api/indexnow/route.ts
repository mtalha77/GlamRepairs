import { NextResponse } from "next/server";

import sitemap from "@/app/sitemap";
import { submitToIndexNow } from "@/lib/seo/indexnow";

/**
 * Submit every URL in the sitemap to IndexNow — HOTFIX-43 §3.2.
 *
 * For the one-off first submission, and for after a bulk change made
 * straight in the database (titles rewritten across the city pages, a batch
 * of posts published by SQL) that no studio action saw. Day to day, the
 * studio publish actions ping the URLs they change on their own.
 *
 * Same bearer secret as the cron routes, so it can be called from the
 * GitHub workflow that already holds it.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const urls = (await sitemap()).map((entry) => entry.url);
  const result = await submitToIndexNow(urls);
  return NextResponse.json({ ...result, total: urls.length }, {
    status: result.ok ? 200 : 502,
  });
}
