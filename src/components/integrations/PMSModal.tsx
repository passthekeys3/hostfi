"use client";

import { useState, useEffect, useId } from "react";
import Image from "next/image";
import { X, Check, RefreshCw, Loader2, AlertCircle, Building2, Calendar, ChevronRight, Unlink } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface PMSConfig {
  id: string;
  name: string;
  logoText: string;
  logoColor: string;
  logoUrl?: string;
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
    logoUrl: "/logos/guesty.png",
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
    logoUrl: "/logos/hostaway.png",
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
    logoUrl: "/logos/ownerrez.png",
    oauth: true,
    fields: [
      { key: "email", label: "Account Email", placeholder: "you@example.com" },
      { key: "api_token", label: "API Token", placeholder: "••••••••••••", type: "password" },
    ],
    helpText: "Find your API token in OwnerRez → Settings → API Access.",
  },
  hospitable: {
    id: "hospitable",
    name: "Hospitable",
    logoText: "H",
    logoColor: "bg-indigo-50 text-indigo-600",
    logoUrl: "/logos/hospitable.svg",
    oauth: true,
    fields: [], // OAuth only, no manual fields
    helpText: "Connect your Hospitable account to import properties and reservations.",
  },
  hospitable_connect: {
    id: "hospitable_connect",
    name: "Hospitable Connect",
    logoText: "HC",
    logoColor: "bg-emerald-50 text-emerald-600",
    logoUrl: "/logos/hospitable-connect.svg",
    oauth: false, // Not OAuth — we handle the auth code flow differently
    fields: [], // No manual fields
    helpText: "Connect your Airbnb or VRBO account directly — no PMS subscription needed.",
  },
};

interface RemoteProperty {
  id: string;
  name: string;
  address?: string;
  selected: boolean;
}

interface PMSModalProps {
  provider: string;
  open: boolean;
  onClose: () => void;
}

// Convert provider ID to API path (handles underscore to hyphen conversion)
function getApiPath(provider: string): string {
  // hospitable_connect → hospitable-connect
  return provider.replace(/_/g, '-');
}

export function PMSModal({ provider, open, onClose }: PMSModalProps) {
  const config = PMS_CONFIGS[provider];
  const apiPath = getApiPath(provider);
  const [step, setStep] = useState<"connect" | "connected" | "select-properties">("connect");
  const titleId = useId();
  const modalRef = useFocusTrap<HTMLDivElement>(open, { onEscape: onClose });
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncResults, setSyncResults] = useState<{
    listings?: { imported: number; updated: number; total: number; skipped?: number };
    reservations?: { imported: number; skipped: number; total: number };
    limitReached?: boolean;
  } | null>(null);
  const [connectedAt, setConnectedAt] = useState<string | null>(null);
  const [oauthAvailable, setOauthAvailable] = useState(true);
  const [remoteProperties, setRemoteProperties] = useState<RemoteProperty[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSyncResults(null);
    (async () => {
      try {
        const res = await fetch(`/api/integrations/${apiPath}/connect`);
        const data = await res.json();
        if (data.connected) {
          setConnectedAt(data.connectedAt);
          if (data.syncedCount === 0) {
            // No properties synced yet — auto-trigger property selection
            setStep("connected");
            loadRemoteProperties();
          } else {
            setStep("connected");
          }
        } else {
          setStep("connect");
        }
      } catch (error) {
        console.error('Failed to check PMS connection status:', error);
        setStep("connect");
      }
    })();
  }, [open, provider, apiPath]);

  const handleOAuthConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch(`/api/integrations/${apiPath}/auth`);
      const data = await res.json();
      if (!res.ok || !data.url) {
        setOauthAvailable(false);
        setConnecting(false);
        return;
      }
      window.location.href = data.url;
    } catch (error) {
      console.error('PMS OAuth redirect failed:', error);
      setOauthAvailable(false);
      setConnecting(false);
    }
  };

  const handleConnect = async () => {
    if (config.oauth && oauthAvailable) {
      return handleOAuthConnect();
    }

    // Special handling for Hospitable Connect — uses auth code flow
    if (provider === "hospitable_connect") {
      setConnecting(true);
      setError(null);
      try {
        const res = await fetch(`/api/integrations/${apiPath}/connect`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        if (!res.ok || !data.url) {
          setError(data.error || "Failed to initialize connection");
          setConnecting(false);
          return;
        }
        // Redirect to Hospitable Connect magic link
        window.location.href = data.url;
      } catch (error) {
        console.error('Hospitable Connect redirect failed:', error);
        setError("Connection failed. Please try again.");
        setConnecting(false);
      }
      return;
    }

    const missing = config.fields.find(f => !fieldValues[f.key]?.trim());
    if (missing) { setError(`${missing.label} is required`); return; }

    setConnecting(true);
    setError(null);
    try {
      const body: Record<string, string> = {};
      config.fields.forEach(f => { body[f.key] = fieldValues[f.key].trim(); });

      const res = await fetch(`/api/integrations/${apiPath}/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to connect. Check your credentials and try again.");
        setConnecting(false);
        return;
      }

      setStep("connected");
      setConnectedAt(new Date().toISOString());
      setConnecting(false);

      // Go straight to property selection
      loadRemoteProperties();
    } catch (error) {
      console.error('PMS connection failed:', error);
      setError("Connection failed. Please check your credentials and try again.");
      setConnecting(false);
    }
  };

  const loadRemoteProperties = async () => {
    setLoadingProperties(true);
    setError(null);
    try {
      // Sync listings only to discover properties
      const res = await fetch(`/api/integrations/${apiPath}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "listings", dryRun: true }),
      });
      const data = await res.json();
      if (res.ok && data.results?.listings?.properties) {
        setRemoteProperties(
          data.results.listings.properties.map((p: { id: string; name: string; address?: string }) => ({
            ...p,
            selected: true,
          }))
        );
        setStep("select-properties");
      } else {
        // Fallback: just do a full sync without selection
        handleSync();
      }
    } catch (error) {
      console.error('Failed to load remote properties:', error);
      // Fallback: full sync
      handleSync();
    }
    setLoadingProperties(false);
  };

  const toggleProperty = (id: string) => {
    setRemoteProperties(prev =>
      prev.map(p => p.id === id ? { ...p, selected: !p.selected } : p)
    );
  };

  const selectAll = () => {
    const allSelected = remoteProperties.every(p => p.selected);
    setRemoteProperties(prev => prev.map(p => ({ ...p, selected: !allSelected })));
  };

  const handleSyncSelected = async () => {
    setSyncing(true);
    setError(null);
    setSyncResults(null);
    const selectedIds = remoteProperties.filter(p => p.selected).map(p => p.id);

    try {
      const res = await fetch(`/api/integrations/${apiPath}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "all", selectedPropertyIds: selectedIds }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Sync failed"); setSyncing(false); return; }
      setSyncResults(data.results);
      setStep("connected");
    } catch (error) {
      console.error('PMS sync selected properties failed:', error);
      setError("Sync failed. Please try again.");
    }
    setSyncing(false);
  };

  const handleSync = async (force = false) => {
    setSyncing(true);
    setError(null);
    setSyncResults(null);
    try {
      const res = await fetch(`/api/integrations/${apiPath}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "all", force }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Sync failed"); setSyncing(false); return; }
      setSyncResults(data.results);
    } catch { setError("Sync failed. Please try again."); }
    setSyncing(false);
  };

  const handleDisconnect = async () => {
    try {
      await fetch(`/api/integrations/${apiPath}/connect`, { method: "DELETE" });
      setStep("connect");
      setFieldValues({});
      setSyncResults(null);
      setConnectedAt(null);
      setRemoteProperties([]);
    } catch (error) {
      console.error(`Failed to disconnect ${provider}:`, error);
    }
  };

  if (!open || !config) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[90vh] safe-area-bottom overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {config.logoUrl ? (
              <Image src={config.logoUrl} alt={config.name} width={40} height={40} className="rounded-xl object-contain" />
            ) : (
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${config.logoColor}`}>
                {config.logoText}
              </div>
            )}
            <div>
              <h2 id={titleId} className="text-base font-semibold text-gray-900">{config.name}</h2>
              <p className="text-xs text-gray-500 mt-0.5">Property Management System</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close modal" className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/40">
            <X className="w-4 h-4 text-gray-400" aria-hidden="true" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
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
                <button onClick={handleConnect} disabled={connecting}
                  className="w-full py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {connecting ? <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting...</> : `Connect with ${config.name}`}
                </button>
              ) : (
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
                    {connecting ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</> : `Connect ${config.name}`}
                  </button>
                </>
              )}
            </>
          )}

          {step === "select-properties" && (
            <>
              <div className="space-y-1">
                <h4 className="font-semibold text-sm">Select Properties to Import</h4>
                <p className="text-xs text-gray-500">Choose which {config.name} properties you want to track in HostFi.</p>
              </div>

              {loadingProperties ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  <span className="text-sm text-gray-500 ml-2">Loading properties...</span>
                </div>
              ) : (
                <>
                  {remoteProperties.length > 1 && (
                    <button
                      onClick={selectAll}
                      className="text-xs font-medium text-teal-600 hover:text-teal-700"
                    >
                      {remoteProperties.every(p => p.selected) ? "Deselect All" : "Select All"}
                    </button>
                  )}

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {remoteProperties.map((prop) => (
                      <label
                        key={prop.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          prop.selected ? "border-teal-300 bg-teal-50/50" : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={prop.selected}
                          onChange={() => toggleProperty(prop.id)}
                          className="accent-teal-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 truncate">{prop.name}</p>
                          {prop.address && (
                            <p className="text-[11px] text-gray-500 truncate">{prop.address}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>

                  {remoteProperties.filter(p => p.selected).length === 0 && (
                    <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                      <p className="text-xs text-amber-700">Select at least one property to import</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep("connected")}
                      className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                    >
                      Skip
                    </button>
                    <button
                      onClick={handleSyncSelected}
                      disabled={syncing || remoteProperties.filter(p => p.selected).length === 0}
                      className="flex-1 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {syncing ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</>
                      ) : (
                        <>Import {remoteProperties.filter(p => p.selected).length} Properties</>
                      )}
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {step === "connected" && (
            <div className="space-y-5">
              {/* Status banner */}
              <div className="flex items-center gap-3 p-4 bg-teal-50 rounded-xl border border-teal-100">
                <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-teal-900">Connected</p>
                  <p className="text-xs text-teal-700">{config.name}{connectedAt ? ` since ${new Date(connectedAt).toLocaleDateString()}` : ""}</p>
                </div>
              </div>

              {/* Sync results (integration-specific info) */}
              {syncResults && (
                <div className="space-y-2">
                  {syncResults.listings && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <Building2 className="w-4 h-4 text-gray-500" />
                      <div className="text-xs">
                        <span className="font-medium">{syncResults.listings.total} listings found</span>
                        <span className="text-gray-500"> — {syncResults.listings.imported} imported, {syncResults.listings.updated} updated</span>
                        {(syncResults.listings.skipped || 0) > 0 && (
                          <span className="text-amber-600"> ({syncResults.listings.skipped} skipped — plan limit)</span>
                        )}
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
                  {syncResults.limitReached && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-700">Some properties were skipped due to your plan limit. Upgrade to import more.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="space-y-3">
                <button onClick={() => loadRemoteProperties()} disabled={syncing || loadingProperties}
                  className="w-full py-3 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {syncing || loadingProperties ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</>
                  ) : (
                    <><RefreshCw className="w-4 h-4" /> {syncResults ? "Sync Again" : "Select & Import Properties"}</>
                  )}
                </button>
                <button onClick={handleDisconnect}
                  className="w-full py-3 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors flex items-center justify-center gap-2">
                  <Unlink className="w-4 h-4" /> Disconnect
                </button>
              </div>
              
              <button onClick={() => handleSync(true)} disabled={syncing}
                className="w-full py-2 text-xs font-medium text-gray-500 hover:text-gray-700 text-center transition-colors disabled:opacity-50">
                Force Re-sync (clears & re-imports all bookings)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
