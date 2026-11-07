"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { useFunnelStore } from "@/lib/funnel/useFunnelStore";

/**
 * Handover 70 §1.6: `?test=1` on any funnel link marks this browser's
 * session as the team's own, so checking a practitioner card or the funnel
 * never adds a client to the studio. Sent with every save; the row is
 * is_test from its first write. One way: there is no `?test=0`.
 */
export default function MarkTestFromQuery() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const setMarkTest = useFunnelStore((state) => state.setMarkTest);

  useEffect(() => {
    if (searchParams.get("test") !== "1") return;
    setMarkTest();
    const params = new URLSearchParams(searchParams.toString());
    params.delete("test");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [searchParams, pathname, router, setMarkTest]);

  return null;
}
