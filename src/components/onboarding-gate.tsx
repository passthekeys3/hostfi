"use client";

import { useState, useEffect } from "react";
import { completeOnboarding, getOnboardingState } from "@/lib/onboarding";
import { OnboardingFlow } from "@/components/onboarding";

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function checkOnboarding() {
      const localState = getOnboardingState();
      if (localState.completed && !localState.reopen) {
        if (!cancelled) {
          setShowOnboarding(false);
          setChecked(true);
        }
        return;
      }

      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user && !localState.reopen) {
            const [{ data: profile }, { count }] = await Promise.all([
              supabase.from("profiles").select("onboarding_completed").eq("id", user.id).single(),
              supabase.from("properties").select("id", { count: "exact", head: true }).eq("user_id", user.id),
            ]);
            if (profile?.onboarding_completed || (count || 0) > 0) {
              completeOnboarding();
              if (!profile?.onboarding_completed) {
                await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
              }
              if (!cancelled) {
                setShowOnboarding(false);
                setChecked(true);
              }
              return;
            }
          }
        }
      } catch (error) {
        console.error("Failed to check onboarding status:", error);
        if (!cancelled) {
          setShowOnboarding(false);
          setChecked(true);
        }
        return;
      }

      if (!cancelled) {
        setShowOnboarding(true);
        setChecked(true);
      }
    }

    checkOnboarding();
    return () => { cancelled = true; };
  }, []);

  const handleComplete = async () => {
    completeOnboarding();
    setShowOnboarding(false);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
        }
      }
    } catch (error) {
      console.error("Failed to save onboarding completion:", error);
    }
  };

  return (
    <>
      {checked && showOnboarding && (
        <div className="mb-8">
          <OnboardingFlow onComplete={handleComplete} />
        </div>
      )}
      {children}
    </>
  );
}
