"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useSignedIn } from "@/hooks/useSignedIn";

export function GetStartedButton({ className = "", size = "default", variant = "dark" }: { className?: string; size?: "default" | "large"; variant?: "dark" | "white" }) {
  const authTarget = useSignedIn() ? "/dashboard" : "/signup";
  
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
