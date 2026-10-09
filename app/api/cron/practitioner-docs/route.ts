import { NextResponse } from "next/server";

import { DOCS_BUCKET } from "@/lib/practitioners/applications";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Purge rejected applicants' documents — HANDOVER-51 §2.3. Daily.
 *
 * reject_practitioner_application() sets purge_after 30 days out. This
 * removes the Storage object first and marks the row deleted only once the
 * file is gone, so a failure leaves the row pointing at a file that still
 * exists (and is retried tomorrow), never the reverse.
 *
 * Called by .github/workflows/practitioner-docs.yml; same gate as the
 * other cron routes.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const hasSecret = Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
  const isVercelCron = request.headers.get("x-vercel-cron") !== null;
  if (!hasSecret && !isVercelCron) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  const { data: due, error } = await admin
    .from("practitioner_documents")
    .select("id, storage_path")
    .lt("purge_after", new Date().toISOString())
    .is("deleted_at", null)
    .not("application_id", "is", null)
    .limit(200);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!due?.length) return NextResponse.json({ ok: true, purged: 0 });

  const { error: removeError } = await admin.storage.from(DOCS_BUCKET).remove(due.map((d) => d.storage_path));
  if (removeError) {
    console.error("[cron/practitioner-docs]", removeError.message);
    return NextResponse.json({ ok: false, error: removeError.message, purged: 0 }, { status: 500 });
  }

  const { error: markError } = await admin
    .from("practitioner_documents")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", due.map((d) => d.id));
  if (markError) return NextResponse.json({ ok: false, error: markError.message, purged: due.length }, { status: 500 });

  return NextResponse.json({ ok: true, purged: due.length });
}

export const POST = GET;
