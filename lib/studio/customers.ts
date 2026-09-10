import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  CustomerSource,
  CustomerStatus,
  PaymentStatus,
} from "@/lib/supabase/database.types";
import { CUSTOMER_STATUSES } from "@/lib/studio/constants";
import type { StudioCustomer } from "@/lib/studio/customerTypes";
import { listStudioMembers } from "@/lib/studio/member";

export type { StudioCustomer } from "@/lib/studio/customerTypes";
export {
  canSendCustomerReport,
  canVerifyCustomerPayment,
  isAbandonedFunnel,
} from "@/lib/studio/customerTypes";

const CUSTOMER_COLUMNS =
  "id, session_id, full_name, email, selected_plan, plan_name, plan_price, answers, image_urls, photo_paths, photos_expire_at, photos_deleted_at, photos_deletion_reason, status, notes, client_notes, deleted_at, deleted_by, deletion_reason, source, payment_status, assigned_to, report_sender_id, funnel_complete, funnel_step, is_test, test_reason, created_at, updated_at";

function mapCustomer(
  row: {
    id: string;
    session_id: string;
    full_name: string | null;
    email: string | null;
    selected_plan: string | null;
    plan_name: string | null;
    plan_price: string | null;
    answers: Record<string, unknown>;
    image_urls: string[];
    photo_paths: string[];
    photos_expire_at: string | null;
    photos_deleted_at: string | null;
    photos_deletion_reason: string | null;
    status: CustomerStatus;
    notes: string | null;
    client_notes: string | null;
    deleted_at: string | null;
    deleted_by: string | null;
    deletion_reason: string | null;
    source: CustomerSource;
    payment_status: PaymentStatus;
    assigned_to: string | null;
    report_sender_id: string | null;
    funnel_complete: boolean | null | undefined;
    funnel_step: number | null | undefined;
    is_test: boolean | null | undefined;
    test_reason: string | null;
    created_at: string;
    updated_at: string;
  },
  memberNames: Map<string, string>,
): StudioCustomer {
  return {
    id: row.id,
    sessionId: row.session_id,
    fullName: row.full_name,
    email: row.email,
    selectedPlan: row.selected_plan,
    planName: row.plan_name,
    planPrice: row.plan_price,
    answers: row.answers ?? {},
    imageUrls: row.image_urls ?? [],
    photoPaths: row.photo_paths ?? [],
    photosExpireAt: row.photos_expire_at,
    photosDeletedAt: row.photos_deleted_at,
    photosDeletionReason: row.photos_deletion_reason,
    status: row.status,
    notes: row.notes,
    clientNotes: row.client_notes,
    deletedAt: row.deleted_at,
    deletedBy: row.deleted_by,
    deletionReason: row.deletion_reason,
    source: row.source,
    paymentStatus: row.payment_status ?? "pending",
    assignedTo: row.assigned_to,
    assignedToName: row.assigned_to
      ? (memberNames.get(row.assigned_to) ?? "Team member")
      : null,
    reportSenderId: row.report_sender_id,
    reportSenderName: row.report_sender_id
      ? (memberNames.get(row.report_sender_id) ?? "Team member")
      : null,
    funnelComplete: row.funnel_complete !== false,
    funnelStep: row.funnel_step ?? null,
    isTest: Boolean(row.is_test),
    testReason: row.test_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getMemberNameMap() {
  const members = await listStudioMembers();
  return new Map(members.map((member) => [member.userId, member.displayName]));
}

export function isCustomerStatus(value: string): value is CustomerStatus {
  return (CUSTOMER_STATUSES as readonly string[]).includes(value);
}

export type CustomerListFilters = {
  search?: string;
  plan?: string;
  payment?: string;
  assigned?: string;
  funnel?: string;
  /**
   * Test leads are hidden by default — all 32 leads seeded before is_test
   * shipped are internal/test data, and the first real customer would
   * otherwise arrive buried under them. Pass true to show them for
   * debugging (the "Show test entries" toggle).
   */
  showTest?: boolean;
};

function isPaymentStatus(value: string): value is PaymentStatus {
  return value === "pending" || value === "verified";
}

export async function listStudioCustomers(filters: CustomerListFilters = {}) {
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("leads")
    .select(CUSTOMER_COLUMNS)
    .order("created_at", { ascending: false });

  const term = filters.search?.trim();
  if (term) {
    // HANDOVER-9 §1 — searching a bank transfer note. When the term looks
    // like a client reference (GR-8DDFA7) match it against session_id
    // instead of the name/email/plan columns, because that is what the
    // reference is derived from (lib/leads/displayRef.ts).
    //
    // Caveat, deliberately not worked around: for funnel leads the session
    // id is a plain UUID so the six hex characters are a true prefix and
    // this matches exactly. Studio-created leads (`studio_<uuid>`) and the
    // rare `sess_<ts>_<rand>` fallback derive their reference after
    // stripping non-hex characters, so they will not be found this way —
    // neither of those is a lead that pays by bank transfer.
    const refMatch = /^gr-?([0-9a-f]{6})$/i.exec(term);
    if (refMatch) {
      query = query.ilike("session_id", `${refMatch[1].toLowerCase()}%`);
    } else {
      const escaped = term.replaceAll(/[,()%_\\]/g, " ").trim();
      if (escaped) {
        query = query.or(
          `full_name.ilike.%${escaped}%,email.ilike.%${escaped}%,plan_name.ilike.%${escaped}%`,
        );
      }
    }
  }

  const planId = filters.plan?.trim().toLowerCase();
  if (planId === "free" || planId === "clarity" || planId === "transform") {
    query = query.eq("selected_plan", planId);
  }

  const payment = filters.payment?.trim().toLowerCase();
  if (payment && isPaymentStatus(payment)) {
    query = query.eq("payment_status", payment);
  }

  const assigned = filters.assigned?.trim();
  if (assigned === "unassigned") {
    query = query.is("assigned_to", null);
  } else if (assigned) {
    query = query.eq("assigned_to", assigned);
  }

  const funnel = filters.funnel?.trim().toLowerCase();
  if (funnel === "abandoned") {
    query = query.eq("source", "funnel").or(
      "funnel_complete.eq.false,selected_plan.is.null",
    );
  }

  if (!filters.showTest) {
    query = query.eq("is_test", false);
  }

  const [{ data, error }, memberNames] = await Promise.all([
    query,
    getMemberNameMap(),
  ]);
  if (error) {
    console.error("[listStudioCustomers]", error.message);
    return [];
  }

  return (data ?? []).map((row) => mapCustomer(row, memberNames));
}

export async function getStudioCustomer(id: string) {
  const supabase = await createServerSupabaseClient();
  const [{ data, error }, memberNames] = await Promise.all([
    supabase.from("leads").select(CUSTOMER_COLUMNS).eq("id", id).maybeSingle(),
    getMemberNameMap(),
  ]);

  if (error) {
    console.error("[getStudioCustomer]", error.message);
    return null;
  }

  return data ? mapCustomer(data, memberNames) : null;
}

export async function getStudioOverviewCounts() {
  const supabase = await createServerSupabaseClient();

  // Dashboard headline metrics always exclude test leads — no toggle here,
  // unlike the customer list. All 32 leads seeded before is_test shipped are
  // internal/test data.
  const [all, newest, photos, team] = await Promise.all([
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("is_test", false),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("status", "new")
      .eq("is_test", false),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .not("photos_expire_at", "is", null)
      .is("photos_deleted_at", null)
      .eq("is_test", false),
    supabase.from("studio_members").select("user_id", { count: "exact", head: true }),
  ]);

  return {
    customers: all.count ?? 0,
    newLeads: newest.count ?? 0,
    photosAvailable: photos.count ?? 0,
    teamSize: team.count ?? 0,
  };
}
