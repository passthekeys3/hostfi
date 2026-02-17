"use client";

import { useState, useId } from "react";
import { Check, X, RefreshCw, ExternalLink, Link2, Copy, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import type { ModalProps } from "./types";
import { cn } from "@/lib/utils";

const TEMPLATE_EVENT_MAP: Record<string, string[]> = {
  expense_slack: ['expense.created'],
  anomaly_email: ['anomaly.detected'],
  monthly_sheets: ['report.monthly'],
  bill_due_sms: ['bill.due_soon', 'bill.overdue'],
  receipt_drive: ['receipt.parsed'],
  weekly_teams: ['report.weekly'],
  custom: [],
};

const ALL_EVENTS = [
  { id: 'expense.created', label: 'New expense added' },
  { id: 'expense.updated', label: 'Expense modified' },
  { id: 'expense.deleted', label: 'Expense removed' },
  { id: 'bill.due_soon', label: 'Bill due soon' },
  { id: 'bill.overdue', label: 'Bill overdue' },
  { id: 'anomaly.detected', label: 'Anomaly detected' },
  { id: 'receipt.parsed', label: 'Receipt parsed' },
  { id: 'report.weekly', label: 'Weekly report' },
  { id: 'report.monthly', label: 'Monthly report' },
];

interface CreatedSubscription {
  id: string;
  target_url: string;
  event_types: string[];
  secret: string;
  created_at: string;
}

export function MakeModal({ onClose }: ModalProps) {
  const [step, setStep] = useState<"templates" | "connect" | "configure" | "success">("templates");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [customEvents, setCustomEvents] = useState<string[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSub, setCreatedSub] = useState<CreatedSubscription | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const titleId = useId();
  const modalRef = useFocusTrap<HTMLDivElement>(true, { onEscape: onClose });

  const templates = [
    { id: "expense_slack", name: "New Expense → Slack Alert", desc: "Post a message to Slack whenever a new expense is recorded", icon: "SL", color: "bg-[#4A154B]" },
    { id: "anomaly_email", name: "Anomaly → Email Alert", desc: "Send an email when AI detects an unusual charge", icon: "EM", color: "bg-[#EA4335]" },
    { id: "monthly_sheets", name: "Monthly Report → Google Sheets", desc: "Export monthly P&L to a Google Sheet on the 1st", icon: "GS", color: "bg-[#0F9D58]" },
    { id: "bill_due_sms", name: "Bill Due → SMS Reminder", desc: "Text reminder 3 days before a bill is due", icon: "SM", color: "bg-[#F22F46]" },
    { id: "receipt_drive", name: "New Receipt → Google Drive", desc: "Save every parsed receipt to a Drive folder", icon: "GD", color: "bg-[#4285F4]" },
    { id: "weekly_teams", name: "Weekly Digest → Teams", desc: "Post a weekly spending summary to Microsoft Teams", icon: "MT", color: "bg-[#6264A7]" },
    { id: "custom", name: "Custom Webhook", desc: "Choose any events and enter your own webhook URL", icon: "⚙️", color: "bg-gray-600" },
  ];

  const getSelectedEventTypes = (): string[] => {
    if (selectedTemplate === "custom") return customEvents;
    return selectedTemplate ? TEMPLATE_EVENT_MAP[selectedTemplate] || [] : [];
  };

  const handleToggleCustomEvent = (eventId: string) => {
    setCustomEvents(prev =>
      prev.includes(eventId) ? prev.filter(e => e !== eventId) : [...prev, eventId]
    );
  };

  const handleCreateWebhook = async () => {
    setError(null);
    setSyncing(true);

    const eventTypes = getSelectedEventTypes();

    if (!webhookUrl.trim()) {
      setError("Please enter a webhook URL");
      setSyncing(false);
      return;
    }
    if (eventTypes.length === 0) {
      setError("Please select at least one event type");
      setSyncing(false);
      return;
    }

    try {
      const res = await fetch('/api/integrations/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_url: webhookUrl.trim(),
          event_types: eventTypes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create webhook subscription');
      }

      const sub = await res.json();
      setCreatedSub(sub);
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSyncing(false);
    }
  };

  const copySecret = async () => {
    if (createdSub?.secret) {
      await navigator.clipboard.writeText(createdSub.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const stepLabels = ["Templates", "Connect", "Configure", "Activate"];
  const stepKeys = ["templates", "connect", "configure", "success"];
  const selectedTemplateData = templates.find(t => t.id === selectedTemplate);
  const isCustom = selectedTemplate === "custom";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[90vh] safe-area-bottom overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <img src="/logos/make.svg" alt="Make" className="w-10 h-10 rounded-xl object-contain" />
            <div>
              <h2 id={titleId} className="text-base font-semibold text-gray-900">Connect Make</h2>
              <p className="text-xs text-gray-400">Visual automation platform</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close modal" className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/40">
            <X className="w-4 h-4 text-gray-400" aria-hidden="true" />
          </button>
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
            {stepLabels.map(l => <span key={l}>{l}</span>)}
          </div>
        </div>

        <div className="p-6">
          {/* TEMPLATES */}
          {step === "templates" && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Pre-built scenarios</h4>
                <p className="text-xs text-gray-500">Select a scenario to get started, or create a custom webhook</p>
              </div>
              <div className="space-y-2">
                {templates.map((t) => (
                  <label key={t.id} className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    selectedTemplate === t.id ? "border-[#6D00CC] bg-[#6D00CC]/5" : "border-gray-200 hover:bg-gray-50"
                  )}>
                    <input type="radio" name="template" value={t.id} checked={selectedTemplate === t.id} onChange={() => setSelectedTemplate(t.id)} className="accent-[#6D00CC]" />
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
                Next: Enter Webhook URL
              </button>
            </div>
          )}

          {/* CONNECT — Enter webhook URL */}
          {step === "connect" && (
            <div className="space-y-6">
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-[#6D00CC]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Link2 className="w-8 h-8 text-[#6D00CC]" />
                </div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Enter Webhook URL</h4>
                <p className="text-xs text-gray-500">Paste your Make Webhook URL</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Webhook URL</label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://hook.make.com/..."
                  className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#6D00CC]/20 focus:border-[#6D00CC] focus:outline-none"
                />
                <p className="mt-1.5 text-[11px] text-gray-400">
                  In Make, add a &quot;Webhooks&quot; → &quot;Custom webhook&quot; module, then paste the URL here.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium text-gray-700">Selected scenario:</p>
                <div className="flex items-center gap-2">
                  <div className={cn("w-6 h-6 rounded flex items-center justify-center text-white text-[8px] font-bold", selectedTemplateData?.color)}>
                    {selectedTemplateData?.icon}
                  </div>
                  <span className="text-xs text-gray-600">{selectedTemplateData?.name}</span>
                </div>
                {!isCustom && (
                  <p className="text-[11px] text-gray-500">
                    Events: {TEMPLATE_EVENT_MAP[selectedTemplate || '']?.join(', ') || 'None'}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep("templates")} className="flex-1 py-3 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Back</button>
                <button onClick={() => setStep("configure")} disabled={!webhookUrl.trim()} className="flex-1 py-3 text-sm font-semibold text-white bg-[#6D00CC] hover:bg-[#5C00AD] disabled:bg-gray-200 disabled:text-gray-400 rounded-xl transition-colors">
                  Next: Configure
                </button>
              </div>
            </div>
          )}

          {/* CONFIGURE */}
          {step === "configure" && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Configure your webhook</h4>
                <p className="text-xs text-gray-500">Review settings and activate</p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="bg-[#6D00CC]/5 border border-[#6D00CC]/20 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold", selectedTemplateData?.color)}>
                    {selectedTemplateData?.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{selectedTemplateData?.name}</p>
                    <p className="text-xs text-gray-500 truncate max-w-[200px]">{webhookUrl}</p>
                  </div>
                </div>
              </div>

              {isCustom ? (
                <div className="space-y-3">
                  <label className="block text-xs font-medium text-gray-700">Select events to trigger webhook:</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {ALL_EVENTS.map((event) => (
                      <label key={event.id} className={cn(
                        "flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors",
                        customEvents.includes(event.id) ? "border-[#6D00CC] bg-[#6D00CC]/5" : "border-gray-200 hover:bg-gray-50"
                      )}>
                        <input type="checkbox" checked={customEvents.includes(event.id)} onChange={() => handleToggleCustomEvent(event.id)} className="accent-[#6D00CC]" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-900">{event.label}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{event.id}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block text-xs font-medium text-gray-700">Events that will trigger this webhook:</label>
                  <div className="space-y-1.5">
                    {getSelectedEventTypes().map((eventId) => {
                      const event = ALL_EVENTS.find(e => e.id === eventId);
                      return (
                        <div key={eventId} className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                          <Check className="w-3.5 h-3.5 text-teal-500" />
                          <span>{event?.label || eventId}</span>
                          <span className="text-gray-400 font-mono text-[10px]">({eventId})</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep("connect")} className="flex-1 py-3 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Back</button>
                <button onClick={handleCreateWebhook} disabled={syncing || (isCustom && customEvents.length === 0)} className="flex-1 py-3 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 rounded-xl transition-colors flex items-center justify-center gap-2">
                  {syncing ? <><RefreshCw className="w-4 h-4 animate-spin" /> Creating...</> : "Create Webhook"}
                </button>
              </div>
            </div>
          )}

          {/* SUCCESS */}
          {step === "success" && createdSub && (
            <div className="space-y-6">
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-teal-500" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900">Webhook Created!</h4>
                <p className="text-sm text-gray-500 mt-1">Your Make webhook subscription is now active.</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Scenario</span>
                  <span className="font-medium text-gray-700">{selectedTemplateData?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className="font-medium text-teal-600">Active</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-500">Events</span>
                  <span className="font-medium text-gray-700 text-right max-w-[60%]">
                    {createdSub.event_types.join(', ')}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-500">URL</span>
                  <span className="font-medium text-gray-700 text-right max-w-[60%] truncate font-mono text-[10px]">
                    {createdSub.target_url}
                  </span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-amber-800">Signing Secret</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setShowSecret(!showSecret)} className="p-1 hover:bg-amber-100 rounded transition-colors" aria-label={showSecret ? "Hide secret" : "Show secret"}>
                      {showSecret ? <EyeOff className="w-3.5 h-3.5 text-amber-700" /> : <Eye className="w-3.5 h-3.5 text-amber-700" />}
                    </button>
                    <button onClick={copySecret} className="p-1 hover:bg-amber-100 rounded transition-colors" aria-label="Copy secret">
                      {copiedSecret ? <Check className="w-3.5 h-3.5 text-teal-600" /> : <Copy className="w-3.5 h-3.5 text-amber-700" />}
                    </button>
                  </div>
                </div>
                <code className="block text-[10px] text-amber-900 bg-amber-100/50 p-2 rounded font-mono break-all">
                  {showSecret ? createdSub.secret : '•'.repeat(32)}
                </code>
                <p className="text-[10px] text-amber-700">
                  Save this secret! Use it to verify webhook signatures (X-HostFi-Signature header).
                </p>
              </div>

              <a
                href="https://www.make.com/en/scenarios"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-full gap-2 px-4 py-2.5 text-xs font-medium text-[#6D00CC] bg-[#6D00CC]/10 border border-[#6D00CC]/20 rounded-lg hover:bg-[#6D00CC]/20 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open Make Dashboard
              </a>

              <button onClick={onClose} className="w-full py-3 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 rounded-xl transition-colors">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
