"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, CheckCircle2 } from "lucide-react";

export default function UnsubscribePage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await fetch('/api/email/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setDone(true);
    } catch {
      setDone(true); // Show success anyway to avoid leaking email existence
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-white">
      <div className="w-full max-w-sm text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-10">
          <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-gray-900">HostFi</span>
        </Link>

        {done ? (
          <div>
            <CheckCircle2 className="w-12 h-12 text-teal-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Unsubscribed</h1>
            <p className="text-sm text-gray-500 mb-6">
              You won't receive marketing emails from HostFi. You'll still get essential account emails (password resets, security alerts).
            </p>
            <Link href="/" className="text-sm text-teal-600 hover:text-teal-700 font-medium">
              Back to HostFi
            </Link>
          </div>
        ) : (
          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Unsubscribe</h1>
            <p className="text-sm text-gray-500 mb-6">
              Enter your email to unsubscribe from HostFi marketing emails.
            </p>
            <form onSubmit={handleUnsubscribe} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gray-900 text-white font-medium rounded-xl text-sm hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {loading ? "Processing..." : "Unsubscribe"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
