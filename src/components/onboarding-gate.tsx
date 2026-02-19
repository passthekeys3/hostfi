"use client";

import { useState, useEffect } from "react";
import { getOnboardingState, completeOnboarding } from "@/lib/onboarding";
import { OnboardingFlow } from "@/components/onboarding";

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    async function checkOnboarding() {
      // 1. Check localStorage first (fast, avoids flash)
      const localState = getOnboardingState();
      if (localState.completed) {
        setShowOnboarding(false);
        setChecked(true);
        return;
      }

      // 2. Always check Supabase — this is the source of truth
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
              // Sync localStorage so future checks are instant
              completeOnboarding();
              setShowOnboarding(false);
              setChecked(true);
              return;
            }
          }
        }
      } catch (error) {
        console.error("Failed to check onboarding status:", error);
        // If Supabase check fails, DON'T show onboarding — assume completed
        // Better to skip onboarding than re-show it to an existing user
        setShowOnboarding(false);
        setChecked(true);
        return;
      }

      // 3. Neither localStorage nor Supabase say completed — show onboarding
      setShowOnboarding(true);
      setChecked(true);
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
    } catch (error) {
      console.error("Failed to save onboarding completion:", error);
    }

    setShowOnboarding(false);
  };

  if (!checked) return <>{children}</>;

  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleComplete} />;
  }

  return <>{children}</>;
}
