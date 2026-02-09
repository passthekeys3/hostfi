"use client";

import { useState, useId } from "react";
import { Check, X, ArrowRight, RefreshCw, ChevronRight, ExternalLink, Shield, Clock, Settings2, AlertCircle, Zap, Link2 } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import type { ModalProps } from "./types";
import { cn } from "@/lib/utils";

export function MakeModal({ onClose }: ModalProps) {
  const [step, setStep] = useState<"templates" | "connect" | "activate" | "success">("templates");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const titleId = useId();
  const modalRef = useFocusTrap<HTMLDivElement>(true, { onEscape: onClose });

  const templates = [
    { id: "expense_slack", name: "New Expense → Slack Alert", desc: "Post a message to Slack whenever a new expense is recorded", icon: "SL", color: "bg-[#4A154B]" },
    { id: "anomaly_email", name: "Anomaly → Email Alert", desc: "Send an email when AI detects an unusual charge", icon: "EM", color: "bg-[#EA4335]" },
    { id: "monthly_sheets", name: "Monthly Report → Google Sheets", desc: "Export monthly P&L to a Google Sheet on the 1st", icon: "GS", color: "bg-[#0F9D58]" },
    { id: "bill_due_sms", name: "Bill Due → SMS Reminder", desc: "Text reminder 3 days before a bill is due", icon: "SM", color: "bg-[#F22F46]" },
    { id: "receipt_drive", name: "New Receipt → Google Drive", desc: "Save every parsed receipt to a Drive folder", icon: "GD", color: "bg-[#4285F4]" },
    { id: "weekly_teams", name: "Weekly Digest → Teams", desc: "Post a weekly spending summary to Microsoft Teams", icon: "MT", color: "bg-[#6264A7]" },
  ];

  const handleFinish = () => {
    setSyncing(true);
    setTimeout(() => { setSyncing(false); setStep("success"); }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[90vh] safe-area-bottom overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#6D00CC] rounded-xl flex items-center justify-center text-white text-sm font-bold" aria-hidden="true">MK</div>
            <div>
              <h2 id={titleId} className="text-base font-semibold text-gray-900">Connect Make</h2>
              <p className="text-xs text-gray-400">Visual automation platform</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close modal" className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/40"><X className="w-4 h-4 text-gray-400" aria-hidden="true" /></button>
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-between mb-2">
            {["Templates", "Connect", "Activate", "Done"].map((label, i) => {
              const stepIndex = ["templates", "connect", "activate", "success"].indexOf(step);
              const isActive = i <= stepIndex;
              const isCurrent = i === stepIndex;
              return (
                <div key={label} className="flex-1 flex items-center">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                    isCurrent ? "bg-[#6D00CC] text-white" : isActive ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-400"
                  )}>
                    {isActive && i < stepIndex ? <Check className="w-3 h-3" /> : i + 1}
                  </div>
                  {i < 3 && <div className={cn("flex-1 h-0.5 mx-2", isActive && i < stepIndex ? "bg-teal-500" : "bg-gray-100")} />}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 px-1">
            <span>Templates</span><span>Connect</span><span>Activate</span><span>Done</span>
          </div>
        </div>

        <div className="p-6">
          {step === "templates" && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Pre-built scenarios</h4>
                <p className="text-xs text-gray-500">Select a scenario to get started, or browse all in Make</p>
              </div>
              <div className="space-y-2">
                {templates.map((t) => (
                  <label key={t.id} className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    selectedTemplate === t.id ? "border-[#6D00CC] bg-[#6D00CC]/5" : "border-gray-200 hover:bg-gray-50"
                  )}>
                    <input
                      type="radio"
                      name="template"
                      value={t.id}
                      checked={selectedTemplate === t.id}
                      onChange={() => setSelectedTemplate(t.id)}
                      className="accent-[#6D00CC]"
                    />
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0", t.color)}>
                      {t.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900">{t.name}</p>
                      <p className="text-[11px] text-gray-500 truncate">{t.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              <button onClick={() => setStep("connect")} disabled={!selectedTemplate} className="w-full py-3 text-sm font-semibold text-white bg-[#6D00CC] hover:bg-[#5C00AD] disabled:bg-gray-200 disabled:text-gray-400 rounded-xl transition-colors">
                Next: Connect Account
              </button>
            </div>
          )}

          {step === "connect" && (
            <div className="space-y-6">
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-[#6D00CC]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-[#6D00CC]" />
                </div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Connect Make Account</h4>
                <p className="text-xs text-gray-500">Authorize HostFi to create scenarios in your Make workspace</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-700">Permissions:</p>
                {["Create and manage scenarios", "Access HostFi triggers and actions", "Read scenario execution logs"].map((perm, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                    <Check className="w-3.5 h-3.5 text-teal-500" />{perm}
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep("templates")} className="flex-1 py-3 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                  Back
                </button>
                <button onClick={() => setStep("activate")} className="flex-1 py-3 text-sm font-semibold text-white bg-[#6D00CC] hover:bg-[#5C00AD] rounded-xl transition-colors flex items-center justify-center gap-2">
                  Authorize <ExternalLink className="w-4 h-4" />
                </button>
              </div>
              <p className="text-center text-[10px] text-gray-400">Demo mode — no actual Make redirect.</p>
            </div>
          )}

          {step === "activate" && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Activate scenario</h4>
                <p className="text-xs text-gray-500">Review and turn on your automation</p>
              </div>
              <div className="bg-[#6D00CC]/5 border border-[#6D00CC]/20 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-[#6D00CC] flex items-center justify-center text-white text-xs font-bold">MK</div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{templates.find(t => t.id === selectedTemplate)?.name}</p>
                    <p className="text-xs text-gray-500">Ready to activate</p>
                  </div>
                </div>
                <p className="text-xs text-gray-600">{templates.find(t => t.id === selectedTemplate)?.desc}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-700">Scenario settings</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Run frequency</label>
                    <select className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#6D00CC]/20 focus:outline-none">
                      <option>Immediately (on trigger)</option>
                      <option>Every 15 minutes</option>
                      <option>Every hour</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                    <input type="checkbox" defaultChecked className="accent-[#6D00CC]" />
                    Enable error notifications
                  </label>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep("connect")} className="flex-1 py-3 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                  Back
                </button>
                <button onClick={handleFinish} disabled={syncing} className="flex-1 py-3 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 rounded-xl transition-colors flex items-center justify-center gap-2">
                  {syncing ? <><RefreshCw className="w-4 h-4 animate-spin" /> Activating...</> : <>Activate Scenario</>}
                </button>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto"><Check className="w-8 h-8 text-teal-500" /></div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">Make Connected</h4>
                <p className="text-sm text-gray-500 mt-1">Your scenario is now running.</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-left space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-gray-500">Scenario</span><span className="font-medium text-gray-700">{templates.find(t => t.id === selectedTemplate)?.name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Status</span><span className="font-medium text-teal-600">Active</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Frequency</span><span className="font-medium text-gray-700">Immediately</span></div>
              </div>
              <a href="https://make.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-[#6D00CC] bg-[#6D00CC]/10 border border-[#6D00CC]/20 rounded-lg hover:bg-[#6D00CC]/20 transition-colors">
                <ExternalLink className="w-3.5 h-3.5" /> Open in Make
              </a>
              <button onClick={onClose} className="w-full py-3 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 rounded-xl transition-colors">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

