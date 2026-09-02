import type { MetadataRoute } from "next";
import { SITE, abs } from "@/lib/seo/site";

/**
 * robots.txt
 *
 * Two jobs:
 *
 * 1. Keep crawlers out of the studio, the API and the private photo-pack
 *    routes. `/p/` serves client assessment photographs — it must never be
 *    indexed. (Note: robots.txt is a crawl directive, not access control.
 *    The bucket itself still needs locking down separately.)
 *
 * 2. Explicitly admit AI crawlers. This is the cheap half of getting cited in
 *    AI Overviews, ChatGPT and Perplexity — if these agents are blocked, no
 *    amount of content quality will get you quoted. They are listed by name
 *    because some of them ignore wildcard `User-agent: *` allowances.
 */
const PRIVATE_PATHS = ["/studio/", "/api/", "/p/", "/preview"];

const AI_CRAWLERS = [
  "GPTBot", // OpenAI — training + browsing
  "OAI-SearchBot", // OpenAI — ChatGPT search index
  "ChatGPT-User", // OpenAI — user-initiated fetches
  "PerplexityBot",
  "ClaudeBot",
  "Claude-User",
  "Google-Extended", // Gemini / AI Overviews grounding
  "Applebot-Extended",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: PRIVATE_PATHS,
      })),
    ],
    sitemap: abs("/sitemap.xml"),
    host: SITE.url,
  };
}
