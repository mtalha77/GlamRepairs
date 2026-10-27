import "server-only";

import { createHmac } from "node:crypto";

import type { Inspection } from "@/lib/uploads/inspect";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * upload_scans and upload_attempts. HANDOVER-59 Parts 3.1 and 3.2.
 *
 * Every file that reaches storage gets a scan row, and the studio shows a
 * file only when that row says clean (see isCleanUpload). A rejected file is
 * removed from storage before its row is written, so nobody can open it.
 */

/** The IP, keyed and hashed. Never stored raw (Part 3.2). */
export function hashIp(request: Request): string | null {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "";
  if (!ip) return null;
  const key = process.env.APPLICATION_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return createHmac("sha256", key).update(`upload-ip:${ip}`).digest("hex").slice(0, 32);
}

/** Over 20 files or 100 MB in the last hour, by IP hash or lead. Fails open. */
export async function uploadRateExceeded(ipHash: string | null, leadId: string | null = null): Promise<boolean> {
  if (!ipHash && !leadId) return false;
  const { data, error } = await createAdminSupabaseClient().rpc("upload_rate_exceeded", {
    p_ip_hash: ipHash,
    p_lead: leadId,
  });
  if (error) {
    // A broken rate limiter must not stop a paying client submitting.
    console.error("[uploadRateExceeded]", error.message);
    return false;
  }
  return Boolean(data);
}

export async function recordUploadAttempt(row: {
  ipHash: string | null;
  leadId?: string | null;
  applicationId?: string | null;
  bucket: string;
  bytes: number;
  accepted: boolean;
  reason?: string | null;
}) {
  const { error } = await createAdminSupabaseClient().from("upload_attempts").insert({
    ip_hash: row.ipHash,
    lead_id: row.leadId ?? null,
    application_id: row.applicationId ?? null,
    bucket: row.bucket,
    bytes: row.bytes,
    accepted: row.accepted,
    reason: row.reason ?? null,
  });
  if (error) console.error("[recordUploadAttempt]", error.message);
}

export async function recordScan(input: {
  bucket: string;
  path: string;
  declaredMime: string | null;
  inspection: Inspection;
  leadId?: string | null;
  applicationId?: string | null;
  practitionerId?: string | null;
  /** The file was removed from storage (a rejection). */
  removed?: boolean;
  phash?: string | null;
  skinRatio?: number | null;
}) {
  const i = input.inspection;
  const now = new Date().toISOString();
  const { error } = await createAdminSupabaseClient().from("upload_scans").insert({
    bucket: input.bucket,
    storage_path: input.path,
    lead_id: input.leadId ?? null,
    application_id: input.applicationId ?? null,
    practitioner_id: input.practitionerId ?? null,
    declared_mime: input.declaredMime || "unknown",
    detected_mime: i.detectedMime,
    // The table requires a positive size; an empty file is recorded as 1
    // byte with empty_file named as the reason.
    bytes: Math.max(1, i.bytes),
    sha256: i.sha256,
    width: i.width,
    height: i.height,
    status: i.status,
    failed_checks: i.failedChecks,
    detail: i.detail,
    scanned_at: now,
    deleted_at: input.removed ? now : null,
    phash: input.phash && /^[a-f0-9]{16}$/.test(input.phash) ? input.phash : null,
    skin_ratio:
      typeof input.skinRatio === "number" && input.skinRatio >= 0 && input.skinRatio <= 1 ? input.skinRatio : null,
  });
  if (error) console.error("[recordScan]", input.path, error.message);
}

/** Latest scan status per path, for the studio's "show only clean" rule. */
export async function scanStatuses(bucket: string, paths: string[]): Promise<Map<string, Inspection["status"] | "pending" | "suspicious" | "quarantined">> {
  const out = new Map<string, Inspection["status"] | "pending" | "suspicious" | "quarantined">();
  if (!paths.length) return out;
  const { data } = await createAdminSupabaseClient()
    .from("upload_scans")
    .select("storage_path, status, created_at")
    .eq("bucket", bucket)
    .in("storage_path", paths)
    .order("created_at", { ascending: true });
  for (const row of data ?? []) out.set(row.storage_path, row.status);
  return out;
}

/**
 * Part 3.1: nothing is shown until it is clean. Read from safe_uploads, the
 * view that only ever contains clean, undeleted files, never from storage.
 */
export async function cleanPaths(bucket: string, paths: string[]): Promise<Set<string>> {
  if (!paths.length) return new Set();
  const { data, error } = await createAdminSupabaseClient()
    .from("safe_uploads")
    .select("storage_path")
    .eq("bucket", bucket)
    .in("storage_path", paths);
  if (error) console.error("[cleanPaths]", error.message);
  return new Set((data ?? []).map((r) => r.storage_path));
}
