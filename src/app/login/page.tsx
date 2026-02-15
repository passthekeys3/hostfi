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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [rememberMe, setRememberMe] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  const handleGoogleSignIn = async () => {
    if (!supabase) {
      router.push("/dashboard");
      return;
    }
    localStorage.removeItem('hostfi_demo_mode');
    localStorage.removeItem('hostfi_onboarding_complete');
    sessionStorage.setItem('hostfi_tab_alive', '1');
    // Apply remember-me preference for Google sign-in too
    if (!rememberMe) {
      localStorage.setItem('hostfi_session_only', 'true');
    } else {
      localStorage.removeItem('hostfi_session_only');
    }
    setGoogleLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  };

  const handleDemoMode = () => {
    localStorage.setItem('hostfi_demo_mode', 'true');
    router.push("/dashboard");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      router.push("/dashboard");
      return;
    }
    setLoading(true);
    setError(null);

    // Store remember-me preference before sign in
    if (mode === "login" && !rememberMe) {
      localStorage.setItem('hostfi_session_only', 'true');
    } else {
      localStorage.removeItem('hostfi_session_only');
    }

    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
    } else {
      // Send welcome email for new signups (non-blocking)
      if (mode === "signup" && result.data?.user) {
        fetch('/api/email/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'welcome', userId: result.data.user.id }),
        }).catch(() => {});
      }
      localStorage.removeItem('hostfi_demo_mode');
      localStorage.removeItem('hostfi_onboarding_complete');
      // Set tab-alive marker for session-only mode detection
      sessionStorage.setItem('hostfi_tab_alive', '1');
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

          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full py-3.5 bg-white text-gray-700 font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {googleLoading ? "Signing In..." : "Continue with Google"}
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
            {mode === "login" && (
              <div className="flex items-center gap-2">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-teal-500 focus:ring-teal-500/20"
                />
                <label htmlFor="remember-me" className="text-sm text-gray-500">Keep me logged in</label>
              </div>
            )}
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

          {/* Demo Mode */}
          <div className="pt-2 border-t border-gray-100">
            <button
              onClick={handleDemoMode}
              className="w-full py-3 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors"
            >
              Try Demo Mode →
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-10">
          © 2026 HostFi. All Rights Reserved.
        </p>
      </div>
    </div>
  );
}
