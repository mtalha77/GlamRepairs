import { NextResponse } from "next/server";

import { signInWithClientToken } from "@/lib/clients/signIn";

/**
 * The link in a client's email lands here. A valid one opens a session
 * (creating the auth user on first use) and goes to /account; anything
 * else goes to the sign-in page saying why. HANDOVER-60 Part 7.3.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("t") ?? "";
  const outcome = await signInWithClientToken(token);
  const target = new URL(outcome.ok ? "/account" : `/account/login?e=${outcome.reason}`, url.origin);
  return NextResponse.redirect(target, 303);
}
