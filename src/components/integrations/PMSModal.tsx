"use client";

import { useState, useEffect } from "react";
import { X, Check, RefreshCw, Loader2, AlertCircle, Building2, Calendar } from "lucide-react";

interface PMSConfig {
  id: string;
  name: string;
  logoText: string;
  logoColor: string;
  oauth?: boolean;
  fields: { key: string; label: string; placeholder: string; type?: string }[];
  helpText: string;
}

export const PMS_CONFIGS: Record<string, PMSConfig> = {
  guesty: {
    id: "guesty",
    name: "Guesty",
    logoText: "G",
    logoColor: "bg-blue-50 text-blue-600",
    fields: [
      { key: "client_id", label: "Client ID", placeholder: "0oat..." },
      { key: "client_secret", label: "Client Secret", placeholder: "••••••••••••", type: "password" },
    ],
    helpText: "Find these in your Guesty dashboard under Marketplace → Open API.",
  },
  hostaway: {
    id: "hostaway",
    name: "Hostaway",
    logoText: "H",
    logoColor: "bg-orange-50 text-orange-600",
    fields: [
      { key: "account_id", label: "Account ID", placeholder: "Your Hostaway account ID" },
      { key: "api_key", label: "API Key", placeholder: "••••••••••••", type: "password" },
    ],
    helpText: "Find these in Hostaway → Settings → API Keys.",
  },
  ownerrez: {
    id: "ownerrez",
    name: "OwnerRez",
    logoText: "OR",
    logoColor: "bg-blue-50 text-blue-600",
    oauth: true,
    fields: [
      { key: "email", label: "Account Email", placeholder: "you@example.com" },
      { key: "api_token", label: "API Token", placeholder: "••••••••••••", type: "password" },
    ],
    helpText: "Connect your OwnerRez account to sync properties and bookings.",
  },
};

interface PMSModalProps {
  provider: string;
  open: boolean;
  onClose: () => void;
}

export function PMSModal({ provider, open, onClose }: PMSModalProps) {
  const config = PMS_CONFIGS[provider];
  const [step, setStep] = useState<"connect" | "connected">("connect");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncResults, setSyncResults] = useState<{
    listings?: { imported: number; updated: number; total: number };
    reservations?: { imported: number; skipped: number; total: number };
  } | null>(null);
  const [connectedAt, setConnectedAt] = useState<string | null>(null);
  const [oauthAvailable, setOauthAvailable] = useState(true);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSyncResults(null);
    (async () => {
      try {
        const res = await fetch(`/api/integrations/${provider}/connect`);
        const data = await res.json();
        if (data.connected) { setStep("connected"); setConnectedAt(data.connectedAt); }
        else setStep("connect");
      } catch { setStep("connect"); }
    })();
  }, [open, provider]);

  const handleOAuthConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch(`/api/integrations/${provider}/auth`);
      const data = await res.json();
      if (!res.ok || !data.url) {
        // OAuth not configured — fall back to manual fields
        setOauthAvailable(false);
        setConnecting(false);
        return;
      }
      // Redirect to OwnerRez authorization page
      window.location.href = data.url;
    } catch {
      setOauthAvailable(false);
      setConnecting(false);
    }
  };

  const handleConnect = async () => {
    // If OAuth is available for this provider, try that first
    if (config.oauth && oauthAvailable) {
      return handleOAuthConnect();
    }

    const missing = config.fields.find(f => !fieldValues[f.key]?.trim());
    if (missing) { setError(`${missing.label} is required`); return; }

    setConnecting(true);
    setError(null);
    try {
      const body: Record<string, string> = {};
      config.fields.forEach(f => { body[f.key] = fieldValues[f.key].trim(); });

      const res = await fetch(`/api/integrations/${provider}/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to connect"); setConnecting(false); return; }

      setStep("connected");
      setConnectedAt(new Date().toISOString());
      setConnecting(false);
      handleSync();
    } catch {
      setError("Connection failed. Please try again.");
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setSyncResults(null);
    try {
      const res = await fetch(`/api/integrations/${provider}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "all" }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Sync failed"); setSyncing(false); return; }
      setSyncResults(data.results);
    } catch { setError("Sync failed. Please try again."); }
    setSyncing(false);
  };

  const handleDisconnect = async () => {
    try {
      await fetch(`/api/integrations/${provider}/connect`, { method: "DELETE" });
      setStep("connect");
      setFieldValues({});
      setSyncResults(null);
      setConnectedAt(null);
    } catch {}
  };

  if (!open || !config) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg font-bold ${config.logoColor}`}>
              {config.logoText}
            </div>
            <div>
              <h3 className="font-semibold text-sm">{config.name}</h3>
              <p className="text-xs text-gray-400">Property Management System</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
            </div>
          )}

          {step === "connect" && (
            <>
              <div className="space-y-1">
                <h4 className="font-semibold text-sm">Connect Your {config.name} Account</h4>
                <p className="text-xs text-gray-500 leading-relaxed">{config.helpText}</p>
              </div>

              {config.oauth && oauthAvailable ? (
                /* OAuth flow — one-click connect */
                <button onClick={handleConnect} disabled={connecting}
                  className="w-full py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {connecting ? <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting...</> : `Connect with ${config.name}`}
                </button>
              ) : (
                /* Manual credential entry (fallback or non-OAuth providers) */
                <>
                  <div className="space-y-3">
                    {config.fields.map(field => (
                      <div key={field.key}>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">{field.label}</label>
                        <input
                          type={field.type || "text"}
                          value={fieldValues[field.key] || ""}
                          onChange={e => setFieldValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                          placeholder={field.placeholder}
                          className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                        />
                      </div>
                    ))}
                  </div>
                  <button onClick={handleConnect} disabled={connecting}
                    className="w-full py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {connecting ? <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</> : `Connect ${config.name}`}
                  </button>
                </>
              )}
            </>
          )}

          {step === "connected" && (
            <>
              <div className="flex items-center gap-3 p-3 bg-teal-50 border border-teal-200 rounded-xl">
                <Check className="w-5 h-5 text-teal-600" />
                <div>
                  <p className="text-sm font-medium text-teal-800">Connected to {config.name}</p>
                  {connectedAt && <p className="text-xs text-teal-600">Since {new Date(connectedAt).toLocaleDateString()}</p>}
                </div>
              </div>

              {syncResults && (
                <div className="space-y-2">
                  {syncResults.listings && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <Building2 className="w-4 h-4 text-gray-500" />
                      <div className="text-xs">
                        <span className="font-medium">{syncResults.listings.total} listings found</span>
                        <span className="text-gray-500"> — {syncResults.listings.imported} imported, {syncResults.listings.updated} updated</span>
                      </div>
                    </div>
                  )}
                  {syncResults.reservations && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <div className="text-xs">
                        <span className="font-medium">{syncResults.reservations.total} reservations found</span>
                        <span className="text-gray-500"> — {syncResults.reservations.imported} imported, {syncResults.reservations.skipped} skipped</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={handleSync} disabled={syncing}
                  className="flex-1 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {syncing ? <><Loader2 className="w-4 h-4 animate-spin" /> Syncing...</> : <><RefreshCw className="w-4 h-4" /> Sync Now</>}
                </button>
                <button onClick={handleDisconnect}
                  className="px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors">
                  Disconnect
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
