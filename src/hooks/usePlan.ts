"use client";

import { useState, useEffect } from "react";
import { type Plan } from "@/lib/feature-gates";

export function usePlan(): { plan: Plan; loading: boolean } {
  const [plan, setPlan] = useState<Plan>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        if (!supabase) { if (!cancelled) setLoading(false); return; }
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { if (!cancelled) setLoading(false); return; }
        const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single();
        if (!cancelled) setPlan((profile?.plan as Plan) || 'free');
      } catch {
        // Plan fetch failed — default to free
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return { plan, loading };
}
