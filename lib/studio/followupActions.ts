"use server";

import { revalidatePath } from "next/cache";

import { canManageClients, requireStudioMember } from "@/lib/studio/member";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/** Studio → Follow-ups: record the WhatsApp, and close a check-in. Owner and super admins. */

type Result = { ok: true } | { ok: false; error: string };

async function guard() {
  const { user, member } = await requireStudioMember();
  if (!user || !canManageClients(member)) return null;
  return user.id;
}

export async function markFollowupWhatsApp(id: string): Promise<Result> {
  const by = await guard();
  if (!by) return { ok: false, error: "Not allowed." };
  const { error } = await createAdminSupabaseClient()
    .from("client_followups")
    .update({ whatsapp_sent_at: new Date().toISOString(), whatsapp_sent_by: by })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/studio/followups");
  return { ok: true };
}

export async function closeFollowup(input: { id: string; status: "done" | "skipped"; notes: string }): Promise<Result> {
  const by = await guard();
  if (!by) return { ok: false, error: "Not allowed." };
  const { error } = await createAdminSupabaseClient()
    .from("client_followups")
    .update({
      status: input.status,
      completed_by: by,
      completed_at: new Date().toISOString(),
      notes: input.notes.trim().slice(0, 1000) || null,
    })
    .eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/studio/followups");
  return { ok: true };
}
