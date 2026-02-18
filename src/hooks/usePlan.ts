"use client";

import { useState, useEffect } from "react";
import { type Plan } from "@/lib/feature-gates";

export function usePlan(): { plan: Plan; loading: boolean } {
  const [plan, setPlan] = useState<Plan>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        if (!supabase) { setLoading(false); return; }
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single();
        setPlan((profile?.plan as Plan) || 'free');
      } catch (error) {
        console.error("Failed to load user plan:", error);
      }
      setLoading(false);
    })();
  }, []);

  return { plan, loading };
}
