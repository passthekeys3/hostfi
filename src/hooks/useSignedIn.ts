"use client";

import { useEffect, useState } from "react";

let lookup: Promise<boolean> | null = null;

function signedInOnce(): Promise<boolean> {
  if (!lookup) {
    lookup = (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        if (!supabase) return false;
        const { data: { session } } = await supabase.auth.getSession();
        return Boolean(session);
      } catch (error) {
        console.error("Failed to check auth session:", error);
        return false;
      }
    })();
  }
  return lookup;
}

/** One session read shared by every landing control that needs it. */
export function useSignedIn(): boolean {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    let cancelled = false;
    signedInOnce().then(value => {
      if (!cancelled) setSignedIn(value);
    });
    return () => { cancelled = true; };
  }, []);
  return signedIn;
}
