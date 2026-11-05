import { NextResponse, type NextRequest } from "next/server";

import { outreachDb } from "@/lib/outreach/config";
import { verifyUnsubscribeToken } from "@/lib/outreach/render";
import { suppressAddress } from "@/lib/outreach/suppress";

export const dynamic = "force-dynamic";

/**
 * POST only (Handover 68 §5.3). Mail clients send the RFC 8058 one-click
 * request here from the List-Unsubscribe header; the unsubscribe page's
 * button posts here too. A GET never unsubscribes anyone, because link
 * scanners open links on their own.
 */
export async function POST(request: NextRequest) {
  const contactId = request.nextUrl.searchParams.get("c") ?? "";
  const token = request.nextUrl.searchParams.get("t");
  if (!verifyUnsubscribeToken(contactId, token)) return NextResponse.json({ ok: false }, { status: 400 });

  const { data: contact } = await outreachDb().from("outreach_contacts").select("email").eq("id", contactId).maybeSingle();
  if (contact?.email) await suppressAddress({ email: contact.email, reason: "unsubscribed", note: "Unsubscribe link" });

  const fromPage = request.nextUrl.searchParams.get("from") === "page";
  if (fromPage) return NextResponse.redirect(new URL(`/outreach/unsubscribe?done=1`, request.url), 303);
  return NextResponse.json({ ok: true });
}
