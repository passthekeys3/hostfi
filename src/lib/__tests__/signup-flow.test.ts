import { describe, expect, it } from "vitest";
import { loginErrorMessage, onboardingAuthDecision, signupOutcome } from "../signup-flow";

describe("signup outcome", () => {
  it("sends a new confirmed session to the dashboard", () => {
    expect(signupOutcome({
      hasUser: true,
      hasSession: true,
      identities: [{ id: "identity" }],
    })).toEqual({ kind: "signed-in" });
  });

  it("asks a new user to confirm when email confirmation is required", () => {
    expect(signupOutcome({
      hasUser: true,
      hasSession: false,
      identities: [{ id: "identity" }],
    })).toEqual({ kind: "confirm-email" });
  });

  it("treats an empty identities list as an email that is already registered", () => {
    expect(signupOutcome({
      hasUser: true,
      hasSession: false,
      identities: [],
    })).toEqual({ kind: "already-registered" });
  });

  it("maps an explicit already-registered error the same way", () => {
    expect(signupOutcome({
      errorMessage: "User already registered",
      hasUser: false,
      hasSession: false,
    })).toEqual({ kind: "already-registered" });
  });

  it("keeps other errors visible", () => {
    expect(signupOutcome({
      errorMessage: "Password should be at least 6 characters",
      hasUser: false,
      hasSession: false,
    })).toEqual({ kind: "error", message: "Password should be at least 6 characters" });
  });
});

describe("login error copy", () => {
  it("explains an unconfirmed email", () => {
    expect(loginErrorMessage("Email not confirmed")).toMatch(/Confirm your email/);
  });

  it("explains a password that does not match", () => {
    expect(loginErrorMessage("Invalid login credentials")).toMatch(/don't match/);
  });
});

describe("onboarding email authorization", () => {
  it("rejects a production call with no matching user", () => {
    expect(onboardingAuthDecision({
      isProduction: true,
      isService: false,
      type: "welcome",
      requestedUserId: "user-1",
      callerUserId: null,
    })).toEqual({ ok: false, status: 401, error: "Unauthorized" });
  });

  it("allows a signed-in user to request their own welcome email", () => {
    expect(onboardingAuthDecision({
      isProduction: true,
      isService: false,
      type: "welcome",
      requestedUserId: "user-1",
      callerUserId: "user-1",
    })).toEqual({ ok: true });
  });

  it("blocks a signed-in user from sending other onboarding types", () => {
    expect(onboardingAuthDecision({
      isProduction: true,
      isService: false,
      type: "tips",
      requestedUserId: "user-1",
      callerUserId: "user-1",
    }).ok).toBe(false);
  });

  it("allows the service role to send any type", () => {
    expect(onboardingAuthDecision({
      isProduction: true,
      isService: true,
      type: "check-in",
      requestedUserId: "user-1",
      callerUserId: null,
    })).toEqual({ ok: true });
  });
});
