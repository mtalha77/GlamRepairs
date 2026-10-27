"use server";

import { redirect } from "next/navigation";

import { emailClientSignInLink } from "@/lib/clients/signIn";

/** "Email me a sign-in link". Same answer whether or not the address has an account. */
export async function requestClientLinkAction(formData: FormData) {
  await emailClientSignInLink(String(formData.get("email") ?? ""));
  redirect("/account/login?sent=1");
}
