"use client";

import { useState, useId, useEffect, useCallback } from "react";
import { Check, X, RefreshCw, ExternalLink, Shield, Unlink, FolderOpen, Loader2 } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import type { GoogleDriveModalProps } from "./types";
import { cn } from "@/lib/utils";
import { GooglePicker, type GooglePickerFile } from "@/components/google-picker";

export function GoogleDriveModal({ onClose, isConnected: initialConnected, onDisconnect }: GoogleDriveModalProps) {
  const [step, setStep] = useState<"connect" | "folder" | "config" | "success" | "connected">(initialConnected ? "connected" : "connect");
  const [syncing, setSyncing] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState("create_new");
  const [connectionInfo, setConnectionInfo] = useState<{
    folderUrl: string | null;
    folderName: string | null;
    lastBackup: string | null;
  } | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loadingToken, setLoadingToken] = useState(false);
  const [changingFolder, setChangingFolder] = useState(false);
  const titleId = useId();
  const modalRef = useFocusTrap<HTMLDivElement>(true, { onEscape: onClose });

  // Load connection info and access token if connected
  useEffect(() => {
    if (initialConnected) {
      fetch("/api/integrations/google/connection")
        .then((res) => res.json())
        .then((data) => {
          if (data.drive?.connected) {
            setConnectionInfo({
              folderUrl: data.drive.folderUrl || null,
              folderName: data.drive.folderName || "HostFi",
              lastBackup: data.drive.lastBackup || null,
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
        setLoadingToken(false);
        return data.access_token;
      }
    } catch (err) {
      console.error("Failed to fetch access token:", err);
    }
    setLoadingToken(false);
    return null;
  }, [accessToken]);

  const handleFolderSelect = useCallback(async (file: GooglePickerFile) => {
    setChangingFolder(true);
    try {
      const res = await fetch("/api/integrations/google/update-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "google_drive",
          metadata: {
            hostfi_folder_id: file.id,
            folder_url: file.url,
            folder_name: file.name,
          },
        }),
      });

      if (res.ok) {
        setConnectionInfo((prev) => ({
          ...prev,
          folderUrl: file.url,
          folderName: file.name,
          lastBackup: prev?.lastBackup || null,
        }));
      }
    } catch (err) {
      console.error("Failed to update folder:", err);
    }
    setChangingFolder(false);
  }, []);

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
        .eq("provider", "google_drive");

      onDisconnect?.();
      onClose();
    } catch {}
  };

  const formatLastBackup = (iso: string | null) => {
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
    setTimeout(() => { setSyncing(false); setStep("success"); }, 1500);
  };

  const stepLabels = ["Connect", "Folder", "Configure", "Enable"];
  const stepKeys = ["connect", "folder", "config", "success"];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[90vh] safe-area-bottom overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <img src="/logos/googledrive.svg" alt="Google Drive" className="w-10 h-10 rounded-xl object-contain" />
            <div>
              <h2 id={titleId} className="text-base font-semibold text-gray-900">Connect Google Drive</h2>
              <p className="text-xs text-gray-400">Auto-backup receipts & reports</p>
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
                      isCurrent ? "bg-[#4285F4] text-white" : isActive ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-400"
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

        <div className="p-6">
          {step === "connect" && (
            <div className="space-y-6">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-900">Auto-organized file structure</h4>
                <div className="bg-gray-50 rounded-xl p-4 font-mono text-xs text-gray-600 space-y-1">
                  <p className="text-gray-900 font-semibold">HostFi/</p>
                  <p className="pl-4">Venice Beach Unit/</p>
                  <p className="pl-8">2026-01/ receipts, invoices</p>
                  <p className="pl-8">2026-02/ receipts, invoices</p>
                  <p className="pl-4">Silver Lake Duplex/</p>
                  <p className="pl-8">2026-01/ ...</p>
                  <p className="pl-4">Reports/</p>
                  <p className="pl-8">Monthly-Summary-Jan-2026.pdf</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <Shield className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700">HostFi uses Google OAuth. We only access the folder you choose.</p>
              </div>
              <a href="/api/integrations/google/auth" className="w-full py-3 text-sm font-semibold text-white bg-[#4285F4] hover:bg-[#3574D4] rounded-xl transition-colors flex items-center justify-center gap-2">
                Connect Google Account <ExternalLink className="w-4 h-4" />
              </a>
              <p className="text-center text-[10px] text-gray-400">You&apos;ll be redirected to Google to authorize access.</p>
            </div>
          )}

          {step === "folder" && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Select folder</h4>
                <p className="text-xs text-gray-500">Choose where HostFi saves your files</p>
              </div>
              <div className="space-y-2">
                {[
                  { id: "create_new", name: "Create new folder", desc: "HostFi will create /HostFi in your Drive" },
                  { id: "my_drive_hostfi", name: "My Drive / HostFi", desc: "Existing folder — last modified: Feb 3, 2026" },
                  { id: "business_receipts", name: "My Drive / Business / Receipts", desc: "Existing folder — last modified: Jan 20, 2026" },
                  { id: "shared_accounting", name: "Shared / Accounting", desc: "Shared folder with your CPA" },
                ].map((folder) => (
                  <label key={folder.id} className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    selectedFolder === folder.id ? "border-[#4285F4] bg-[#4285F4]/5" : "border-gray-200 hover:bg-gray-50"
                  )}>
                    <input
                      type="radio"
                      name="folder"
                      value={folder.id}
                      checked={selectedFolder === folder.id}
                      onChange={() => setSelectedFolder(folder.id)}
                      className="accent-[#4285F4]"
                    />
                    <div>
                      <p className="text-xs font-medium text-gray-900">{folder.name}</p>
                      <p className="text-[11px] text-gray-500">{folder.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep("connect")} className="flex-1 py-3 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                  Back
                </button>
                <button onClick={() => setStep("config")} className="flex-1 py-3 text-sm font-semibold text-white bg-[#4285F4] hover:bg-[#3574D4] rounded-xl transition-colors">
                  Next
                </button>
              </div>
            </div>
          )}

          {step === "config" && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Configure auto-upload</h4>
                <p className="text-xs text-gray-500">Choose which files to sync automatically</p>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Receipts", desc: "Parsed receipt images (JPG, PNG, HEIC)", default: true },
                  { label: "Reports", desc: "Monthly P&L summaries and spending reports", default: true },
                  { label: "Tax documents", desc: "Schedule E, year-end exports, and tax prep files", default: true },
                ].map((item, i) => (
                  <label key={i} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                    <input type="checkbox" defaultChecked={item.default} className="accent-[#4285F4]" />
                    <div>
                      <p className="text-xs font-medium text-gray-900">{item.label}</p>
                      <p className="text-[11px] text-gray-500">{item.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Folder organization</label>
                <select className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4285F4]/20 focus:outline-none">
                  <option>By Property → Month (recommended)</option>
                  <option>By Month → Property</option>
                  <option>By Document Type → Property</option>
                  <option>Flat (all in one folder)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Share with (optional)</label>
                <input type="email" placeholder="cpa@example.com" className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4285F4]/20 focus:outline-none" />
                <p className="text-[11px] text-gray-400 mt-1">They&apos;ll get view-only access to the folder</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep("folder")} className="flex-1 py-3 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                  Back
                </button>
                <button onClick={handleFinish} disabled={syncing} className="flex-1 py-3 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 rounded-xl transition-colors flex items-center justify-center gap-2">
                  {syncing ? <><RefreshCw className="w-4 h-4 animate-spin" /> Enabling...</> : <>Enable Auto-Upload</>}
                </button>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto"><Check className="w-8 h-8 text-teal-500" /></div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">Google Drive Connected</h4>
                <p className="text-sm text-gray-500 mt-1">All receipts and reports will auto-sync.</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-left space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-gray-500">Folder</span><span className="font-medium text-gray-700">/HostFi</span></div>
                <div className="flex justify-between"><span className="text-gray-500">File types</span><span className="font-medium text-gray-700">Receipts, Reports, Tax docs</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Organization</span><span className="font-medium text-gray-700">Property → Month</span></div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-[#4285F4] bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                <ExternalLink className="w-3.5 h-3.5" /> Open in Google Drive
              </a>
              <button onClick={onClose} className="w-full py-3 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 rounded-xl transition-colors">Done</button>
            </div>
          )}

          {step === "connected" && (
            <div className="space-y-6">
              {/* Connected status */}
              <div className="flex items-center gap-3 p-4 bg-teal-50 rounded-xl border border-teal-100">
                <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-teal-900">Connected</p>
                  <p className="text-xs text-teal-700">Google Drive integration is active</p>
                </div>
              </div>

              {/* Current folder */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#4285F4] rounded-lg flex items-center justify-center">
                      <FolderOpen className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {connectionInfo?.folderName || "HostFi"}
                      </p>
                      <p className="text-xs text-gray-500">Backup folder</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {connectionInfo?.folderUrl ? (
                    <a
                      href={connectionInfo.folderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 text-xs font-medium text-[#4285F4] bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink className="w-3 h-3" /> Open in Drive
                    </a>
                  ) : (
                    <a
                      href="https://drive.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 text-xs font-medium text-[#4285F4] bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink className="w-3 h-3" /> Open Drive
                    </a>
                  )}
                  <GooglePicker
                    accessToken={accessToken || "pending"}
                    mode="folder"
                    onSelect={handleFolderSelect}
                    autoRefreshToken
                    buttonText={changingFolder ? "Changing..." : "Change Folder"}
                    className="flex-1 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                  />
                </div>
              </div>

              {/* Connection details */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Last backup</span>
                  <span className="font-medium text-gray-700">{formatLastBackup(connectionInfo?.lastBackup || null)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Organization</span>
                  <span className="font-medium text-gray-700">Property → Month</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">File types</span>
                  <span className="font-medium text-gray-700">Receipts, Reports</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={handleDisconnect}
                  className="w-full py-3 text-sm font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Unlink className="w-4 h-4" /> Disconnect
                </button>
              </div>

              <button onClick={onClose} className="w-full py-3 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors">
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
