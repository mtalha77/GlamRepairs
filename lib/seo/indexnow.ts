import { SITE, abs } from "@/lib/seo/site";

/**
 * IndexNow — HOTFIX-43 §3.2.
 *
 * Tells Bing, Yandex, Seznam and Naver that a URL changed, instead of waiting
 * for their crawlers to come round. Google does not take part, so this does
 * nothing for Search Console; it is for Bing (which also feeds ChatGPT
 * search and Copilot) and the others.
 *
 * ── Why the key is a constant, not a secret ──────────────────────────────
 * The protocol proves ownership by serving the key publicly at
 * /<key>.txt, and every submission carries it in the clear. It is a claim of
 * ownership, not a credential; putting it in an environment variable would
 * add a way for the key file and the code to disagree and nothing else.
 * Rotate by adding a new file under /public and changing this value.
 */
export const INDEXNOW_KEY = "3b4d2db34c16fc063501e47e82f31c9c";

const ENDPOINT = "https://api.indexnow.org/indexnow";
/** The protocol's per-request ceiling. */
const MAX_URLS = 10_000;

export type IndexNowResult = { ok: boolean; status?: number; submitted: number };

/**
 * Submit URLs (absolute, or site paths). Never throws: a failed ping must not
 * fail the publish that triggered it, so the result is returned and logged.
 */
export async function submitToIndexNow(
  urlsOrPaths: string[],
): Promise<IndexNowResult> {
  const host = new URL(SITE.url).host;
  const urlList = [
    ...new Set(
      urlsOrPaths
        .map((u) => (u.startsWith("http") ? u : abs(u)))
        .filter((u) => new URL(u).host === host),
    ),
  ].slice(0, MAX_URLS);
  if (urlList.length === 0) return { ok: true, submitted: 0 };

  // Only production should claim the domain. Previews and local runs would
  // otherwise announce URLs that do not match what they are serving.
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    return { ok: true, submitted: 0 };
  }

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host,
        key: INDEXNOW_KEY,
        keyLocation: abs(`/${INDEXNOW_KEY}.txt`),
        urlList,
      }),
      cache: "no-store",
    });
    // 200 = accepted, 202 = accepted pending key check. Anything else is
    // worth seeing in the logs (403 key mismatch, 422 host mismatch, 429).
    if (res.status !== 200 && res.status !== 202) {
      console.error("[indexnow]", res.status, await res.text().catch(() => ""));
      return { ok: false, status: res.status, submitted: 0 };
    }
    return { ok: true, status: res.status, submitted: urlList.length };
  } catch (error) {
    console.error("[indexnow]", error);
    return { ok: false, submitted: 0 };
  }
}
