import { NextResponse } from "next/server";

import { getClientLead, viewablePhotoPaths } from "@/lib/clients/portal";
import { currentClientAccount } from "@/lib/clients/signIn";
import { createSignedPhotoUrl } from "@/lib/leads/signedPhotoUrl";

/**
 * One of the signed-in client's own photographs, by position. A short
 * signed URL on the storage domain, only for a photo scanned clean and not
 * yet past its 30 days. 404 for anything else, including other people's.
 */
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const index = Number(n);
  const account = await currentClientAccount();
  if (!account?.lead_id || !Number.isInteger(index) || index < 0) return new Response("Not found", { status: 404 });
  const lead = await getClientLead(account.lead_id);
  if (!lead) return new Response("Not found", { status: 404 });
  const path = (await viewablePhotoPaths(lead))[index];
  if (!path) return new Response("Not found", { status: 404 });
  const signed = await createSignedPhotoUrl(path, 300);
  if (!signed) return new Response("Not found", { status: 404 });
  return NextResponse.redirect(signed, 302);
}
