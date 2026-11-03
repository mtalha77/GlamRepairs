import type { Metadata } from "next";

import ForgotPasswordForm from "@/components/studio/ForgotPasswordForm";
import StudioAuthCard from "@/components/studio/StudioAuthCard";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false, follow: false } };

export default function StudioForgotPasswordPage() {
  return (
    <StudioAuthCard title="Forgot your password?" description="Enter the email you sign in with and we will send you a link to choose a new one.">
      <ForgotPasswordForm />
    </StudioAuthCard>
  );
}
