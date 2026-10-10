import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

const PUBLIC_STUDIO_PATHS = [
  "/studio/login",
  "/studio/auth/callback",
  "/studio/invite",
];

/** Read by the studio layout to keep a practitioner's seat on her own pages. */
export const STUDIO_PATH_HEADER = "x-studio-path";

export async function updateStudioSession(request: NextRequest) {
  // Always overwritten here, so a client cannot supply its own.
  request.headers.set(STUDIO_PATH_HEADER, request.nextUrl.pathname);
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
        if (headers) {
          Object.entries(headers).forEach(([key, value]) => {
            supabaseResponse.headers.set(key, value);
          });
        }
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  const pathname = request.nextUrl.pathname;
  const isPublicStudioPath = PUBLIC_STUDIO_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (!user && pathname.startsWith("/studio") && !isPublicStudioPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/studio/login";
    url.search = "";
    if (pathname !== "/studio") {
      url.searchParams.set("next", pathname);
    }
    return copySessionCookies(NextResponse.redirect(url), supabaseResponse);
  }

  if (user && pathname === "/studio/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/studio";
    url.search = "";
    return copySessionCookies(NextResponse.redirect(url), supabaseResponse);
  }

  return supabaseResponse;
}

function copySessionCookies(target: NextResponse, source: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie.name, cookie.value);
  });
  return target;
}
