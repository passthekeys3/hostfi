"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const supabase = createClient();
    if (!supabase) {
      setError("Sign-in is not configured.");
      return;
    }
    setLoading(true);
    setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError("Open the reset link from your email first. This page does not have a signed-in session yet.");
      setLoading(false);
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setNotice("Password updated.");
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-white">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <Image src="/logo.svg" alt="" width={40} height={40} />
            <span className="text-2xl font-bold tracking-tight text-gray-900">HostFi</span>
          </Link>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 text-center">Choose a new password</h1>
        <p className="text-sm text-gray-500 mt-2 text-center">Use the link from the reset email, then set a password here.</p>
        <form onSubmit={save} className="space-y-4 mt-8">
          <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">New password</label>
          <input
            id="new-password"
            type="password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
          />
          {notice && <p role="status" className="text-sm text-teal-800">{notice}</p>}
          {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-3.5 bg-teal-500 text-white font-semibold rounded-xl text-sm disabled:opacity-50">
            {loading ? "Saving..." : "Save password"}
          </button>
        </form>
        <p className="text-center mt-6">
          <Link href="/login" className="text-sm text-teal-700">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
