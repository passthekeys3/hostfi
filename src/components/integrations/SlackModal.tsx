"use client";

import { useState, useId } from "react";
import { Check, X, ArrowRight, RefreshCw, ChevronRight, ExternalLink, Shield, Clock, Settings2, AlertCircle, Zap, Link2 } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import type { ModalProps } from "./types";

export function SlackConnectModal({ onClose }: ModalProps) {
  const [step, setStep] = useState<"intro" | "channels" | "notifications" | "success">("intro");
  const [syncing, setSyncing] = useState(false);
  const [expenseChannel, setExpenseChannel] = useState("#expenses");
  const [alertChannel, setAlertChannel] = useState("#hostfi-alerts");
  const titleId = useId();
  const modalRef = useFocusTrap<HTMLDivElement>(true, { onEscape: onClose });

  const handleAuthorize = () => setStep("channels");
  const handleChannelsDone = () => setStep("notifications");

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
            <div className="w-10 h-10 bg-[#4A154B] rounded-xl flex items-center justify-center text-white text-sm font-bold" aria-hidden="true">SL</div>
            <div>
              <h2 id={titleId} className="text-base font-semibold text-gray-900">Connect Slack</h2>
              <p className="text-xs text-gray-400">Two-way receipt & alert sync</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close modal" className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/40">
            <X className="w-4 h-4 text-gray-400" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6">
          {step === "intro" && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-900">How it works</h4>

                <div className="bg-[#4A154B]/5 border border-[#4A154B]/15 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-[#4A154B]">Slack to HostFi</p>
                  {[
                    "Drop a receipt photo or invoice PDF in your expense channel",
                    "HostFi bot parses it with AI — extracts vendor, amount, date, category",
                    "Bot replies in-thread with parsed details and matched property",
                    "Expense appears in HostFi inbox for review/approval",
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-[10px] font-bold text-[#4A154B] bg-[#4A154B]/10 w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      <p className="text-xs text-gray-600">{item}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-teal-700">HostFi to Slack</p>
                  {[
                    { label: "Bill alerts", desc: "New bills parsed, due date reminders" },
                    { label: "Anomaly warnings", desc: "Unusual charges, possible leaks, rate spikes" },
                    { label: "Weekly digest", desc: "Spending summary across all properties" },
                    { label: "Approval requests", desc: "Team members can approve expenses via emoji reaction" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <ArrowRight className="w-3.5 h-3.5 text-teal-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-gray-900">{item.label}</p>
                        <p className="text-[11px] text-gray-500">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <Shield className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700">HostFi only accesses channels you explicitly choose. We use Slack&apos;s OAuth with granular bot scopes.</p>
              </div>

              <button onClick={handleAuthorize} className="w-full py-3 text-sm font-semibold text-white bg-[#4A154B] hover:bg-[#3B1140] rounded-xl transition-colors flex items-center justify-center gap-2">
                Add to Slack <ExternalLink className="w-4 h-4" />
              </button>
              <p className="text-center text-[10px] text-gray-400">Demo mode — no actual Slack redirect.</p>
            </div>
          )}

          {step === "channels" && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Configure channels</h4>
                <p className="text-xs text-gray-500">Choose where HostFi listens and sends messages</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Expense upload channel</label>
                  <p className="text-[11px] text-gray-500 mb-2">Team members drop receipts and invoices here for parsing</p>
                  <select value={expenseChannel} onChange={e => setExpenseChannel(e.target.value)} className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4A154B]/20 focus:outline-none">
                    <option>#expenses</option>
                    <option>#receipts</option>
                    <option>#invoices</option>
                    <option>#accounting</option>
                    <option>Create new channel...</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Alert channel</label>
                  <p className="text-[11px] text-gray-500 mb-2">HostFi sends notifications and summaries here</p>
                  <select value={alertChannel} onChange={e => setAlertChannel(e.target.value)} className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4A154B]/20 focus:outline-none">
                    <option>#hostfi-alerts</option>
                    <option>#alerts</option>
                    <option>#finance</option>
                    <option>#general</option>
                    <option>Create new channel...</option>
                  </select>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-gray-700 mb-3">Supported file types</p>
                  <div className="flex flex-wrap gap-2">
                    {["JPG/PNG (photos)", "PDF (invoices)", "HEIC (iPhone)", "CSV (statements)"].map((type) => (
                      <span key={type} className="px-2.5 py-1 text-[11px] font-medium text-gray-600 bg-white border border-gray-200 rounded-lg">{type}</span>
                    ))}
                  </div>
                </div>
              </div>

              <button onClick={handleChannelsDone} className="w-full py-3 text-sm font-semibold text-white bg-[#4A154B] hover:bg-[#3B1140] rounded-xl transition-colors">
                Next: Notification Settings
              </button>
            </div>
          )}

          {step === "notifications" && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Notification preferences</h4>
                <p className="text-xs text-gray-500">Choose what HostFi sends to Slack</p>
              </div>

              <div className="space-y-3">
                {[
                  { label: "New bill parsed", desc: "When a bill is parsed from email or receipt", default: true },
                  { label: "Bill due reminders", desc: "3 days before a bill is due", default: true },
                  { label: "Overdue alerts", desc: "When a bill passes its due date", default: true },
                  { label: "Anomaly detection", desc: "Unusual charges or possible issues", default: true },
                  { label: "Weekly spending digest", desc: "Summary every Monday morning", default: true },
                  { label: "Monthly P&L report", desc: "Full financial summary on the 1st", default: false },
                  { label: "Receipt confirmation", desc: "Confirm when a Slack receipt is processed", default: true },
                  { label: "Approval requests", desc: "Ask for emoji approval on expenses over threshold", default: false },
                ].map((notif, i) => (
                  <label key={i} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                    <input type="checkbox" defaultChecked={notif.default} className="mt-0.5 accent-[#4A154B]" />
                    <div>
                      <p className="text-xs font-medium text-gray-900">{notif.label}</p>
                      <p className="text-[11px] text-gray-500">{notif.desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Approval threshold (optional)</label>
                <p className="text-[11px] text-gray-500 mb-2">Expenses above this amount require emoji approval in Slack</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">$</span>
                  <input type="number" defaultValue="500" className="w-32 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4A154B]/20 focus:outline-none" />
                </div>
              </div>

              <button onClick={handleFinish} disabled={syncing} className="w-full py-3 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 rounded-xl transition-colors flex items-center justify-center gap-2">
                {syncing ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Connecting...</>
                ) : (
                  <>Save & Connect</>
                )}
              </button>
            </div>
          )}

          {step === "success" && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-teal-500" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">Slack Connected</h4>
                <p className="text-sm text-gray-500 mt-1">HostFi bot is now active in your workspace.</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Upload channel</span>
                  <span className="font-medium text-gray-700">{expenseChannel}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Alert channel</span>
                  <span className="font-medium text-gray-700">{alertChannel}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Receipt parsing</span>
                  <span className="font-medium text-teal-600">Active</span>
                </div>
              </div>
              <div className="bg-[#4A154B]/5 border border-[#4A154B]/15 rounded-xl p-4 text-left">
                <p className="text-xs font-medium text-[#4A154B] mb-2">Try it now</p>
                <p className="text-[11px] text-gray-600">Drop a receipt image in <code className="bg-white px-1.5 py-0.5 rounded text-[#4A154B] text-[10px]">{expenseChannel}</code> and watch HostFi parse it in seconds.</p>
              </div>
              <button onClick={onClose} className="w-full py-3 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 rounded-xl transition-colors">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

