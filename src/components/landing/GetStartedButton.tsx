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

export function GetStartedButton({ className = "", size = "default", variant = "dark" }: { className?: string; size?: "default" | "large"; variant?: "dark" | "white" }) {
  const authTarget = useAuthTarget();
  
  const variantStyles = variant === "white"
    ? "bg-white text-gray-900 hover:bg-gray-100"
    : "bg-gray-900 text-white hover:bg-gray-800";
  
  return (
    <Link
      href={authTarget}
      prefetch={false}
      className={`inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-colors ${variantStyles} ${
        size === "large" ? "px-8 py-4 text-base" : "px-6 py-3 text-sm"
      } ${className}`}
    >
      Get Started Free <ArrowRight className="w-4 h-4" aria-hidden="true" />
    </Link>
  );
}
