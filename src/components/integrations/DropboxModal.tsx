"use client";

import { useState, useId } from "react";
import { Check, X, ArrowRight, RefreshCw, ChevronRight, ExternalLink, Shield, Clock, Settings2, AlertCircle, Zap, Link2 } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import type { ModalProps } from "./types";
import { cn } from "@/lib/utils";

export function DropboxModal({ onClose }: ModalProps) {
  const [step, setStep] = useState<"intro" | "folder" | "config" | "success">("intro");
  const [syncing, setSyncing] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState("/HostFi");
  const titleId = useId();
  const modalRef = useFocusTrap<HTMLDivElement>(true, { onEscape: onClose });

  const handleFinish = () => {
    setSyncing(true);
    setTimeout(() => { setSyncing(false); setStep("success"); }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[90vh] safe-area-bottom overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0061FF] rounded-xl flex items-center justify-center text-white text-sm font-bold" aria-hidden="true">DB</div>
            <div>
              <h2 id={titleId} className="text-base font-semibold text-gray-900">Connect Dropbox</h2>
              <p className="text-xs text-gray-400">Auto-backup receipts & reports</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close modal" className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/40"><X className="w-4 h-4 text-gray-400" aria-hidden="true" /></button>
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-between mb-2">
            {["Connect", "Select Folder", "Configure", "Enable"].map((label, i) => {
              const stepIndex = ["intro", "folder", "config", "success"].indexOf(step);
              const isActive = i <= stepIndex;
              const isCurrent = i === stepIndex;
              return (
                <div key={label} className="flex-1 flex items-center">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                    isCurrent ? "bg-[#0061FF] text-white" : isActive ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-400"
                  )}>
                    {isActive && i < stepIndex ? <Check className="w-3 h-3" /> : i + 1}
                  </div>
                  {i < 3 && <div className={cn("flex-1 h-0.5 mx-2", isActive && i < stepIndex ? "bg-teal-500" : "bg-gray-100")} />}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 px-1">
            <span>Connect</span><span>Folder</span><span>Config</span><span>Enable</span>
          </div>
        </div>

        <div className="p-6">
          {step === "intro" && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-900">Auto-backup your financial files</h4>
                {[
                  { label: "Receipt images", desc: "Every parsed receipt automatically saved" },
                  { label: "Invoice PDFs", desc: "Bills forwarded from email" },
                  { label: "Monthly reports", desc: "P&L summaries and spending reports" },
                  { label: "Tax documents", desc: "Schedule E and year-end exports" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#0061FF]/10 flex items-center justify-center shrink-0 mt-0.5">
                      <ArrowRight className="w-4 h-4 text-[#0061FF]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <Shield className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700">HostFi uses Dropbox OAuth. We only access the folder you choose.</p>
              </div>
              <button onClick={() => setStep("folder")} className="w-full py-3 text-sm font-semibold text-white bg-[#0061FF] hover:bg-[#0052D4] rounded-xl transition-colors flex items-center justify-center gap-2">
                Connect Dropbox <ExternalLink className="w-4 h-4" />
              </button>
              <p className="text-center text-[10px] text-gray-400">Demo mode — no actual Dropbox redirect.</p>
            </div>
          )}

          {step === "folder" && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Select sync folder</h4>
                <p className="text-xs text-gray-500">Choose where HostFi saves your files</p>
              </div>
              <div className="space-y-2">
                {["/HostFi", "/HostFi/Receipts", "/Business/STR Finances", "/Taxes/2026"].map((folder) => (
                  <label key={folder} className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    selectedFolder === folder ? "border-[#0061FF] bg-[#0061FF]/5" : "border-gray-200 hover:bg-gray-50"
                  )}>
                    <input
                      type="radio"
                      name="folder"
                      value={folder}
                      checked={selectedFolder === folder}
                      onChange={() => setSelectedFolder(folder)}
                      className="accent-[#0061FF]"
                    />
                    <span className="text-sm text-gray-700 font-mono">{folder}</span>
                  </label>
                ))}
                <button className="w-full py-2.5 text-xs font-medium text-[#0061FF] bg-[#0061FF]/5 border border-[#0061FF]/20 rounded-lg hover:bg-[#0061FF]/10 transition-colors">
                  Create new folder...
                </button>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep("intro")} className="flex-1 py-3 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                  Back
                </button>
                <button onClick={() => setStep("config")} className="flex-1 py-3 text-sm font-semibold text-white bg-[#0061FF] hover:bg-[#0052D4] rounded-xl transition-colors">
                  Next
                </button>
              </div>
            </div>
          )}

          {step === "config" && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Configure sync settings</h4>
                <p className="text-xs text-gray-500">Choose what to sync and how</p>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-medium text-gray-700">File types to sync</p>
                {[
                  { label: "Receipt images", desc: "JPG, PNG, HEIC files", default: true },
                  { label: "Invoice PDFs", desc: "Parsed bill documents", default: true },
                  { label: "Monthly reports", desc: "P&L summaries", default: true },
                  { label: "Tax exports", desc: "Schedule E, annual reports", default: true },
                  { label: "CSV exports", desc: "Raw data exports", default: false },
                ].map((item, i) => (
                  <label key={i} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                    <input type="checkbox" defaultChecked={item.default} className="accent-[#0061FF]" />
                    <div>
                      <p className="text-xs font-medium text-gray-900">{item.label}</p>
                      <p className="text-[11px] text-gray-500">{item.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Folder structure</label>
                <select className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0061FF]/20 focus:outline-none">
                  <option>By Property → Month (recommended)</option>
                  <option>By Month → Property</option>
                  <option>By Document Type → Property</option>
                  <option>Flat (all files in one folder)</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep("folder")} className="flex-1 py-3 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                  Back
                </button>
                <button onClick={handleFinish} disabled={syncing} className="flex-1 py-3 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 rounded-xl transition-colors flex items-center justify-center gap-2">
                  {syncing ? <><RefreshCw className="w-4 h-4 animate-spin" /> Enabling...</> : <>Enable Sync</>}
                </button>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto"><Check className="w-8 h-8 text-teal-500" /></div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">Dropbox Connected</h4>
                <p className="text-sm text-gray-500 mt-1">Files will sync to <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{selectedFolder}</code></p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-left space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-gray-500">Sync folder</span><span className="font-medium text-gray-700 font-mono">{selectedFolder}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">File types</span><span className="font-medium text-gray-700">Receipts, PDFs, Reports</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Structure</span><span className="font-medium text-gray-700">Property → Month</span></div>
              </div>
              <button onClick={onClose} className="w-full py-3 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 rounded-xl transition-colors">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

