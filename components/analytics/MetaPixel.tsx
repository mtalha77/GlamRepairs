"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect } from "react";

import { isMetaTrackingAllowed } from "@/lib/analytics/meta";

/**
 * Meta Pixel (Handover 64 Part 6.4), for the public site and the funnel.
 *
 * Off until NEXT_PUBLIC_META_PIXEL_ID is set, so nothing loads before the
 * account exists. Never on /studio or /test, and never in a test portal
 * session (see isMetaTrackingAllowed). Conversions are also sent from the
 * server through /api/meta/event with the same event id, so Meta counts
 * each one once even when the browser blocks the pixel.
 */
export default function MetaPixel({ id }: { id: string | undefined }) {
  const pathname = usePathname() ?? "";
  const allowed = Boolean(id) && isMetaTrackingAllowed(pathname);

  useEffect(() => {
    if (!allowed) return;
    window.fbq?.("track", "PageView");
  }, [allowed, pathname]);

  if (!allowed) return null;

  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`
        !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
        n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
        document,'script','https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${id}');
      `}
    </Script>
  );
}
