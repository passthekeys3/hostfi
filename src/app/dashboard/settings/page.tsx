"use client";

import { Copy, Check, RotateCcw } from "lucide-react";
import { useState } from "react";
import { resetOnboarding } from "@/lib/onboarding";

export default function SettingsPage() {
  const [copied, setCopied] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const billingEmail = "bills+demo_abc123@hostfi.ai";

  const copyEmail = () => {
    navigator.clipboard.writeText(billingEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inputClass = "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-sm transition-all";

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2 leading-relaxed">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-200/60 p-7 space-y-6">
        <h2 className="text-base font-semibold uppercase tracking-wide text-muted-foreground">Profile</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-xl">
          <div>
            <label htmlFor="settings-fullname" className="block text-sm font-medium mb-2">Full Name</label>
            <input id="settings-fullname" defaultValue="Demo User" className={inputClass} />
          </div>
          <div>
            <label htmlFor="settings-email" className="block text-sm font-medium mb-2">Email</label>
            <input id="settings-email" defaultValue="demo@hostfi.ai" disabled className={`${inputClass} text-muted-foreground`} aria-describedby="email-note" />
          </div>
        </div>
        <button disabled className="px-5 py-2.5 bg-teal-600/50 text-white font-medium rounded-xl transition-all text-sm cursor-not-allowed shadow-sm" title="Not available in demo mode">
          Save Changes (Demo)
        </button>
      </div>

      {/* Billing Email */}
      <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-200/60 p-7 space-y-6">
        <div className="space-y-5">
          <h2 className="text-base font-semibold uppercase tracking-wide text-muted-foreground">Your HostFi Billing Email</h2>
          <p className="text-sm text-muted-foreground max-w-lg leading-relaxed">
            Use this email address to receive bills directly. Add it to your utility accounts so bills are automatically parsed and tracked.
          </p>
          <div className="flex items-center gap-2 sm:gap-3 max-w-lg">
            <div className="flex-1 px-2.5 sm:px-4 py-3 sm:py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-[11px] sm:text-sm font-mono text-center break-all min-w-0">
              {billingEmail}
            </div>
            <button
              onClick={copyEmail}
              aria-label={copied ? "Email copied" : "Copy billing email"}
              className="p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40"
            >
              {copied ? <Check className="w-4 h-4 text-accent" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-500/10 border border-teal-500/20 rounded-full">
              <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
              <span className="text-xs text-teal-600 font-medium">Active — receiving emails</span>
            </div>
            <button
              onClick={() => setTestSent(true)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-all text-xs font-medium shadow-sm"
            >
              {testSent ? "✓ Test sent!" : "Send test email"}
            </button>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6 space-y-5">
          <h3 className="text-base font-semibold uppercase tracking-wide text-muted-foreground">How to Connect Your Bills</h3>
          
          {/* Primary method */}
          <div className="bg-teal-500/5 border border-teal-500/15 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-teal-600 bg-teal-500/10 px-2.5 py-0.5 rounded-full">RECOMMENDED</span>
              <h4 className="text-sm font-medium">Add as billing email on your utility accounts</h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">The easiest way — bills come straight to HostFi, no forwarding rules needed.</p>
            <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside leading-relaxed">
              <li>Log in to your utility provider (SoCalGas, LADWP, Edison, etc.)</li>
              <li>Go to Account Settings → Notifications or Paperless Billing</li>
              <li>Add <code className="text-accent font-mono bg-teal-500/5 px-1.5 py-0.5 rounded">{billingEmail}</code> as your billing email</li>
              <li>Most providers let you keep your personal email too — add HostFi as a secondary</li>
              <li>That&apos;s it! Bills will appear in your Inbox automatically</li>
            </ol>
          </div>

          {/* Common providers */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quick Links for Common Providers</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { name: "SoCalGas", url: "https://www.socalgas.com/myaccount" },
                { name: "LADWP", url: "https://www.ladwp.com/myaccount" },
                { name: "SCE (Edison)", url: "https://www.sce.com/myaccount" },
                { name: "Spectrum", url: "https://www.spectrum.net/account" },
                { name: "AT&T", url: "https://www.att.com/myatt" },
                { name: "Xfinity", url: "https://www.xfinity.com/overview" },
              ].map((provider) => (
                <a
                  key={provider.name}
                  href={provider.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 sm:px-4 py-3 bg-gray-50 rounded-xl text-xs font-medium hover:bg-gray-100 transition-all text-center border border-gray-200/60 hover:shadow-sm min-h-[44px] flex items-center justify-center active:scale-[0.98]"
                >
                  {provider.name} →
                </a>
              ))}
            </div>
          </div>

          {/* Alternative method */}
          <div className="border-t border-gray-200 pt-5 space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Alternative: Email Forwarding</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">If your provider doesn&apos;t support multiple emails, you can auto-forward bills from your inbox instead.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-5 space-y-2 border border-gray-200/60">
                <h4 className="text-sm font-medium">Gmail</h4>
                <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>Open Gmail Settings → Forwarding</li>
                  <li>Click &quot;Add a forwarding address&quot;</li>
                  <li>Enter: <code className="text-accent">{billingEmail}</code></li>
                  <li>Create a filter for utility bill senders</li>
                  <li>Set filter action to &quot;Forward to&quot; your HostFi email</li>
                </ol>
              </div>
              <div className="bg-gray-50 rounded-xl p-5 space-y-2 border border-gray-200/60">
                <h4 className="text-sm font-medium">Outlook</h4>
                <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>Go to Settings → Mail → Rules</li>
                  <li>Create a new rule for bill emails</li>
                  <li>Set condition: From specific senders</li>
                  <li>Set action: Forward to <code className="text-accent">{billingEmail}</code></li>
                  <li>Save and enable the rule</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Setup Wizard */}
      <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-200/60 p-7 space-y-4">
        <h2 className="text-base font-semibold uppercase tracking-wide text-muted-foreground">Setup Wizard</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Re-run the onboarding setup wizard to walk through initial configuration again.
        </p>
        <button
          onClick={() => {
            resetOnboarding();
            window.location.href = "/dashboard";
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-foreground font-medium rounded-xl hover:bg-gray-100 transition-all duration-200 border border-gray-200 text-sm shadow-sm"
        >
          <RotateCcw className="w-4 h-4" /> Run setup again
        </button>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-red-500/15 p-7 space-y-4">
        <h2 className="text-base font-semibold uppercase tracking-wide text-red-600">Danger Zone</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Permanently delete your account and all associated data.
        </p>
        <button disabled className="px-5 py-2.5 bg-red-500/10 text-red-600/50 font-medium rounded-xl transition-all border border-red-500/15 text-sm cursor-not-allowed" title="Not available in demo mode">
          Delete Account (Demo)
        </button>
      </div>
    </div>
  );
}
