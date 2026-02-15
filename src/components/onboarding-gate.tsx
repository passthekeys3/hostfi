"use client";

import { useState, useEffect } from "react";
import { getOnboardingState, completeOnboarding } from "@/lib/onboarding";
import { OnboardingFlow } from "@/components/onboarding";

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Check Supabase first, fall back to localStorage
    async function checkOnboarding() {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("onboarding_completed")
              .eq("id", user.id)
              .single();

            if (profile?.onboarding_completed) {
              // Sync localStorage so it doesn't flash next time
              completeOnboarding();
              setShowOnboarding(false);
              return;
            }
          }
        }
      } catch {}

      // Fall back to localStorage
      const state = getOnboardingState();
      if (!state.completed) {
        setShowOnboarding(true);
      }
    }

    checkOnboarding();
  }, []);

  const handleComplete = async () => {
    // Save to Supabase
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from("profiles")
            .update({ onboarding_completed: true })
            .eq("id", user.id);
        }
      }
    } catch {}

    setShowOnboarding(false);
  };

  if (!mounted) return <>{children}</>;

  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleComplete} />;
  }

  return <>{children}</>;
}
