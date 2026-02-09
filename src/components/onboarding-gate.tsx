"use client";

import { useState, useEffect } from "react";
import { getOnboardingState } from "@/lib/onboarding";
import { OnboardingFlow } from "@/components/onboarding";

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const state = getOnboardingState();
    if (!state.completed) {
      setShowOnboarding(true);
    }
  }, []);

  if (!mounted) return <>{children}</>;

  if (showOnboarding) {
    return <OnboardingFlow onComplete={() => setShowOnboarding(false)} />;
  }

  return <>{children}</>;
}
