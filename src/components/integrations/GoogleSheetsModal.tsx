"use client";

import { useState, useId, useEffect, useCallback } from "react";
import { Check, X, ArrowRight, RefreshCw, ChevronRight, ExternalLink, Shield, Unlink, FileSpreadsheet, Loader2 } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import type { GoogleSheetsModalProps } from "./types";
import { cn } from "@/lib/utils";
import { GooglePicker, type GooglePickerFile } from "@/components/google-picker";

export function GoogleSheetsModal({ onClose, isConnected: initialConnected, onDisconnect }: GoogleSheetsModalProps) {
  const [step, setStep] = useState<"connect" | "spreadsheet" | "mapping" | "success" | "connected">(initialConnected ? "connected" : "connect");
  const [syncing, setSyncing] = useState(false);
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState("create_new");
  const [columnMappings, setColumnMappings] = useState({
    date: "A",
    property: "B",
    category: "C",
    amount: "D",
    vendor: "E",
  });
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

  const handleFinish = () => {
    setSyncing(true);
    setTimeout(() => { setSyncing(false); setStep("success"); }, 2000);
  };

  const stepLabels = ["Connect", "Spreadsheet", "Map Columns", "Enable"];
  const stepKeys = ["connect", "spreadsheet", "mapping", "success"];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[90vh] safe-area-bottom overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <img src="/logos/googlesheets.svg" alt="Google Sheets" className="w-10 h-10 rounded-xl object-contain" />
            <div>
              <h2 id={titleId} className="text-base font-semibold text-gray-900">Connect Google Sheets</h2>
              <p className="text-xs text-gray-500 mt-0.5">Auto-export expense data</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close modal" className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/40"><X className="w-4 h-4 text-gray-400" aria-hidden="true" /></button>
        </div>

        {/* Step indicator - only show for non-connected states */}
        {step !== "connected" && (
          <div className="px-6 pt-4">
            <div className="flex items-center justify-between mb-2">
              {stepLabels.map((label, i) => {
                const stepIndex = stepKeys.indexOf(step);
                const isActive = i <= stepIndex;
                const isCurrent = i === stepIndex;
                return (
                  <div key={label} className="flex-1 flex items-center">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                      isCurrent ? "bg-[#0F9D58] text-white" : isActive ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-400"
                    )}>
                      {isActive && i < stepIndex ? <Check className="w-3 h-3" /> : i + 1}
                    </div>
                    {i < 3 && <div className={cn("flex-1 h-0.5 mx-2", isActive && i < stepIndex ? "bg-teal-500" : "bg-gray-100")} />}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 px-1">
              {stepLabels.map(l => <span key={l}>{l}</span>)}
            </div>
          </div>
        )}

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

          {step === "spreadsheet" && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Select spreadsheet</h4>
                <p className="text-xs text-gray-500">Choose an existing spreadsheet or create a new one</p>
              </div>
              <div className="space-y-2">
                {[
                  { id: "create_new", name: "Create new spreadsheet", desc: "HostFi will create a new spreadsheet for you" },
                  { id: "existing_1", name: "STR Expense Tracker 2026", desc: "Last modified: Feb 5, 2026" },
                  { id: "existing_2", name: "Property Finances Master", desc: "Last modified: Jan 28, 2026" },
                  { id: "existing_3", name: "Tax Prep - Schedule E", desc: "Last modified: Jan 15, 2026" },
                ].map((sheet) => (
                  <label key={sheet.id} className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    selectedSpreadsheet === sheet.id ? "border-[#0F9D58] bg-[#0F9D58]/5" : "border-gray-200 hover:bg-gray-50"
                  )}>
                    <input
                      type="radio"
                      name="spreadsheet"
                      value={sheet.id}
                      checked={selectedSpreadsheet === sheet.id}
                      onChange={() => setSelectedSpreadsheet(sheet.id)}
                      className="accent-[#0F9D58]"
                    />
                    <div>
                      <p className="text-xs font-medium text-gray-900">{sheet.name}</p>
                      <p className="text-[11px] text-gray-500">{sheet.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              {selectedSpreadsheet === "create_new" && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Spreadsheet name</label>
                  <input type="text" defaultValue="HostFi Expenses" className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0F9D58]/20 focus:outline-none" />
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setStep("connect")} className="flex-1 py-3 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                  Back
                </button>
                <button onClick={() => setStep("mapping")} className="flex-1 py-3 text-sm font-semibold text-white bg-[#0F9D58] hover:bg-[#0D8C4D] rounded-xl transition-colors">
                  Next
                </button>
              </div>
            </div>
          )}

          {step === "mapping" && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Map columns</h4>
                <p className="text-xs text-gray-500">Tell HostFi where each field should go</p>
              </div>
              <div className="space-y-3">
                {[
                  { key: "date", label: "Expense Date", default: "A" },
                  { key: "property", label: "Property", default: "B" },
                  { key: "category", label: "Category", default: "C" },
                  { key: "amount", label: "Amount", default: "D" },
                  { key: "vendor", label: "Vendor", default: "E" },
                ].map((field) => (
                  <div key={field.key} className="flex items-center gap-3">
                    <span className="text-xs text-gray-700 font-medium w-28 shrink-0">{field.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                    <select
                      value={columnMappings[field.key as keyof typeof columnMappings]}
                      onChange={(e) => setColumnMappings(prev => ({ ...prev, [field.key]: e.target.value }))}
                      className="flex-1 px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0F9D58]/20 focus:outline-none"
                    >
                      {["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"].map(col => (
                        <option key={col} value={col}>Column {col}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-700 mb-2">Preview</p>
                <div className="flex gap-1 text-[10px] font-mono">
                  {Object.entries(columnMappings).map(([key, col]) => (
                    <div key={key} className="flex-1 bg-white border border-gray-200 rounded px-2 py-1.5 text-center">
                      <div className="text-gray-400">{col}</div>
                      <div className="text-gray-700 capitalize">{key}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Sync frequency</label>
                <select className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0F9D58]/20 focus:outline-none">
                  <option>Real-time (on every change)</option>
                  <option>Every hour</option>
                  <option>Every 6 hours</option>
                  <option>Daily</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep("spreadsheet")} className="flex-1 py-3 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                  Back
                </button>
                <button onClick={handleFinish} disabled={syncing} className="flex-1 py-3 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 rounded-xl transition-colors flex items-center justify-center gap-2">
                  {syncing ? <><RefreshCw className="w-4 h-4 animate-spin" /> Enabling sync...</> : <>Enable Sync</>}
                </button>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto"><Check className="w-8 h-8 text-teal-500" /></div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">Google Sheets Connected</h4>
                <p className="text-sm text-gray-500 mt-1">Syncing 24 expenses. Updates in real-time.</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-left space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-gray-500">Spreadsheet</span><span className="font-medium text-gray-700">{selectedSpreadsheet === "create_new" ? "HostFi Expenses" : "STR Expense Tracker 2026"}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Columns mapped</span><span className="font-medium text-gray-700">5 fields</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Sync frequency</span><span className="font-medium text-gray-700">Real-time</span></div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-[#0F9D58] bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
                <ExternalLink className="w-3.5 h-3.5" /> Open in Google Sheets
              </a>
              <button onClick={onClose} className="w-full py-3 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 rounded-xl transition-colors">Done</button>
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
