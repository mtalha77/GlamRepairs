import { type NextRequest } from "next/server";

import { updateStudioSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateStudioSession(request);
}

export const config = {
  // /account: clients' sessions refresh here too (HANDOVER-60). Only
  // /studio paths are ever redirected by updateStudioSession.
  matcher: ["/studio", "/studio/:path*", "/account", "/account/:path*"],
};
