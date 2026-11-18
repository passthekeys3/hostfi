/**
 * Sign-up and sign-in outcomes. Supabase returns success with no session in
 * two different cases, and the form has to tell them apart.
 */

export type SignupOutcome =
  | { kind: "signed-in" }
  | { kind: "confirm-email" }
  | { kind: "already-registered" }
  | { kind: "error"; message: string };

export function signupOutcome(input: {
  errorMessage?: string | null;
  identities?: unknown[] | null;
  hasSession: boolean;
  hasUser: boolean;
}): SignupOutcome {
  if (input.errorMessage) {
    if (/already registered|already been registered|already exists/i.test(input.errorMessage)) {
      return { kind: "already-registered" };
    }
    return { kind: "error", message: input.errorMessage };
  }
  if (!input.hasUser) {
    return { kind: "error", message: "Sign-up did not return an account. Try again." };
  }
  // Enumeration protection: an existing email comes back as a user with no identities and no session.
  if (Array.isArray(input.identities) && input.identities.length === 0) {
    return { kind: "already-registered" };
  }
  if (!input.hasSession) {
    return { kind: "confirm-email" };
  }
  return { kind: "signed-in" };
}

export function loginErrorMessage(message: string): string {
  if (/email not confirmed/i.test(message)) {
    return "Confirm your email before signing in. The confirmation link is in your inbox.";
  }
  if (/invalid login credentials/i.test(message)) {
    return "That email and password don't match an account. Use the password for the existing account, or reset it.";
  }
  return message;
}

export function onboardingAuthDecision(input: {
  isProduction: boolean;
  isService: boolean;
  type: string;
  requestedUserId: string;
  callerUserId: string | null;
}): { ok: true } | { ok: false; status: 401 | 403; error: string } {
  if (input.isService || !input.isProduction) return { ok: true };
  if (!input.callerUserId || input.callerUserId !== input.requestedUserId) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  if (input.type !== "welcome") {
    return { ok: false, status: 403, error: "Unauthorized email type" };
  }
  return { ok: true };
}
