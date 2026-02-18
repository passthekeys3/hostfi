"use client";

import { useState, useId } from "react";
import { Check, X, ArrowRight, RefreshCw, ChevronRight, ExternalLink, Shield, Clock, Settings2, AlertCircle, Zap, Link2 } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import type { ModalProps } from "./types";
import { cn } from "@/lib/utils";

export function TeamsModal({ onClose }: ModalProps) {
  const [step, setStep] = useState<"connect" | "channel" | "notifications" | "success">("connect");
  const [syncing, setSyncing] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState("general_expenses");
  const [testSent, setTestSent] = useState(false);
  const titleId = useId();
  const modalRef = useFocusTrap<HTMLDivElement>(true, { onEscape: onClose });

  const handleTest = () => {
    setTestSent(true);
    setTimeout(() => {
      setSyncing(true);
      setTimeout(() => { setSyncing(false); setStep("success"); }, 1500);
    }, 1000);
  };

  const stepLabels = ["Connect", "Channel", "Notifications", "Test"];
  const stepKeys = ["connect", "channel", "notifications", "success"];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[90vh] safe-area-bottom overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <img src="/logos/teams.svg" alt="Microsoft Teams" className="w-10 h-10 rounded-xl object-contain" />
            <div>
              <h2 id={titleId} className="text-base font-semibold text-gray-900">Connect Microsoft Teams</h2>
              <p className="text-xs text-gray-400">Receipt upload & alerts</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close modal" className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/40"><X className="w-4 h-4 text-gray-400" aria-hidden="true" /></button>
        </div>

        {/* Step indicator */}
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
                    isCurrent ? "bg-[#6264A7] text-white" : isActive ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-400"
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

        <div className="p-6">
          {step === "connect" && (
            <div className="space-y-6">
              <div className="bg-[#6264A7]/5 border border-[#6264A7]/15 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-[#6264A7]">Teams to HostFi</p>
                {["Upload receipts or invoices in a Teams channel", "HostFi bot parses with AI and replies with details", "Approve expenses with Adaptive Card buttons", "Expense added to HostFi automatically"].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[10px] font-bold text-[#6264A7] bg-[#6264A7]/10 w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-xs text-gray-600">{item}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <Shield className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700">HostFi uses Microsoft OAuth. We only access channels you explicitly choose.</p>
              </div>
              <button onClick={() => setStep("channel")} className="w-full py-3 text-sm font-semibold text-white bg-[#6264A7] hover:bg-[#545699] rounded-xl transition-colors flex items-center justify-center gap-2">
                Connect Teams Workspace <ExternalLink className="w-4 h-4" />
              </button>
              <p className="text-center text-[10px] text-gray-400">Coming soon — Microsoft Teams integration is not yet available.</p>
            </div>
          )}

          {step === "channel" && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Select channel</h4>
                <p className="text-xs text-gray-500">Choose where HostFi posts notifications</p>
              </div>
              <div className="space-y-2">
                {[
                  { id: "general_expenses", name: "General > Expenses", desc: "Main team channel for expense updates" },
                  { id: "finance_alerts", name: "Finance > Alerts", desc: "Dedicated finance team channel" },
                  { id: "general_hostfi", name: "General > HostFi", desc: "Create a new HostFi-specific channel" },
                  { id: "create_new", name: "Create new channel", desc: "HostFi will create a new channel for you" },
                ].map((channel) => (
                  <label key={channel.id} className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    selectedChannel === channel.id ? "border-[#6264A7] bg-[#6264A7]/5" : "border-gray-200 hover:bg-gray-50"
                  )}>
                    <input
                      type="radio"
                      name="channel"
                      value={channel.id}
                      checked={selectedChannel === channel.id}
                      onChange={() => setSelectedChannel(channel.id)}
                      className="accent-[#6264A7]"
                    />
                    <div>
                      <p className="text-xs font-medium text-gray-900">{channel.name}</p>
                      <p className="text-[11px] text-gray-500">{channel.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep("connect")} className="flex-1 py-3 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                  Back
                </button>
                <button onClick={() => setStep("notifications")} className="flex-1 py-3 text-sm font-semibold text-white bg-[#6264A7] hover:bg-[#545699] rounded-xl transition-colors">
                  Next
                </button>
              </div>
            </div>
          )}

          {step === "notifications" && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Configure notifications</h4>
                <p className="text-xs text-gray-500">Choose which alerts to send to Teams</p>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Expense alerts", desc: "New expenses parsed and added", default: true },
                  { label: "Anomaly alerts", desc: "Unusual charges flagged by AI", default: true },
                  { label: "Weekly digest", desc: "Spending summary every Monday", default: true },
                  { label: "Monthly report", desc: "Full P&L posted on the 1st", default: false },
                ].map((notif, i) => (
                  <label key={i} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                    <input type="checkbox" defaultChecked={notif.default} className="accent-[#6264A7]" />
                    <div>
                      <p className="text-xs font-medium text-gray-900">{notif.label}</p>
                      <p className="text-[11px] text-gray-500">{notif.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-medium text-gray-700 mb-2">Test notification</p>
                <p className="text-[11px] text-gray-500 mb-3">Send a test message to verify the connection works.</p>
                <button
                  onClick={handleTest}
                  disabled={syncing || testSent}
                  className={cn(
                    "w-full py-3 text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2",
                    testSent ? "bg-teal-500 text-white" : "bg-[#6264A7] hover:bg-[#545699] text-white",
                    syncing && "bg-gray-200 text-gray-400"
                  )}
                >
                  {syncing ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> Connecting...</>
                  ) : testSent ? (
                    <><Check className="w-4 h-4" /> Test Sent!</>
                  ) : (
                    <>Send Test Notification</>
                  )}
                </button>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep("channel")} className="flex-1 py-3 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                  Back
                </button>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto"><Check className="w-8 h-8 text-teal-500" /></div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">Teams Connected</h4>
                <p className="text-sm text-gray-500 mt-1">HostFi bot is active in your Teams workspace.</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-left space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-gray-500">Channel</span><span className="font-medium text-gray-700">General &gt; Expenses</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Notifications</span><span className="font-medium text-gray-700">3 types enabled</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Status</span><span className="font-medium text-teal-600">Active</span></div>
              </div>
              <button onClick={onClose} className="w-full py-3 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 rounded-xl transition-colors">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

