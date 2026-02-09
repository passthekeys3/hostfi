"use client";

import { useState, useId } from "react";
import { Check, X, ArrowRight, RefreshCw, ChevronRight, ExternalLink, Shield, Clock, Settings2, AlertCircle, Zap, Link2 } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import type { ModalProps } from "./types";
import { cn } from "@/lib/utils";

export function EmailAlertsModal({ onClose }: ModalProps) {
  const [step, setStep] = useState<"recipients" | "alerts" | "frequency" | "success">("recipients");
  const [syncing, setSyncing] = useState(false);
  const [emails, setEmails] = useState<string[]>([""]);
  const titleId = useId();
  const modalRef = useFocusTrap<HTMLDivElement>(true, { onEscape: onClose });

  const handleFinish = () => {
    setSyncing(true);
    setTimeout(() => { setSyncing(false); setStep("success"); }, 1000);
  };

  const addEmail = () => setEmails([...emails, ""]);
  const removeEmail = (index: number) => setEmails(emails.filter((_, i) => i !== index));
  const updateEmail = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const stepLabels = ["Recipients", "Alert Types", "Frequency", "Save"];
  const stepKeys = ["recipients", "alerts", "frequency", "success"];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[90vh] safe-area-bottom overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#EA4335] rounded-xl flex items-center justify-center text-white text-sm font-bold" aria-hidden="true">EM</div>
            <div>
              <h2 id={titleId} className="text-base font-semibold text-gray-900">Custom Email Alerts</h2>
              <p className="text-xs text-gray-400">Route alerts to your team</p>
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
                    isCurrent ? "bg-[#EA4335] text-white" : isActive ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-400"
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
          {step === "recipients" && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Add email recipients</h4>
                <p className="text-xs text-gray-500">Who should receive HostFi alerts?</p>
              </div>
              <div className="space-y-3">
                {emails.map((email, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => updateEmail(i, e.target.value)}
                      placeholder="email@example.com"
                      className="flex-1 px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                    />
                    {emails.length > 1 && (
                      <button onClick={() => removeEmail(i)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={addEmail} className="w-full py-2.5 text-xs font-medium text-teal-600 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors">
                  + Add another recipient
                </button>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-700 mb-2">Suggested recipients</p>
                <div className="space-y-2 text-xs text-gray-600">
                  <div className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-gray-400" /> Your own email for all alerts</div>
                  <div className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-gray-400" /> CPA for monthly reports</div>
                  <div className="flex items-center gap-2"><ArrowRight className="w-3 h-3 text-gray-400" /> Property manager for anomalies</div>
                </div>
              </div>
              <button onClick={() => setStep("alerts")} disabled={!emails.some(e => e.trim())} className="w-full py-3 text-sm font-semibold text-white bg-[#EA4335] hover:bg-[#D93025] disabled:bg-gray-200 disabled:text-gray-400 rounded-xl transition-colors">
                Next: Select Alert Types
              </button>
            </div>
          )}

          {step === "alerts" && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Select alert types</h4>
                <p className="text-xs text-gray-500">Choose which alerts to send to your recipients</p>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Anomaly alerts", desc: "Unusual charges, spending spikes, possible issues", default: true },
                  { label: "Due date reminders", desc: "Bills coming due in 3 days", default: true },
                  { label: "Overdue alerts", desc: "Bills past their due date", default: true },
                  { label: "Weekly digest", desc: "Spending summary every Monday at 9 AM", default: true },
                  { label: "Monthly report", desc: "Full P&L summary on the 1st of each month", default: false },
                ].map((alert, i) => (
                  <label key={i} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                    <input type="checkbox" defaultChecked={alert.default} className="accent-[#EA4335]" />
                    <div>
                      <p className="text-xs font-medium text-gray-900">{alert.label}</p>
                      <p className="text-[11px] text-gray-500">{alert.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep("recipients")} className="flex-1 py-3 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                  Back
                </button>
                <button onClick={() => setStep("frequency")} className="flex-1 py-3 text-sm font-semibold text-white bg-[#EA4335] hover:bg-[#D93025] rounded-xl transition-colors">
                  Next
                </button>
              </div>
            </div>
          )}

          {step === "frequency" && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Set frequency</h4>
                <p className="text-xs text-gray-500">Configure when each alert type is sent</p>
              </div>
              <div className="space-y-4">
                {[
                  { label: "Anomaly alerts", options: ["Immediately", "Daily digest", "Weekly digest"] },
                  { label: "Due date reminders", options: ["3 days before", "7 days before", "3 and 7 days before"] },
                  { label: "Overdue alerts", options: ["Immediately", "Daily at 9 AM", "Every 3 days"] },
                  { label: "Weekly digest", options: ["Monday 9 AM", "Friday 5 PM", "Sunday 8 PM"] },
                  { label: "Monthly report", options: ["1st at 9 AM", "Last day at 5 PM", "1st and 15th"] },
                ].map((config, i) => (
                  <div key={i}>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">{config.label}</label>
                    <select className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#EA4335]/20 focus:outline-none">
                      {config.options.map(opt => <option key={opt}>{opt}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-700 mb-2">Recipient summary</p>
                <div className="space-y-1 text-xs text-gray-600">
                  {emails.filter(e => e.trim()).map((email, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check className="w-3 h-3 text-teal-500" />{email}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep("alerts")} className="flex-1 py-3 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                  Back
                </button>
                <button onClick={handleFinish} disabled={syncing} className="flex-1 py-3 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 rounded-xl transition-colors flex items-center justify-center gap-2">
                  {syncing ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</> : <>Save Email Rules</>}
                </button>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto"><Check className="w-8 h-8 text-teal-500" /></div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">Email Alerts Configured</h4>
                <p className="text-sm text-gray-500 mt-1">Recipients will start receiving alerts based on your rules.</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-left space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-gray-500">Recipients</span><span className="font-medium text-gray-700">{emails.filter(e => e.trim()).length} configured</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Alert types</span><span className="font-medium text-gray-700">4 enabled</span></div>
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
