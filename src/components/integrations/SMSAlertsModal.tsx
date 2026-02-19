"use client";

import { useState, useId } from "react";
import { Check, X, ArrowRight, RefreshCw, ChevronRight, ExternalLink, Shield, Clock, Settings2, AlertCircle, Zap, Link2 } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import type { ModalProps } from "./types";

export function SMSAlertsModal({ onClose }: ModalProps) {
  const [step, setStep] = useState<"config" | "success">("config");
  const [syncing, setSyncing] = useState(false);
  const [phone, setPhone] = useState("");
  const titleId = useId();
  const modalRef = useFocusTrap<HTMLDivElement>(true, { onEscape: onClose });

  const handleSave = () => {
    setSyncing(true);
    setTimeout(() => { setSyncing(false); setStep("success"); }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[90vh] safe-area-bottom overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#F22F46] rounded-xl flex items-center justify-center text-white text-sm font-bold" aria-hidden="true">SM</div>
            <div>
              <h2 id={titleId} className="text-base font-semibold text-gray-900">SMS Alerts</h2>
              <p className="text-xs text-gray-500 mt-0.5">Text message notifications</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close modal" className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/40"><X className="w-4 h-4 text-gray-400" aria-hidden="true" /></button>
        </div>
        <div className="px-6 py-5">
          {step === "config" && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Phone number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                />
                <p className="text-[11px] text-gray-400 mt-1">US and Canadian numbers supported. Standard SMS rates may apply.</p>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-medium text-gray-700">Alert types</p>
                {[
                  { label: "Bill due reminders", desc: "Text 3 days before a bill is due", default: true, example: "HostFi: $3,200 rent due in 3 days for Venice Beach Unit. Pay now at app.hostfi.ai" },
                  { label: "Overdue alerts", desc: "Immediate text when a bill is past due", default: true, example: "HostFi ALERT: $67.30 SoCalGas bill overdue for Venice Beach Unit!" },
                  { label: "Anomaly detection", desc: "Unusual charges or possible issues", default: true, example: "HostFi: Unusual charge detected — $320 HVAC at Joshua Tree (2.4x normal). Review: app.hostfi.ai" },
                  { label: "Weekly summary", desc: "Spending snapshot every Monday at 9 AM", default: false, example: "HostFi Weekly: $4,280 spent across 3 properties. 2 bills due this week. Details: app.hostfi.ai" },
                  { label: "New expense parsed", desc: "When AI parses a new bill or receipt", default: false, example: "HostFi: New bill parsed — $142.50 LADWP for Venice Beach Unit. Review: app.hostfi.ai" },
                ].map((alert, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" defaultChecked={alert.default} className="mt-0.5 accent-teal-500" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-900">{alert.label}</p>
                        <p className="text-[11px] text-gray-500">{alert.desc}</p>
                        <div className="mt-2 bg-gray-100 rounded-lg px-3 py-2">
                          <p className="text-[10px] text-gray-500 font-medium mb-0.5">Example message:</p>
                          <p className="text-[11px] text-gray-700 italic">{alert.example}</p>
                        </div>
                      </div>
                    </label>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-xs font-medium text-gray-700 mb-2">Quiet hours</p>
                <p className="text-[11px] text-gray-500 mb-2">No texts during these hours (except overdue alerts)</p>
                <div className="flex items-center gap-2">
                  <select className="px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:outline-none">
                    <option>10:00 PM</option>
                    <option>11:00 PM</option>
                    <option>9:00 PM</option>
                  </select>
                  <span className="text-xs text-gray-400">to</span>
                  <select className="px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:outline-none">
                    <option>8:00 AM</option>
                    <option>7:00 AM</option>
                    <option>9:00 AM</option>
                  </select>
                </div>
              </div>

              <button onClick={handleSave} disabled={syncing || !phone.trim()} className="w-full py-3 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 rounded-xl transition-colors flex items-center justify-center gap-2">
                {syncing ? <><RefreshCw className="w-4 h-4 animate-spin" /> Verifying...</> : <>Enable SMS Alerts</>}
              </button>
              <p className="text-center text-[10px] text-gray-400">We&apos;ll send a verification code to confirm your number.</p>
            </div>
          )}

          {step === "success" && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto"><Check className="w-8 h-8 text-teal-500" /></div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">SMS Alerts Enabled</h4>
                <p className="text-sm text-gray-500 mt-1">You&apos;ll receive text alerts at {phone || '+1 (555) 123-4567'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-left space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-gray-500">Quiet hours</span><span className="text-gray-700">10 PM — 8 AM</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Active alerts</span><span className="text-gray-700">3 types enabled</span></div>
              </div>
              <button onClick={onClose} className="w-full py-3 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 rounded-xl transition-colors">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

