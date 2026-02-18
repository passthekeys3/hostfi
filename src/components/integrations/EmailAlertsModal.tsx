"use client";

import { useState, useId, useEffect, useCallback } from "react";
import { Check, X, ArrowRight, RefreshCw, ChevronRight } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import type { ModalProps } from "./types";
import { cn } from "@/lib/utils";

interface AlertTypeConfig {
  enabled: boolean;
  frequency?: string;
  day?: string;
  time?: string;
}

interface AlertPreferences {
  id: string;
  user_id: string;
  recipients: string[];
  alert_types: Record<string, AlertTypeConfig>;
  active: boolean;
  created_at: string;
  updated_at: string;
}

const DEFAULT_ALERT_TYPES: Record<string, AlertTypeConfig> = {
  anomaly: { enabled: true, frequency: "immediately" },
  bill_due: { enabled: true, frequency: "3_days_before" },
  bill_overdue: { enabled: true, frequency: "immediately" },
  weekly_digest: { enabled: true, day: "monday", time: "09:00" },
  monthly_report: { enabled: false, day: "1", time: "09:00" },
};

const ALERT_TYPE_CONFIG = [
  { key: "anomaly", label: "Anomaly alerts", desc: "Unusual charges, spending spikes, possible issues" },
  { key: "bill_due", label: "Due date reminders", desc: "Bills coming due in 3 days" },
  { key: "bill_overdue", label: "Overdue alerts", desc: "Bills past their due date" },
  { key: "weekly_digest", label: "Weekly digest", desc: "Spending summary every Monday at 9 AM" },
  { key: "monthly_report", label: "Monthly report", desc: "Full P&L summary on the 1st of each month" },
];

const FREQUENCY_OPTIONS: Record<string, { label: string; options: { value: string; label: string }[] }> = {
  anomaly: {
    label: "Anomaly alerts",
    options: [
      { value: "immediately", label: "Immediately" },
      { value: "daily", label: "Daily digest" },
      { value: "weekly", label: "Weekly digest" },
    ],
  },
  bill_due: {
    label: "Due date reminders",
    options: [
      { value: "3_days_before", label: "3 days before" },
      { value: "7_days_before", label: "7 days before" },
      { value: "3_and_7_days_before", label: "3 and 7 days before" },
    ],
  },
  bill_overdue: {
    label: "Overdue alerts",
    options: [
      { value: "immediately", label: "Immediately" },
      { value: "daily", label: "Daily at 9 AM" },
      { value: "every_3_days", label: "Every 3 days" },
    ],
  },
  weekly_digest: {
    label: "Weekly digest",
    options: [
      { value: "monday_9am", label: "Monday 9 AM" },
      { value: "friday_5pm", label: "Friday 5 PM" },
      { value: "sunday_8pm", label: "Sunday 8 PM" },
    ],
  },
  monthly_report: {
    label: "Monthly report",
    options: [
      { value: "1st_9am", label: "1st at 9 AM" },
      { value: "last_day_5pm", label: "Last day at 5 PM" },
      { value: "1st_and_15th", label: "1st and 15th" },
    ],
  },
};

export function EmailAlertsModal({ onClose }: ModalProps) {
  const [step, setStep] = useState<"loading" | "connected" | "recipients" | "alerts" | "frequency" | "saving" | "success">("loading");
  const [syncing, setSyncing] = useState(false);
  const [emails, setEmails] = useState<string[]>([""]);
  const [alertTypes, setAlertTypes] = useState<Record<string, AlertTypeConfig>>(DEFAULT_ALERT_TYPES);
  const [existingPrefs, setExistingPrefs] = useState<AlertPreferences | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const titleId = useId();
  const modalRef = useFocusTrap<HTMLDivElement>(true, { onEscape: onClose });

  // Load existing preferences on mount
  const loadPreferences = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts/preferences");
      if (!res.ok) {
        setStep("recipients");
        return;
      }
      const data = await res.json();
      if (data.preferences && data.preferences.active) {
        setExistingPrefs(data.preferences);
        setEmails(data.preferences.recipients.length > 0 ? data.preferences.recipients : [""]);
        setAlertTypes({ ...DEFAULT_ALERT_TYPES, ...data.preferences.alert_types });
        setStep("connected");
      } else {
        setStep("recipients");
      }
    } catch (error) {
      console.error('Failed to load alert preferences:', error);
      setStep("recipients");
    }
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const handleSave = async () => {
    setSyncing(true);
    setError(null);
    setStep("saving");

    try {
      const validEmails = emails.filter(e => e.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()));
      
      const res = await fetch("/api/alerts/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: validEmails,
          alert_types: alertTypes,
          active: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      const data = await res.json();
      setExistingPrefs(data.preferences);
      setSyncing(false);
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save preferences");
      setSyncing(false);
      setStep("frequency");
    }
  };

  const handleDisconnect = async () => {
    setSyncing(true);
    setError(null);

    try {
      const res = await fetch("/api/alerts/preferences", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to disable");
      
      setExistingPrefs(null);
      setEmails([""]);
      setAlertTypes(DEFAULT_ALERT_TYPES);
      setSyncing(false);
      setStep("recipients");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable");
      setSyncing(false);
    }
  };

  const handleEdit = () => {
    setStep("recipients");
  };

  const addEmail = () => setEmails([...emails, ""]);
  const removeEmail = (index: number) => setEmails(emails.filter((_, i) => i !== index));
  const updateEmail = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const toggleAlertType = (key: string) => {
    setAlertTypes(prev => ({
      ...prev,
      [key]: { ...prev[key], enabled: !prev[key]?.enabled },
    }));
  };

  const updateFrequency = (key: string, value: string) => {
    setAlertTypes(prev => ({
      ...prev,
      [key]: { ...prev[key], frequency: value },
    }));
  };

  const stepLabels = ["Recipients", "Alert Types", "Frequency", "Save"];
  const stepKeys: (typeof step)[] = ["recipients", "alerts", "frequency", "success"];
  const currentStepIndex = stepKeys.indexOf(step as typeof stepKeys[number]);

  const enabledAlertCount = Object.values(alertTypes).filter(a => a.enabled).length;
  const validEmailCount = emails.filter(e => e.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())).length;

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

        {error && (
          <div className="mx-6 mt-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Loading state */}
        {step === "loading" && (
          <div className="p-6 flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        )}

        {/* Connected state */}
        {step === "connected" && existingPrefs && (
          <div className="p-6 space-y-6">
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Check className="w-7 h-7 text-teal-500" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900">Email Alerts Active</h4>
              <p className="text-sm text-gray-500 mt-1">Your team is receiving alerts</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Recipients</span>
                <span className="font-medium text-gray-700">{existingPrefs.recipients.length} configured</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Alert types</span>
                <span className="font-medium text-gray-700">{Object.values(existingPrefs.alert_types).filter((a: AlertTypeConfig) => a.enabled).length} enabled</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className="font-medium text-teal-600">Active</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500">Recipients</p>
              <div className="space-y-1">
                {existingPrefs.recipients.map((email, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-700">
                    <Check className="w-3 h-3 text-teal-500" />{email}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleEdit}
                className="flex-1 py-3 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Edit Settings
              </button>
              <button
                onClick={handleDisconnect}
                disabled={syncing}
                className="flex-1 py-3 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Disable Alerts"}
              </button>
            </div>
          </div>
        )}

        {/* Step indicator (only show for wizard steps) */}
        {["recipients", "alerts", "frequency", "saving", "success"].includes(step) && step !== "connected" && (
          <div className="px-6 pt-4">
            <div className="flex items-center justify-between mb-2">
              {stepLabels.map((label, i) => {
                const isActive = i <= currentStepIndex;
                const isCurrent = i === currentStepIndex;
                return (
                  <div key={label} className="flex-1 flex items-center">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                      isCurrent ? "bg-[#EA4335] text-white" : isActive ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-400"
                    )}>
                      {isActive && i < currentStepIndex ? <Check className="w-3 h-3" /> : i + 1}
                    </div>
                    {i < 3 && <div className={cn("flex-1 h-0.5 mx-2", isActive && i < currentStepIndex ? "bg-teal-500" : "bg-gray-100")} />}
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
              <button onClick={() => setStep("alerts")} disabled={validEmailCount === 0} className="w-full py-3 text-sm font-semibold text-white bg-[#EA4335] hover:bg-[#D93025] disabled:bg-gray-200 disabled:text-gray-400 rounded-xl transition-colors">
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
                {ALERT_TYPE_CONFIG.map((alert) => (
                  <label key={alert.key} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={alertTypes[alert.key]?.enabled ?? false}
                      onChange={() => toggleAlertType(alert.key)}
                      className="accent-[#EA4335]"
                    />
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
                <button onClick={() => setStep("frequency")} disabled={enabledAlertCount === 0} className="flex-1 py-3 text-sm font-semibold text-white bg-[#EA4335] hover:bg-[#D93025] disabled:bg-gray-200 disabled:text-gray-400 rounded-xl transition-colors">
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
                {Object.entries(FREQUENCY_OPTIONS).map(([key, config]) => {
                  if (!alertTypes[key]?.enabled) return null;
                  return (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">{config.label}</label>
                      <select
                        value={alertTypes[key]?.frequency || config.options[0].value}
                        onChange={(e) => updateFrequency(key, e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#EA4335]/20 focus:outline-none"
                      >
                        {config.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-700 mb-2">Recipient summary</p>
                <div className="space-y-1 text-xs text-gray-600">
                  {emails.filter(e => e.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())).map((email, i) => (
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
                <button onClick={handleSave} disabled={syncing} className="flex-1 py-3 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 rounded-xl transition-colors flex items-center justify-center gap-2">
                  {syncing ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</> : <>Save Email Rules</>}
                </button>
              </div>
            </div>
          )}

          {step === "saving" && (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin text-teal-500 mx-auto" />
              <p className="text-sm text-gray-500 mt-4">Saving your preferences...</p>
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
                <div className="flex justify-between"><span className="text-gray-500">Recipients</span><span className="font-medium text-gray-700">{validEmailCount} configured</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Alert types</span><span className="font-medium text-gray-700">{enabledAlertCount} enabled</span></div>
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
