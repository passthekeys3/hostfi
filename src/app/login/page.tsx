"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Building2, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const router = useRouter();
  const supabase = createClient();

  const handleAppleSignIn = async () => {
    if (!supabase) {
      router.push("/dashboard");
      return;
    }
    setAppleLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({ provider: "apple" });

    if (error) {
      setError(error.message);
      setAppleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      router.push("/dashboard");
      return;
    }
    setLoading(true);
    setError(null);

    const { error } = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-white">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-gray-900">HostFi</span>
          </Link>
        </div>

        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {mode === "login" ? "Welcome Back" : "Create Your Account"}
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              {mode === "login" ? "Sign in to manage your properties" : "Start tracking your property expenses"}
            </p>
          </div>

          {!supabase && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-700">
              Supabase not configured. <Link href="/dashboard" className="underline font-medium text-teal-600 hover:text-teal-700">View Demo Dashboard →</Link>
            </div>
          )}

          {/* Apple Sign In */}
          <button
            onClick={handleAppleSignIn}
            disabled={appleLoading}
            className="w-full py-3.5 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            {appleLoading ? "Signing In..." : "Sign In with Apple"}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Or Continue with Email</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm transition-all placeholder:text-gray-400"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm transition-all placeholder:text-gray-400"
                placeholder="••••••••"
                required
              />
            </div>
            {error && (
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-sm text-rose-600">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-teal-500 text-white font-semibold rounded-xl hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
            >
              {loading ? "Loading..." : mode === "login" ? "Sign In" : "Create Account"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500">
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="text-teal-600 hover:text-teal-700 font-medium transition-colors">
              {mode === "login" ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-10">
          © 2026 HostFi. All Rights Reserved.
        </p>
      </div>
    </div>
  );
}
