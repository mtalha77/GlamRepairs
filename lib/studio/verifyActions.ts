"use server";

import { redirect } from "next/navigation";

import { checkSignInCode, currentStudioSession, rememberDevice, sendSignInCode } from "@/lib/studio/twoFactor";

/** The /studio/verify form: check a code, or send a new one. */

const safe = (next: string) => (next.startsWith("/studio") && !next.startsWith("//") ? next : "/studio");

export async function verifySignInCodeAction(formData: FormData) {
  const next = safe(String(formData.get("next") ?? "/studio"));
  const session = await currentStudioSession();
  if (!session) redirect("/studio/login");
  const res = await checkSignInCode(session, String(formData.get("code") ?? ""));
  if (!res.ok) redirect(`/studio/verify?next=${encodeURIComponent(next)}&error=${encodeURIComponent(res.error)}`);
  await rememberDevice(session.userId);
  redirect(next);
}

export async function resendSignInCodeAction(formData: FormData) {
  const next = safe(String(formData.get("next") ?? "/studio"));
  const session = await currentStudioSession();
  if (!session) redirect("/studio/login");
  const sent = await sendSignInCode(session);
  redirect(`/studio/verify?next=${encodeURIComponent(next)}${sent.ok ? "&sent=1" : `&error=${encodeURIComponent(sent.error)}`}`);
}
