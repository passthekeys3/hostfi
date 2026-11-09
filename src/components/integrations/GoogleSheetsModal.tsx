"use client";

import { useState, useId, useEffect, useCallback } from "react";
import Image from "next/image";
import { Check, X, ArrowRight, RefreshCw, ExternalLink, Shield, Unlink, FileSpreadsheet } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import type { GoogleSheetsModalProps } from "./types";
import { GooglePicker, type GooglePickerFile } from "@/components/google-picker";

export function GoogleSheetsModal({ onClose, isConnected: initialConnected, onDisconnect }: GoogleSheetsModalProps) {
  const [step] = useState<"connect" | "connected">(initialConnected ? "connected" : "connect");
  const [connectionInfo, setConnectionInfo] = useState<{
    spreadsheetUrl: string | null;
    spreadsheetName: string | null;
    lastSynced: string | null;
  } | null>(null);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loadingToken, setLoadingToken] = useState(false);
  const [changingSpreadsheet, setChangingSpreadsheet] = useState(false);
  const titleId = useId();
  const modalRef = useFocusTrap<HTMLDivElement>(true, { onEscape: onClose });

  // Load connection info if connected
  useEffect(() => {
    if (initialConnected) {
      fetch("/api/integrations/google/connection")
        .then((res) => res.json())
        .then((data) => {
          if (data.sheets?.connected) {
            setConnectionInfo({
              spreadsheetUrl: data.sheets.spreadsheetUrl,
              spreadsheetName: data.sheets.spreadsheetName || "HostFi Expenses",
              lastSynced: data.sheets.lastSynced,
            });
          }
        })
        .catch(() => {});
      // Pre-load access token so Picker opens in one click
      fetch("/api/integrations/google/access-token")
        .then((res) => res.json())
        .then((data) => {
          if (data.access_token) setAccessToken(data.access_token);
        })
        .catch(() => {});
    }
  }, [initialConnected]);

  // Fetch access token when needed for picker
  const fetchAccessToken = useCallback(async () => {
    if (accessToken) return accessToken;
    setLoadingToken(true);
    try {
      const res = await fetch("/api/integrations/google/access-token");
      const data = await res.json();
      if (data.access_token) {
        setAccessToken(data.access_token);
        return data.access_token;
      }
    } catch (err) {
      console.error("Failed to fetch access token:", err);
    }
    setLoadingToken(false);
    return null;
  }, [accessToken]);

  const handleSpreadsheetSelect = useCallback(async (file: GooglePickerFile) => {
    setChangingSpreadsheet(true);
    try {
      const res = await fetch("/api/integrations/google/update-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "google_sheets",
          metadata: {
            spreadsheet_id: file.id,
            spreadsheet_url: file.url,
            spreadsheet_name: file.name,
          },
        }),
      });

      if (res.ok) {
        setConnectionInfo((prev) => ({
          ...prev,
          spreadsheetUrl: file.url,
          spreadsheetName: file.name,
          lastSynced: prev?.lastSynced || null,
        }));
      }
    } catch (err) {
      console.error("Failed to update spreadsheet:", err);
    }
    setChangingSpreadsheet(false);
  }, []);

  const handleSyncAll = async () => {
    setSyncStatus("syncing");
    try {
      // Fetch all expenses and sync
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      if (!supabase) {
        setSyncStatus("error");
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSyncStatus("error");
        return;
      }

      // Fetch expenses with property names
      const { data: expenses } = await supabase
        .from("expenses")
        .select("date, amount, category, description, notes, properties(name)")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(500);

      if (!expenses || expenses.length === 0) {
        setSyncStatus("success");
        return;
      }

      // Transform to sync format
      const formatted = expenses.map((e: Record<string, unknown>) => ({
        date: e.date as string,
        property_name: (e.properties as { name: string } | null)?.name || "Unknown",
        category: e.category as string,
        amount: e.amount as number,
        description: e.description as string,
        notes: (e.notes as string) || "",
      }));

      const res = await fetch("/api/integrations/google/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expenses: formatted }),
      });

      if (res.ok) {
        setSyncStatus("success");
        // Update last synced
        setConnectionInfo((prev) => prev ? { ...prev, lastSynced: new Date().toISOString() } : prev);
      } else {
        setSyncStatus("error");
      }
    } catch (error) {
      console.error('Google Sheets sync failed:', error);
      setSyncStatus("error");
    }
  };

  const handleDisconnect = async () => {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("integration_connections")
        .update({ active: false })
        .eq("user_id", user.id)
        .eq("provider", "google_sheets");

      onDisconnect?.();
      onClose();
    } catch (error) {
      console.error("Failed to disconnect Google Sheets:", error);
    }
  };

  const formatLastSynced = (iso: string | null) => {
    if (!iso) return "Never";
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[90vh] safe-area-bottom overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Image src="/logos/googlesheets.svg" alt="Google Sheets" width={40} height={40} className="rounded-xl object-contain" />
            <div>
              <h2 id={titleId} className="text-base font-semibold text-gray-900">Connect Google Sheets</h2>
              <p className="text-xs text-gray-600 mt-0.5">Auto-export expense data</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close modal" className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/40"><X className="w-4 h-4 text-gray-400" aria-hidden="true" /></button>
        </div>

        <div className="px-6 py-5">
          {step === "connect" && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-900">Auto-export expense data</h4>
                {[
                  { label: "Expenses", desc: "Date, property, category, amount, vendor — all synced automatically" },
                  { label: "Real-time sync", desc: "Spreadsheet updates as new expenses are added" },
                  { label: "Share with CPA", desc: "Give view-only access to anyone who needs it" },
                  { label: "Custom columns", desc: "Map HostFi fields to your preferred column layout" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                      <ArrowRight className="w-4 h-4 text-[#0F9D58]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg border border-green-100">
                <Shield className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                <p className="text-xs text-green-700">HostFi uses Google OAuth. We only access the spreadsheet you choose.</p>
              </div>
              <a href="/api/integrations/google/auth" className="w-full py-3 text-sm font-semibold text-white bg-[#0F9D58] hover:bg-[#0D8C4D] rounded-xl transition-colors flex items-center justify-center gap-2">
                Connect Google Account <ExternalLink className="w-4 h-4" />
              </a>
              <p className="text-center text-[10px] text-gray-400">You&apos;ll be redirected to Google to authorize access.</p>
            </div>
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
                  <p className="text-xs text-teal-700">Google Sheets integration is active</p>
                </div>
              </div>

              {/* Current spreadsheet */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#0F9D58] rounded-lg flex items-center justify-center">
                      <FileSpreadsheet className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {connectionInfo?.spreadsheetName || "HostFi Expenses"}
                      </p>
                      <p className="text-xs text-gray-500">Current spreadsheet</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {connectionInfo?.spreadsheetUrl && (
                    <a
                      href={connectionInfo.spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink className="w-3 h-3" /> Open
                    </a>
                  )}
                  <GooglePicker
                    accessToken={accessToken || "pending"}
                    mode="spreadsheet"
                    onSelect={handleSpreadsheetSelect}
                    autoRefreshToken
                    buttonText={changingSpreadsheet ? "Changing..." : "Change"}
                    className="flex-1 py-2.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                  />
                </div>
              </div>

              {/* Connection details */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Last synced</span>
                  <span className="font-medium text-gray-700">{formatLastSynced(connectionInfo?.lastSynced || null)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Sync mode</span>
                  <span className="font-medium text-gray-700">Real-time</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleSyncAll}
                  disabled={syncStatus === "syncing"}
                  className="w-full py-3 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {syncStatus === "syncing" ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> Syncing...</>
                  ) : syncStatus === "success" ? (
                    <><Check className="w-4 h-4" /> Synced!</>
                  ) : (
                    <><RefreshCw className="w-4 h-4" /> Sync All Expenses</>
                  )}
                </button>

                <button
                  onClick={handleDisconnect}
                  className="w-full py-3 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Unlink className="w-4 h-4" /> Disconnect
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
