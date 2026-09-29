import "server-only";

import { createSign } from "node:crypto";

/**
 * Google Search Console API client — HANDOVER-46 §3.
 *
 * Authenticates as a service account (§3.1): a signed JWT exchanged for a
 * one-hour access token. No OAuth consent screen and no refresh token to
 * expire at 3am. The key lives in `GSC_SERVICE_ACCOUNT_KEY` (the whole JSON
 * file, server-side only; never NEXT_PUBLIC_). The service account must be
 * added in Search Console with Full permission: Restricted cannot read
 * Search Analytics.
 */

/** A domain property, hence the sc-domain: prefix rather than a URL. */
export const GSC_SITE = process.env.GSC_SITE_URL?.trim() || "sc-domain:glamrepairs.com";

const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://searchconsole.googleapis.com";

/** Hard maximum rows per Search Analytics request. */
export const GSC_ROW_LIMIT = 25_000;

type ServiceAccount = { client_email: string; private_key: string };

export function gscConfigured(): boolean {
  return Boolean(process.env.GSC_SERVICE_ACCOUNT_KEY?.trim());
}

function readKey(): ServiceAccount {
  const raw = process.env.GSC_SERVICE_ACCOUNT_KEY?.trim();
  if (!raw) throw new Error("GSC_SERVICE_ACCOUNT_KEY is not set.");
  // Accept the JSON as pasted, or base64 of it (some dashboards mangle
  // newlines in multi-line values; base64 sidesteps that).
  const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  const parsed = JSON.parse(json) as Partial<ServiceAccount>;
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("GSC_SERVICE_ACCOUNT_KEY is missing client_email or private_key.");
  }
  // Keys stored with literal "\n" sequences need real newlines to parse.
  return {
    client_email: parsed.client_email,
    private_key: parsed.private_key.replace(/\\n/g, "\n"),
  };
}

const b64url = (input: Buffer | string) =>
  Buffer.from(input).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

let cached: { token: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (cached && cached.expiresAt - 60_000 > Date.now()) return cached.token;
  const key = readKey();
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({ iss: key.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const assertion = `${header}.${claims}.${b64url(signer.sign(key.private_key))}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!res.ok || !body.access_token) {
    throw new Error(`Google token exchange failed (${res.status}): ${body.error_description ?? "no detail"}`);
  }
  cached = { token: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000 };
  return body.access_token;
}

async function call<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok) {
    const msg = json.error?.message ?? res.statusText;
    // The two errors people actually hit, stated in terms they can act on.
    if (res.status === 403) {
      throw new Error(
        `Search Console refused access (403): ${msg}. Check the service account is added to ` +
          `${GSC_SITE} with Full permission.`,
      );
    }
    throw new Error(`Search Console API ${res.status}: ${msg}`);
  }
  return json;
}

export type GscRow = {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

/**
 * Every row for one dimension set, following `startRow` whenever a page
 * comes back full (§3.3). A small site never needs the second page today;
 * the loop is here so the day it does, nothing is silently truncated.
 */
export async function searchAnalytics(opts: {
  startDate: string;
  endDate: string;
  dimensions: ("date" | "query" | "page")[];
}): Promise<GscRow[]> {
  const url = `${API}/webmasters/v3/sites/${encodeURIComponent(GSC_SITE)}/searchAnalytics/query`;
  const rows: GscRow[] = [];
  for (let startRow = 0; ; startRow += GSC_ROW_LIMIT) {
    const page = await call<{ rows?: GscRow[] }>(url, {
      startDate: opts.startDate,
      endDate: opts.endDate,
      dimensions: opts.dimensions,
      rowLimit: GSC_ROW_LIMIT,
      startRow,
      dataState: "final",
    });
    const got = page.rows ?? [];
    rows.push(...got);
    if (got.length < GSC_ROW_LIMIT) break;
  }
  return rows;
}

export type InspectionResult = {
  verdict: string | null;
  coverageState: string | null;
  robotsTxtState: string | null;
  indexingState: string | null;
  lastCrawlTime: string | null;
};

/** URL Inspection API (§3.5): capped at 2,000 calls a day, 600 a minute. */
export async function inspectUrl(inspectionUrl: string): Promise<InspectionResult> {
  const json = await call<{
    inspectionResult?: {
      indexStatusResult?: {
        verdict?: string;
        coverageState?: string;
        robotsTxtState?: string;
        indexingState?: string;
        lastCrawlTime?: string;
      };
    };
  }>(`${API}/v1/urlInspection/index:inspect`, { inspectionUrl, siteUrl: GSC_SITE });
  const r = json.inspectionResult?.indexStatusResult ?? {};
  return {
    verdict: r.verdict ?? null,
    coverageState: r.coverageState ?? null,
    robotsTxtState: r.robotsTxtState ?? null,
    indexingState: r.indexingState ?? null,
    lastCrawlTime: r.lastCrawlTime ?? null,
  };
}
