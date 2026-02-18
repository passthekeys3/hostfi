"use client";

import { useState, useId, useEffect, useCallback } from "react";
import { Check, X, ExternalLink, Shield, Unlink, RefreshCw, Hash, Loader2 } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import type { ModalProps } from "./types";
import { cn } from "@/lib/utils";

interface SlackModalProps extends ModalProps {
  isConnected?: boolean;
  onDisconnect?: () => void;
}

interface SlackChannel {
  id: string;
  name: string;
}

interface SlackConnectionInfo {
  team_name: string | null;
  expense_channel: string | null;
  alert_channel: string | null;
  notifications: Record<string, boolean>;
}

export function SlackConnectModal({ onClose, isConnected: initialConnected, onDisconnect }: SlackModalProps) {
  const [step, setStep] = useState<"intro" | "channels" | "notifications" | "success" | "connected">(
    initialConnected ? "connected" : "intro"
  );
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [expenseChannel, setExpenseChannel] = useState("");
  const [alertChannel, setAlertChannel] = useState("");
  const [connectionInfo, setConnectionInfo] = useState<SlackConnectionInfo | null>(null);
  const [notifications, setNotifications] = useState<Record<string, boolean>>({
    new_bill: true,
    bill_due: true,
    bill_overdue: true,
    anomaly: true,
    weekly_digest: true,
    monthly_report: false,
    receipt_confirm: true,
  });
  const titleId = useId();
  const modalRef = useFocusTrap<HTMLDivElement>(true, { onEscape: onClose });

  // Load connection info if connected
  useEffect(() => {
    if (initialConnected) {
      (async () => {
        try {
          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();
          if (!supabase) return;
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          const { data } = await supabase
            .from("integration_connections")
            .select("metadata")
            .eq("user_id", user.id)
            .eq("provider", "slack")
            .eq("active", true)
            .single();
          if (data?.metadata) {
            setConnectionInfo({
              team_name: data.metadata.team_name || null,
              expense_channel: data.metadata.expense_channel_name || null,
              alert_channel: data.metadata.alert_channel_name || null,
              notifications: data.metadata.notifications || {},
            });
            if (data.metadata.expense_channel_name) setExpenseChannel(data.metadata.expense_channel_name);
            if (data.metadata.alert_channel_name) setAlertChannel(data.metadata.alert_channel_name);
            if (data.metadata.notifications) setNotifications(data.metadata.notifications);

            // If connected but no channels configured yet, go straight to channel setup
            if (!data.metadata.expense_channel_id) {
              setStep("channels");
              setInitialLoadDone(true);
              return;
            }
          }
          setInitialLoadDone(true);
        } catch {
          setInitialLoadDone(true);
        }
      })();
    }
  }, [initialConnected]);

  // Load channels after OAuth completes
  const loadChannels = useCallback(async () => {
    setLoadingChannels(true);
    try {
      const res = await fetch("/api/integrations/slack/channels");
      const data = await res.json();
      if (data.channels && data.channels.length > 0) {
        setChannels(data.channels);
        if (!expenseChannel) setExpenseChannel(data.channels[0].id);
        if (!alertChannel) setAlertChannel(data.channels.length > 1 ? data.channels[1].id : data.channels[0].id);
      } else {
        console.error("Slack channels response:", data);
      }
    } catch (err) {
      console.error("Failed to load Slack channels:", err);
    }
    setLoadingChannels(false);
  }, [expenseChannel, alertChannel]);

  // Auto-load channels when entering channels step
  useEffect(() => {
    if (step === "channels" && channels.length === 0 && !loadingChannels) {
      loadChannels();
    }
  }, [step, channels.length, loadingChannels, loadChannels]);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const expenseCh = channels.find(c => c.id === expenseChannel);
      const alertCh = channels.find(c => c.id === alertChannel);

      const { data: existing } = await supabase
        .from("integration_connections")
        .select("metadata")
        .eq("user_id", user.id)
        .eq("provider", "slack")
        .eq("active", true)
        .single();

      const currentMetadata = existing?.metadata || {};

      await supabase
        .from("integration_connections")
        .update({
          metadata: {
            ...currentMetadata,
            expense_channel_id: expenseChannel,
            expense_channel_name: expenseCh?.name || expenseChannel,
            alert_channel_id: alertChannel,
            alert_channel_name: alertCh?.name || alertChannel,
            notifications,
          },
        })
        .eq("user_id", user.id)
        .eq("provider", "slack");

      setStep("success");
    } catch (error) {
      console.error("Failed to save Slack settings:", error);
    }
    setSaving(false);
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
        .eq("provider", "slack");
      onDisconnect?.();
      onClose();
    } catch (error) {
      console.error("Failed to disconnect Slack:", error);
    }
  };

  const notifOptions = [
    { key: "new_bill", label: "New bill parsed", desc: "When a bill is parsed from email or receipt" },
    { key: "bill_due", label: "Bill due reminders", desc: "3 days before a bill is due" },
    { key: "bill_overdue", label: "Overdue alerts", desc: "When a bill passes its due date" },
    { key: "anomaly", label: "Anomaly detection", desc: "Unusual charges or possible issues" },
    { key: "weekly_digest", label: "Weekly spending digest", desc: "Summary every Monday morning" },
    { key: "monthly_report", label: "Monthly P&L report", desc: "Full financial summary on the 1st" },
    { key: "receipt_confirm", label: "Receipt confirmation", desc: "Confirm when a Slack receipt is processed" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[90vh] safe-area-bottom overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <img src="/logos/slack.svg" alt="Slack" className="w-10 h-10 rounded-xl object-contain" />
            <div>
              <h2 id={titleId} className="text-base font-semibold text-gray-900">
                {initialConnected ? "Manage Slack" : "Connect Slack"}
              </h2>
              <p className="text-xs text-gray-400">
                {connectionInfo?.team_name ? `Connected to ${connectionInfo.team_name}` : "Two-way receipt & alert sync"}
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close modal" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="p-6">
          {/* INTRO — Not connected, show value prop + OAuth button */}
          {step === "intro" && (
            <div className="space-y-6">
              <div className="bg-[#4A154B]/5 border border-[#4A154B]/15 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-[#4A154B]">What HostFi does in Slack</p>
                {[
                  "Drop a receipt photo → AI parses vendor, amount, date, category",
                  "Get alerts for due bills, anomalies, and weekly summaries",
                  "Approve expenses via emoji reactions",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-[#4A154B] mt-0.5 shrink-0" />
                    <p className="text-xs text-gray-600">{item}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <Shield className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700">HostFi only accesses channels you choose. Uses Slack&apos;s OAuth with granular bot scopes.</p>
              </div>

              <a
                href="/api/integrations/slack/auth"
                className="w-full py-3 text-sm font-semibold text-white bg-[#4A154B] hover:bg-[#3B1140] rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                Add to Slack <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* CHANNELS — Pick expense + alert channels */}
          {step === "channels" && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Configure channels</h4>
                <p className="text-xs text-gray-500">Choose where HostFi listens and sends messages</p>
              </div>

              {loadingChannels ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : channels.length > 0 ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Expense upload channel</label>
                    <select value={expenseChannel} onChange={e => setExpenseChannel(e.target.value)} className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4A154B]/20 focus:outline-none">
                      {channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Alert channel</label>
                    <select value={alertChannel} onChange={e => setAlertChannel(e.target.value)} className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4A154B]/20 focus:outline-none">
                      {channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-xs text-gray-500">No channels found. Make sure the bot has been added to your workspace.</p>
                </div>
              )}

              <button onClick={() => setStep("notifications")} className="w-full py-3 text-sm font-semibold text-white bg-[#4A154B] hover:bg-[#3B1140] rounded-xl transition-colors">
                Next: Notifications
              </button>
            </div>
          )}

          {/* NOTIFICATIONS — Toggle alert types */}
          {step === "notifications" && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Notification preferences</h4>
                <p className="text-xs text-gray-500">Choose what HostFi sends to Slack</p>
              </div>

              <div className="space-y-2">
                {notifOptions.map((opt) => (
                  <label key={opt.key} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={notifications[opt.key] ?? false}
                      onChange={e => setNotifications(prev => ({ ...prev, [opt.key]: e.target.checked }))}
                      className="mt-0.5 accent-[#4A154B]"
                    />
                    <div>
                      <p className="text-xs font-medium text-gray-900">{opt.label}</p>
                      <p className="text-[11px] text-gray-500">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep("channels")} className="flex-1 py-3 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                  Back
                </button>
                <button onClick={handleSaveConfig} disabled={saving} className="flex-1 py-3 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 rounded-xl transition-colors flex items-center justify-center gap-2">
                  {saving ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</> : "Save & Connect"}
                </button>
              </div>
            </div>
          )}

          {/* SUCCESS */}
          {step === "success" && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-teal-500" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">Slack Connected</h4>
                <p className="text-sm text-gray-500 mt-1">HostFi bot is now active in your workspace.</p>
              </div>
              <div className="bg-[#4A154B]/5 border border-[#4A154B]/15 rounded-xl p-4 text-left">
                <p className="text-xs font-medium text-[#4A154B] mb-2">Try it now</p>
                <p className="text-[11px] text-gray-600">Drop a receipt image in your expense channel and watch HostFi parse it in seconds.</p>
              </div>
              <button onClick={onClose} className="w-full py-3 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 rounded-xl transition-colors">Done</button>
            </div>
          )}

          {/* CONNECTED — Manage existing connection */}
          {step === "connected" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 bg-teal-50 rounded-xl border border-teal-100">
                <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-teal-900">Connected</p>
                  <p className="text-xs text-teal-700">{connectionInfo?.team_name || "Slack workspace"}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Expense channel</span>
                  <span className="font-medium text-gray-700">
                    {connectionInfo?.expense_channel ? `#${connectionInfo.expense_channel}` : "Not set"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Alert channel</span>
                  <span className="font-medium text-gray-700">
                    {connectionInfo?.alert_channel ? `#${connectionInfo.alert_channel}` : "Not set"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Active notifications</span>
                  <span className="font-medium text-gray-700">
                    {Object.values(connectionInfo?.notifications || {}).filter(Boolean).length} enabled
                  </span>
                </div>
              </div>

              <button
                onClick={async () => { await loadChannels(); setStep("channels"); }}
                className="w-full py-3 text-sm font-medium text-[#4A154B] bg-[#4A154B]/5 hover:bg-[#4A154B]/10 rounded-xl transition-colors"
              >
                Edit Settings
              </button>

              <button
                onClick={handleDisconnect}
                className="w-full py-3 text-sm font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Unlink className="w-4 h-4" /> Disconnect
              </button>

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
