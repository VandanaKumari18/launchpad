import { Resend } from "resend";

export function createResendClient() {
  return new Resend(process.env.RESEND_API_KEY);
}

// Resend's free tier can only send from this address until a custom
// domain is verified. Swap once launchpad has its own domain.
export const BRIEF_FROM_ADDRESS = "Launchpad <onboarding@resend.dev>";
