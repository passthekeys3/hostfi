"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

function useAuthTarget() {
  const [target, setTarget] = useState("/login");
  useEffect(() => {
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        if (!supabase) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (session) setTarget("/dashboard");
      } catch (error) {
        console.error("Failed to check auth session:", error);
      }
    })();
  }, []);
  return target;
}

export function GetStartedButton({ className = "", size = "default" }: { className?: string; size?: "default" | "large" }) {
  const authTarget = useAuthTarget();
  
  return (
    <Link
      href={authTarget}
      prefetch={false}
      className={`inline-flex items-center justify-center gap-2 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition-colors ${
        size === "large" ? "px-8 py-4 text-base" : "px-6 py-3 text-sm"
      } ${className}`}
    >
      Get Started Free <ArrowRight className="w-4 h-4" aria-hidden="true" />
    </Link>
  );
}
