"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect } from "react";

/**
 * Google Analytics (gtag.js) for the public site only.
 *
 * The studio is internal: staff sessions there are not traffic and would
 * inflate page views and dilute the funnel numbers the ad spend is judged
 * on. On /studio the tag is never rendered, so a session that starts there
 * never loads Google at all.
 *
 * The `ga-disable-<ID>` flag covers the one case not rendering cannot: a
 * client-side navigation from the site into the studio after gtag has
 * already loaded, where GA's history listener would otherwise record the
 * studio page view.
 *
 * ⚠️ Still the only Google tag on the site. Do not add a second one: a
 * duplicate double-counts every session.
 */
const isInternal = (pathname: string) => pathname === "/studio" || pathname.startsWith("/studio/");

export default function GoogleTag({ id }: { id: string }) {
  const internal = isInternal(usePathname() ?? "");

  useEffect(() => {
    (window as unknown as Record<string, boolean>)[`ga-disable-${id}`] = internal;
  }, [id, internal]);

  if (internal) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${id}');
        `}
      </Script>
    </>
  );
}
