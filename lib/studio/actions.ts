"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { sendStudioCustomerEmail } from "@/lib/email/sendStudioCustomerEmail";
import { sendStudioInviteEmail } from "@/lib/email/sendStudioInviteEmail";
import { sendStudioReportEmail } from "@/lib/email/sendStudioReportEmail";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolvePricingRegion, priceForPlan } from "@/lib/pricing/regions";
import { updatePricingRegionPrices } from "@/lib/studio/pricingAdmin";
import { PLAN_OPTIONS, REVIEW_DECISIONS } from "@/lib/studio/constants";
import {
  getStudioCustomer,
  isAbandonedFunnel,
  isCustomerStatus,
  listStudioCustomers,
} from "@/lib/studio/customers";
import {
  bootstrapOwnerIfNeeded,
  listStudioMembers,
  requireStudioMember,
} from "@/lib/studio/member";
import {
  buildReportPatient,
  parseReportContent,
  reportFileName,
} from "@/lib/studio/report";
import { leadDisplayRef } from "@/lib/leads/displayRef";
import {
  deletePhotosForLead,
  isPhotoDeletionReason,
  readPhotoPaths,
} from "@/lib/leads/deleteLeadPhotos";
import { visiblePhotoCount } from "@/lib/studio/customerTypes";
import {
  describeFailures,
  evaluateReport,
  failedChecks,
} from "@/lib/studio/reportQuality";
import { buildSkinReportPdf } from "@/lib/studio/reportPdf";

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "";
}

function asString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function signInAction(formData: FormData) {
  const email = asString(formData, "email");
  const password = asString(formData, "password");
  const nextPath = asString(formData, "next") || "/studio";

  if (!email || !password) {
    redirect("/studio/login?error=missing");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect("/studio/login?error=invalid");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await bootstrapOwnerIfNeeded(user);
  }

  const safeNext =
    nextPath.startsWith("/studio") && !nextPath.startsWith("//")
      ? nextPath
      : "/studio";
  redirect(safeNext);
}

async function findAuthUserByEmail(email: string) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) {
    console.error("[findAuthUserByEmail]", error.message);
    return null;
  }
  return (
    data.users.find((user) => user.email?.toLowerCase() === email) ?? null
  );
}

export async function signUpOwnerAction(formData: FormData) {
  const email = asString(formData, "email").toLowerCase();
  const password = asString(formData, "password");
  const ownerEmail = process.env.STUDIO_OWNER_EMAIL?.trim().toLowerCase();

  if (!email || password.length < 8) {
    redirect("/studio/login?error=missing");
  }

  if (!ownerEmail || email !== ownerEmail) {
    redirect("/studio/login?error=owner-only");
  }

  const admin = createAdminSupabaseClient();
  const { count, error: countError } = await admin
    .from("studio_members")
    .select("user_id", { count: "exact", head: true })
    .eq("role", "owner");

  if (countError) {
    console.error("[signUpOwnerAction]", countError.message);
    redirect("/studio/login?error=schema");
  }

  if ((count ?? 0) > 0) {
    redirect("/studio/login?error=owner-exists");
  }

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  let user = created.data.user;
  if (!user) {
    const existing = await findAuthUserByEmail(email);
    if (!existing) {
      console.error("[signUpOwnerAction]", created.error?.message);
      redirect("/studio/login?error=signup");
    }
    const { data: updated, error: updateError } =
      await admin.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
      });
    if (updateError || !updated.user) {
      console.error("[signUpOwnerAction] update", updateError?.message);
      redirect("/studio/login?error=signup");
    }
    user = updated.user;
  }

  await bootstrapOwnerIfNeeded(user);

  const supabase = await createServerSupabaseClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    console.error("[signUpOwnerAction] sign-in", signInError.message);
    redirect("/studio/login?error=invalid");
  }

  redirect("/studio");
}

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/studio/login");
}

export async function setPasswordAction(formData: FormData) {
  const password = asString(formData, "password");
  const confirm = asString(formData, "confirm");

  if (password.length < 8) {
    redirect("/studio/set-password?error=short");
  }
  if (password !== confirm) {
    redirect("/studio/set-password?error=mismatch");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect("/studio/set-password?error=update");
  }

  redirect("/studio");
}

export async function changeStudioPasswordAction(formData: FormData) {
  const { user, member } = await requireStudioMember();
  if (!user || !member) {
    redirect("/studio/login");
  }

  const currentPassword = asString(formData, "currentPassword");
  const password = asString(formData, "password");
  const confirm = asString(formData, "confirm");

  if (!currentPassword || password.length < 8) {
    redirect("/studio/settings?error=short");
  }
  if (password !== confirm) {
    redirect("/studio/settings?error=mismatch");
  }

  const email = user.email?.trim();
  if (!email) {
    redirect("/studio/settings?error=update");
  }

  const supabase = await createServerSupabaseClient();
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (verifyError) {
    redirect("/studio/settings?error=current");
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error("[changeStudioPasswordAction]", error.message);
    redirect("/studio/settings?error=update");
  }

  revalidatePath("/studio/settings");
  redirect("/studio/settings?saved=1");
}

export async function inviteTeamMemberAction(formData: FormData) {
  const { member } = await requireStudioMember();
  if (!member || member.role !== "owner") {
    redirect("/studio/team?error=forbidden");
  }

  const email = asString(formData, "email").toLowerCase();
  const displayName = asString(formData, "displayName");

  if (!email.includes("@") || !displayName) {
    redirect("/studio/team?error=invalid");
  }

  const admin = createAdminSupabaseClient();
  const appUrl = getAppUrl();
  if (!appUrl) {
    redirect("/studio/team?error=invite");
  }

  let generated = await admin.auth.admin.generateLink({
    type: "invite",
    email,
  });

  if (generated.error || !generated.data.properties?.hashed_token) {
    generated = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
  }

  const hashedToken = generated.data.properties?.hashed_token;
  const invitedUser = generated.data.user;
  if (generated.error || !hashedToken || !invitedUser) {
    console.error(
      "[inviteTeamMemberAction]",
      generated.error?.message ?? "Could not create invite link",
    );
    redirect("/studio/team?error=invite");
  }

  const userId = invitedUser.id;
  const otpType =
    generated.data.properties?.verification_type === "magiclink"
      ? "magiclink"
      : "invite";

  const { data: existingMember } = await admin
    .from("studio_members")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingMember?.role === "owner") {
    redirect("/studio/team?error=owner");
  }

  const { error: memberError } = await admin.from("studio_members").upsert({
    user_id: userId,
    role: "staff",
    display_name: displayName,
  });

  if (memberError) {
    console.error("[inviteTeamMemberAction] member", memberError.message);
    redirect("/studio/team?error=invite");
  }

  const inviteUrl = `${appUrl}/studio/invite?token_hash=${encodeURIComponent(hashedToken)}&type=${otpType}`;
  const emailResult = await sendStudioInviteEmail({
    toEmail: email,
    displayName,
    inviteUrl,
  });

  if (!emailResult.ok) {
    console.error("[inviteTeamMemberAction] email", emailResult.message);
    redirect("/studio/team?error=invite");
  }

  revalidatePath("/studio/team");
  redirect("/studio/team?invited=1");
}

export async function acceptStudioInviteAction(formData: FormData) {
  const tokenHash = asString(formData, "token_hash");
  const type = asString(formData, "type") || "invite";

  if (!tokenHash) {
    redirect("/studio/login?error=expired");
  }

  const otpType =
    type === "magiclink" || type === "recovery" || type === "email"
      ? type
      : "invite";

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.verifyOtp({
    type: otpType,
    token_hash: tokenHash,
  });

  if (error) {
    console.error("[acceptStudioInviteAction]", error.message);
    redirect("/studio/login?error=expired");
  }

  redirect("/studio/set-password");
}

export async function removeTeamMemberAction(formData: FormData) {
  const { member } = await requireStudioMember();
  if (!member || member.role !== "owner") {
    redirect("/studio/team?error=forbidden");
  }

  const userId = asString(formData, "userId");
  if (!userId || userId === member.userId) {
    redirect("/studio/team?error=invalid");
  }

  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("studio_members")
    .delete()
    .eq("user_id", userId)
    .eq("role", "staff");

  if (error) {
    console.error("[removeTeamMemberAction]", error.message);
    redirect("/studio/team?error=remove");
  }

  revalidatePath("/studio/team");
  redirect("/studio/team?removed=1");
}

export async function updateMemberPermissionsAction(formData: FormData) {
  const { member } = await requireStudioMember();
  if (!member || member.role !== "owner") {
    redirect("/studio/team?error=forbidden");
  }

  const userId = asString(formData, "userId");
  if (!userId || userId === member.userId) {
    redirect("/studio/team?error=invalid");
  }

  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("studio_members")
    .update({
      can_verify_payment: formData.get("canVerifyPayment") === "1",
      can_send_report: formData.get("canSendReport") === "1",
    })
    .eq("user_id", userId)
    .eq("role", "staff");

  if (error) {
    console.error("[updateMemberPermissionsAction]", error.message);
    redirect("/studio/team?error=permissions");
  }

  revalidatePath("/studio/team");
  revalidatePath("/studio/customers");
  redirect("/studio/team?permissions=1");
}

export async function createCustomerAction(formData: FormData) {
  const { member } = await requireStudioMember();
  if (!member) {
    redirect("/studio/login");
  }

  const fullName = asString(formData, "fullName");
  const email = asString(formData, "email");
  const planId = asString(formData, "planId");
  const notes = asString(formData, "notes");

  if (!fullName || !email.includes("@")) {
    redirect("/studio/customers/new?error=invalid");
  }

  const plan = PLAN_OPTIONS.find((item) => item.id === planId) ?? null;
  // HOTFIX-7 §1: this business is Pakistan-run, so a manually-added studio
  // customer is priced against the PK region — never a hardcoded number.
  const region = await resolvePricingRegion("PK");
  const planPrice = plan
    ? `${region.symbol}${priceForPlan(region, plan.id).toLocaleString("en-US")}`
    : null;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("leads")
    .insert({
      session_id: `studio_${crypto.randomUUID()}`,
      full_name: fullName,
      email,
      selected_plan: plan?.id ?? null,
      plan_name: plan?.name ?? null,
      plan_price: planPrice,
      pricing_region: plan ? region.code : null,
      currency: plan ? region.currency : null,
      list_price: plan ? priceForPlan(region, plan.id) : null,
      answers: {},
      image_urls: [],
      photo_paths: [],
      status: "new",
      notes: notes || null,
      source: "manual",
      payment_status: "pending",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[createCustomerAction]", error?.message);
    redirect("/studio/customers/new?error=save");
  }

  revalidatePath("/studio/customers");
  if (member.role !== "owner") {
    redirect("/studio/customers?added=1");
  }
  redirect(`/studio/customers/${data.id}`);
}

export async function updateCustomerAction(formData: FormData) {
  const { member } = await requireStudioMember();
  if (!member) {
    redirect("/studio/login");
  }

  const id = asString(formData, "id");
  const status = asString(formData, "status");
  const notes = asString(formData, "notes");

  if (!id || !isCustomerStatus(status)) {
    redirect("/studio/customers");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("leads")
    .update({
      status,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[updateCustomerAction]", error.message);
    redirect(`/studio/customers/${id}?error=save`);
  }

  revalidatePath(`/studio/customers/${id}`);
  revalidatePath("/studio/customers");
  redirect(`/studio/customers/${id}?saved=1`);
}

export async function verifyCustomerPaymentAction(formData: FormData) {
  const { member } = await requireStudioMember();
  if (!member) {
    redirect("/studio/login");
  }

  if (!member.canVerifyPayment) {
    redirect("/studio/customers?error=forbidden");
  }

  const id = asString(formData, "id");
  if (!id) {
    redirect("/studio/customers");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("leads")
    .update({
      payment_status: "verified",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[verifyCustomerPaymentAction]", error.message);
    redirect(`/studio/customers/${id}?error=save`);
  }

  revalidatePath(`/studio/customers/${id}`);
  revalidatePath("/studio/customers");
  redirect(`/studio/customers/${id}?paid=1`);
}

export async function sendCustomerEmailAction(formData: FormData) {
  const { user, member } = await requireStudioMember();
  if (!user || !member) {
    redirect("/studio/login");
  }

  const leadId = asString(formData, "leadId");
  const subject = asString(formData, "subject");
  const body = asString(formData, "body");

  if (!leadId) {
    redirect("/studio/customers");
  }

  const customer = await getStudioCustomer(leadId);
  if (!customer) {
    redirect("/studio/customers");
  }

  const result = await sendStudioCustomerEmail({
    toEmail: customer.email ?? "",
    customerName: customer.fullName,
    subject,
    body,
  });

  if (!result.ok) {
    redirect(
      `/studio/customers/${leadId}?error=email&message=${encodeURIComponent(result.message)}`,
    );
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("studio_emails").insert({
    lead_id: leadId,
    sent_by: user.id,
    to_email: customer.email ?? "",
    subject,
    body,
    resend_id: result.resendId,
  });

  if (error) {
    console.error("[sendCustomerEmailAction] log", error.message);
  }

  await supabase
    .from("leads")
    .update({
      status: "contacted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId)
    .eq("status", "new");

  revalidatePath(`/studio/customers/${leadId}`);
  redirect(`/studio/customers/${leadId}?emailed=1`);
}

export async function assignCustomerAction(formData: FormData) {
  const { member } = await requireStudioMember();
  if (!member || member.role !== "owner") {
    redirect("/studio/customers?error=forbidden");
  }

  const id = asString(formData, "id");
  const assignedTo = asString(formData, "assignedTo");
  if (!id) {
    redirect("/studio/customers");
  }

  let nextAssignedTo: string | null = null;
  if (assignedTo) {
    const members = await listStudioMembers();
    const exists = members.some((item) => item.userId === assignedTo);
    if (!exists) {
      redirect(`/studio/customers/${id}?error=assign`);
    }
    nextAssignedTo = assignedTo;
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("leads")
    .update({
      assigned_to: nextAssignedTo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[assignCustomerAction]", error.message);
    redirect(`/studio/customers/${id}?error=assign`);
  }

  revalidatePath(`/studio/customers/${id}`);
  revalidatePath("/studio/customers");
  redirect(`/studio/customers/${id}?assigned=1`);
}

export async function assignCustomersBulkAction(formData: FormData) {
  const { member } = await requireStudioMember();
  if (!member || member.role !== "owner") {
    redirect("/studio/customers?error=forbidden");
  }

  const ids = formData
    .getAll("ids")
    .filter((value): value is string => typeof value === "string" && value.length > 0);
  const assignedTo = asString(formData, "assignedTo");

  if (ids.length === 0) {
    redirect("/studio/customers");
  }

  let nextAssignedTo: string | null = null;
  if (assignedTo) {
    const members = await listStudioMembers();
    const exists = members.some((item) => item.userId === assignedTo);
    if (!exists) {
      redirect("/studio/customers?error=assign");
    }
    nextAssignedTo = assignedTo;
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("leads")
    .update({
      assigned_to: nextAssignedTo,
      updated_at: new Date().toISOString(),
    })
    .in("id", ids);

  if (error) {
    console.error("[assignCustomersBulkAction]", error.message);
    redirect("/studio/customers?error=assign");
  }

  revalidatePath("/studio/customers");
  redirect("/studio/customers?bulk=1");
}

export async function sendCustomerReportAction(formData: FormData) {
  const { user, member } = await requireStudioMember();
  if (!user || !member) {
    redirect("/studio/login");
  }

  const leadId = asString(formData, "leadId");
  if (!leadId) {
    redirect("/studio/customers");
  }

  const customer = await getStudioCustomer(leadId);
  if (!customer) {
    redirect("/studio/customers");
  }

  if (!member.canSendReport) {
    redirect(
      `/studio/customers/${leadId}?error=report&message=${encodeURIComponent("You do not have permission to send reports. Ask the owner in Team.")}`,
    );
  }

  const toEmail = customer.email?.trim() || "";
  if (!toEmail.includes("@")) {
    redirect(`/studio/customers/${leadId}?error=report&message=${encodeURIComponent("Add an email address first.")}`);
  }

  const content = parseReportContent(formData);
  if (!content) {
    redirect(`/studio/customers/${leadId}?error=report&message=${encodeURIComponent("Fill in all required report fields.")}`);
  }

  /**
   * HANDOVER-16 Part 6 — "Block sending until every box passes."
   *
   * Enforced here, not only in the editor. The checklist in CreateReportForm
   * disables the button; this refuses the request. Same `evaluateReport`, so
   * the two can never disagree about what passes.
   */
  const photosOpened = asString(formData, "photosOpened") === "1";
  const checks = evaluateReport(content, {
    clientFullName: customer.fullName,
    photoCount: visiblePhotoCount(customer),
    photosOpened,
  });
  if (failedChecks(checks).length > 0) {
    redirect(
      `/studio/customers/${leadId}?error=report&message=${encodeURIComponent(describeFailures(checks))}`,
    );
  }

  const patient = buildReportPatient(customer);
  let pdf: Buffer;
  try {
    pdf = await buildSkinReportPdf({
      ...content,
      patient,
      authorName: member.displayName,
      reportRef: leadDisplayRef(customer.sessionId) ?? undefined,
    });
  } catch (error) {
    console.error("[sendCustomerReportAction] pdf", error);
    redirect(
      `/studio/customers/${leadId}?error=report&message=${encodeURIComponent("Could not create the PDF.")}`,
    );
  }
  const fileName = reportFileName(patient.clientName);

  const emailResult = await sendStudioReportEmail({
    toEmail,
    customerName: customer.fullName,
    pdf,
    fileName,
  });

  if (!emailResult.ok) {
    redirect(
      `/studio/customers/${leadId}?error=report&message=${encodeURIComponent(emailResult.message)}`,
    );
  }

  const sentAt = new Date().toISOString();
  const supabase = await createServerSupabaseClient();
  const { error: insertError } = await supabase.from("studio_reports").insert({
    lead_id: leadId,
    created_by: user.id,
    author_name: member.displayName,
    noticed: content.noticed,
    morning_routine: content.morningRoutine,
    night_routine: content.nightRoutine,
    avoid_items: content.avoidItems,
    extra_notes: content.extraNotes || null,
    // Part 2 a/b/d. Stored per row rather than read from the defaults at
    // render time, so an old report always reproduces exactly what was sent
    // even after the default wording changes.
    start_here: content.startHere || null,
    timeline: content.timeline || null,
    good_signs: content.goodSigns || null,
    warning_signs: content.warningSigns || null,
    // The Part 6 attestation. The column already existed for Part 7's
    // authorship signals and was going unwritten; the checklist is exactly
    // the signal it was added for.
    photos_viewed: photosOpened,
    sent_at: sentAt,
    resend_id: emailResult.resendId,
  });

  if (insertError) {
    console.error("[sendCustomerReportAction] insert", insertError.message);
  }

  await supabase.from("studio_emails").insert({
    lead_id: leadId,
    sent_by: user.id,
    to_email: toEmail,
    subject: "Your skin guidance report | GlamRepairs",
    body: "Personalized skin guidance report attached as a PDF.",
    resend_id: emailResult.resendId,
  });

  await supabase
    .from("leads")
    .update({
      status: "contacted",
      updated_at: sentAt,
    })
    .eq("id", leadId)
    .in("status", ["new", "reviewing"]);

  revalidatePath(`/studio/customers/${leadId}`);
  redirect(`/studio/customers/${leadId}?reported=1`);
}

export async function submitCustomerReviewAction(formData: FormData) {
  const { user, member } = await requireStudioMember();
  if (!user || !member) {
    redirect("/studio/login");
  }

  const leadId = asString(formData, "leadId");
  if (!leadId) {
    redirect("/studio/customers");
  }

  const customer = await getStudioCustomer(leadId);
  if (!customer) {
    redirect("/studio/customers");
  }

  if (member.role === "owner") {
    redirect(
      `/studio/customers/${leadId}?error=review&message=${encodeURIComponent("Photo reviews are for assigned team members.")}`,
    );
  }

  const decision = asString(formData, "decision");
  const findings = asString(formData, "findings");
  if (
    !REVIEW_DECISIONS.includes(decision as (typeof REVIEW_DECISIONS)[number]) ||
    !findings
  ) {
    redirect(
      `/studio/customers/${leadId}?error=review&message=${encodeURIComponent("Add a decision and photo review.")}`,
    );
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("studio_reviews").insert({
    lead_id: leadId,
    created_by: user.id,
    author_name: member.displayName,
    decision: decision as (typeof REVIEW_DECISIONS)[number],
    findings,
    noticed: asString(formData, "noticed") || null,
    morning_routine: asString(formData, "morningRoutine") || null,
    night_routine: asString(formData, "nightRoutine") || null,
    avoid_items: asString(formData, "avoidItems") || null,
    extra_notes: asString(formData, "extraNotes") || null,
  });

  if (error) {
    console.error("[submitCustomerReviewAction]", error.message);
    redirect(
      `/studio/customers/${leadId}?error=review&message=${encodeURIComponent("Could not save the review.")}`,
    );
  }

  await supabase
    .from("leads")
    .update({
      status: "reviewing",
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId)
    .eq("status", "new");

  revalidatePath(`/studio/customers/${leadId}`);
  redirect(`/studio/customers/${leadId}?reviewed=1`);
}

export async function sendBroadcastAction(formData: FormData) {
  const { user, member } = await requireStudioMember();
  if (!user || !member) {
    redirect("/studio/login");
  }

  const audiences = formData
    .getAll("audience")
    .filter((value): value is string => typeof value === "string");
  const subject = asString(formData, "subject");
  const body = asString(formData, "body");

  if (audiences.length === 0 || !subject || !body) {
    redirect(
      `/studio/broadcast?error=missing&message=${encodeURIComponent("Pick an audience and write the email.")}`,
    );
  }

  const customers = await listStudioCustomers();
  const targets = customers.filter((customer) => {
    const abandoned = isAbandonedFunnel(customer);
    return audiences.some((audience) => {
      if (audience === "paid") return customer.paymentStatus === "verified";
      if (audience === "pending") {
        return customer.paymentStatus === "pending" && !abandoned;
      }
      if (audience === "abandoned") return abandoned;
      return false;
    });
  });

  const withEmail = targets.filter((customer) => customer.email?.includes("@"));
  if (withEmail.length === 0) {
    redirect(
      `/studio/broadcast?error=empty&message=${encodeURIComponent("No matching customers have an email address.")}`,
    );
  }

  const supabase = await createServerSupabaseClient();
  let sent = 0;
  let failed = 0;

  for (const customer of withEmail.slice(0, 80)) {
    const result = await sendStudioCustomerEmail({
      toEmail: customer.email ?? "",
      customerName: customer.fullName,
      subject,
      body,
    });

    if (!result.ok) {
      failed += 1;
      continue;
    }

    sent += 1;
    await supabase.from("studio_emails").insert({
      lead_id: customer.id,
      sent_by: user.id,
      to_email: customer.email ?? "",
      subject,
      body,
      resend_id: result.resendId,
    });
  }

  revalidatePath("/studio/broadcast");
  redirect(
    `/studio/broadcast?sent=${sent}${failed ? `&failed=${failed}` : ""}`,
  );
}

/**
 * HOTFIX-7 §1 — "changing a price is a database update, not a deploy."
 * Super-admin-only field on /studio/settings so Talha doesn't need the
 * Supabase dashboard for routine price changes.
 */
export async function updatePricingRegionAction(formData: FormData) {
  const { member } = await requireStudioMember();
  if (!member?.isSuperAdmin) {
    redirect("/studio/settings?error=pricing_forbidden");
  }

  const code = asString(formData, "code");
  const clarity = Number(formData.get("clarity"));
  const transform = Number(formData.get("transform"));

  if (
    !code ||
    !Number.isFinite(clarity) ||
    !Number.isFinite(transform) ||
    clarity < 0 ||
    transform < 0
  ) {
    redirect("/studio/settings?error=pricing_invalid");
  }

  try {
    await updatePricingRegionPrices(code, { clarity, transform });
  } catch (error) {
    console.error("[updatePricingRegionAction]", error);
    redirect("/studio/settings?error=pricing_save");
  }

  // Every route that shows a price reads it fresh per-request (see
  // PricingSection.tsx) — these revalidations mostly matter for any
  // response-cache layer in front of Next, not for correctness.
  revalidatePath("/studio/settings");
  revalidatePath("/pricing");
  revalidatePath("/");
  redirect("/studio/settings?saved=pricing");
}

/* ── HANDOVER-19 — deleting photographs, keeping the client ──────────────
 *
 * Three real situations need the images gone but the record kept: the report
 * is finished, the client asked, or it is test data. So this is its own
 * action, separate from archiving a lead and from deleting one.
 *
 * Every path below goes through `deletePhotosForLead`, which deletes the
 * Storage objects first and only writes the row on success. Nothing here
 * touches `photos_deleted_at` directly — a row claiming photographs are gone
 * when they are not is the one failure mode that cannot be noticed later.
 */

/** Shared gate. Deleting a face permanently is not a staff-level action. */
async function requireSuperAdmin(redirectTo: string) {
  const { user, member } = await requireStudioMember();
  if (!user || !member) {
    redirect("/studio/login");
  }
  if (!member.isSuperAdmin) {
    redirect(
      `${redirectTo}?error=forbidden&message=${encodeURIComponent("Only a super admin can delete photographs.")}`,
    );
  }
  return { user, member };
}

function parseDeletionReason(formData: FormData) {
  const raw = asString(formData, "reason");
  if (!isPhotoDeletionReason(raw) || raw === "expired") return null;
  const note = asString(formData, "reasonNote");
  // "other" without a note records nothing useful — the whole point of the
  // reason is that client_request can be evidenced later.
  if (raw === "other" && !note) return null;
  return { reason: raw, note: note || null };
}

export async function deleteLeadPhotosAction(formData: FormData) {
  const leadId = asString(formData, "leadId");
  const back = leadId ? `/studio/customers/${leadId}` : "/studio/customers";
  const { user } = await requireSuperAdmin(back);

  if (!leadId) {
    redirect("/studio/customers");
  }

  const parsed = parseDeletionReason(formData);
  if (!parsed) {
    redirect(
      `${back}?error=photos&message=${encodeURIComponent("Choose a reason for deleting the photographs.")}`,
    );
  }

  // Re-read the paths server-side rather than trusting the form. The count in
  // the confirmation dialog is what the operator agreed to, but the authority
  // on what exists is the row.
  const paths = (await readPhotoPaths([leadId])).get(leadId) ?? [];

  const result = await deletePhotosForLead({
    leadId,
    paths,
    reason: parsed.reason,
    deletedBy: user.id,
    note: parsed.note,
  });

  if (!result.ok) {
    redirect(`${back}?error=photos&message=${encodeURIComponent(result.message)}`);
  }

  revalidatePath(back);
  revalidatePath("/studio/admin/photos");
  redirect(`${back}?photos=deleted&count=${result.filesDeleted}`);
}

/**
 * The bulk path. Clearing 23 overdue leads one at a time is how it does not
 * get done — but each lead still goes through the same single-lead function,
 * so a failure on one does not silently mark the rest.
 */
export async function bulkDeleteLeadPhotosAction(formData: FormData) {
  const back = "/studio/admin/photos";
  const { user } = await requireSuperAdmin(back);

  const leadIds = formData
    .getAll("leadIds")
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  if (leadIds.length === 0) {
    redirect(`${back}?error=photos&message=${encodeURIComponent("Select at least one client.")}`);
  }

  const parsed = parseDeletionReason(formData);
  if (!parsed) {
    redirect(
      `${back}?error=photos&message=${encodeURIComponent("Choose a reason for deleting the photographs.")}`,
    );
  }

  const pathsByLead = await readPhotoPaths(leadIds);
  let deletedLeads = 0;
  let deletedFiles = 0;
  const failures: string[] = [];

  for (const leadId of leadIds) {
    const result = await deletePhotosForLead({
      leadId,
      paths: pathsByLead.get(leadId) ?? [],
      reason: parsed.reason,
      deletedBy: user.id,
      note: parsed.note,
    });
    if (result.ok) {
      deletedLeads += 1;
      deletedFiles += result.filesDeleted;
    } else {
      failures.push(`${leadDisplayRef(leadId) ?? leadId}: ${result.message}`);
    }
  }

  revalidatePath(back);
  revalidatePath("/studio/customers");

  if (failures.length > 0) {
    // Report the partial result honestly — some rows were changed.
    redirect(
      `${back}?error=photos&message=${encodeURIComponent(
        `Deleted ${deletedFiles} photographs for ${deletedLeads} of ${leadIds.length} clients. Failed: ${failures.join(" | ")}`,
      )}`,
    );
  }

  redirect(`${back}?photos=deleted&leads=${deletedLeads}&count=${deletedFiles}`);
}
