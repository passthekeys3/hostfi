"use client";

import { useState, useId } from "react";
import Image from "next/image";
import { Check, X, ArrowRight, RefreshCw, ChevronRight, ExternalLink, Shield, Clock, Settings2, AlertCircle, Zap, Link2 } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import type { ModalProps } from "./types";
import { cn } from "@/lib/utils";

export function XeroConnectModal({ onClose }: ModalProps) {
  const [step, setStep] = useState<"intro" | "permissions" | "mapping" | "sync_options" | "success">("intro");
  const [syncing, setSyncing] = useState(false);
  const [syncDirection, setSyncDirection] = useState<"two_way" | "hostfi_to_xero" | "xero_to_hostfi">("two_way");
  const titleId = useId();
  const modalRef = useFocusTrap<HTMLDivElement>(true, { onEscape: onClose });

  const handleConnect = () => setStep("permissions");
  const handleAuthorize = () => setStep("mapping");
  const handleMappingDone = () => setStep("sync_options");

  const handleFinish = () => {
    setSyncing(true);
    setTimeout(() => { setSyncing(false); setStep("success"); }, 2000);
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
            <Image src="/logos/xero.svg" alt="Xero" width={40} height={40} className="rounded-xl object-contain" />
            <div>
              <h2 id={titleId} className="text-base font-semibold text-gray-900">Connect Xero</h2>
              <p className="text-xs text-gray-500 mt-0.5">Accounting sync</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close modal" className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/40">
            <X className="w-4 h-4 text-gray-400" aria-hidden="true" />
          </button>
        </div>

        <div className="px-6 py-5">
          {step === "intro" && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-900">What gets synced</h4>
                {[
                  { label: "Expenses", desc: "Sync as Xero bills or spend money transactions" },
                  { label: "Revenue", desc: "Booking income syncs as Xero invoices or bank transactions" },
                  { label: "Contacts", desc: "Vendors auto-create as Xero contacts" },
                  { label: "Tracking Categories", desc: "Properties map to Xero tracking categories for per-property P&L" },
                  { label: "Tax Rates", desc: "Expense tax codes map to Xero tax rates" },
                  { label: "Bank Reconciliation", desc: "Matched transactions auto-reconcile in Xero" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                      <ArrowRight className="w-4 h-4 text-[#13B5EA]" />
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
                <p className="text-xs text-blue-700">HostFi connects via Xero&apos;s official OAuth 2.0. We request only the scopes needed and never store your credentials.</p>
              </div>
              <button onClick={handleConnect} className="w-full py-3 text-sm font-semibold text-white bg-[#13B5EA] hover:bg-[#0FA2D4] rounded-xl transition-colors flex items-center justify-center gap-2">
                Connect to Xero <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === "permissions" && (
            <div className="space-y-6">
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-[#13B5EA]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-[#13B5EA]" />
                </div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Authorize HostFi</h4>
                <p className="text-xs text-gray-500">You&apos;ll be redirected to Xero to grant access</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-700">OAuth scopes requested:</p>
                {[
                  "openid profile email",
                  "accounting.transactions (read/write)",
                  "accounting.contacts (read/write)",
                  "accounting.settings (read)",
                  "accounting.reports.read",
                ].map((perm, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                    <Check className="w-3.5 h-3.5 text-teal-500" />
                    <code className="text-[11px] bg-gray-50 px-1.5 py-0.5 rounded">{perm}</code>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-700">Select Xero organization:</p>
                <select className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#13B5EA]/20 focus:outline-none">
                  <option>Your Organization</option>
                  <option>Kevin&apos;s STR Portfolio</option>
                </select>
              </div>
              <button onClick={handleAuthorize} className="w-full py-3 text-sm font-semibold text-white bg-[#13B5EA] hover:bg-[#0FA2D4] rounded-xl transition-colors">
                Authorize Access
              </button>
              <p className="text-center text-[10px] text-gray-400">Coming soon — Xero integration is not yet available.</p>
            </div>
          )}

          {step === "mapping" && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Map accounts</h4>
                <p className="text-xs text-gray-500">Map HostFi categories to your Xero Chart of Accounts</p>
              </div>
              <div className="space-y-3">
                {[
                  { category: "Utilities", xeroAccount: "Utilities (620)" },
                  { category: "Cleaning", xeroAccount: "Cleaning Expense (621)" },
                  { category: "Maintenance", xeroAccount: "Repairs & Maintenance (622)" },
                  { category: "Insurance", xeroAccount: "Insurance (624)" },
                  { category: "Mortgage / Rent", xeroAccount: "Rent (625)" },
                  { category: "Taxes", xeroAccount: "Rates & Taxes (630)" },
                  { category: "Supplies", xeroAccount: "General Expenses (632)" },
                  { category: "Management", xeroAccount: "Management Fees (633)" },
                  { category: "Revenue", xeroAccount: "Rental Income (200)" },
                ].map((m, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-700 font-medium w-32 shrink-0">{m.category}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                    <select defaultValue={m.xeroAccount} className="flex-1 px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#13B5EA]/20 focus:outline-none">
                      <option>{m.xeroAccount}</option>
                      <option>Other Expense (680)</option>
                      <option>Create new account...</option>
                    </select>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-medium text-gray-700 mb-2">Tracking Categories</p>
                <p className="text-xs text-gray-500 mb-3">Map properties to Xero Tracking Categories for per-property reporting in Xero.</p>
                <div className="space-y-2">
                  {["Your Property 1", "Your Property 2", "Your Property 3"].map((prop, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-gray-700 font-medium w-32 shrink-0 truncate">{prop}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                      <select defaultValue={prop} className="flex-1 px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#13B5EA]/20 focus:outline-none">
                        <option>{prop}</option>
                        <option>Create new tracking option...</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={handleMappingDone} className="w-full py-3 text-sm font-semibold text-white bg-[#13B5EA] hover:bg-[#0FA2D4] rounded-xl transition-colors">
                Next: Sync Options
              </button>
            </div>
          )}

          {step === "sync_options" && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Sync settings</h4>
                <p className="text-xs text-gray-500">Configure how data flows between HostFi and Xero</p>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-medium text-gray-700">Sync direction</p>
                {[
                  { value: "two_way" as const, label: "Two-way sync", desc: "Changes in either app sync to the other" },
                  { value: "hostfi_to_xero" as const, label: "HostFi to Xero only", desc: "Push expenses and revenue to Xero. Xero changes won't sync back" },
                  { value: "xero_to_hostfi" as const, label: "Xero to HostFi only", desc: "Import Xero transactions into HostFi. HostFi won't push to Xero" },
                ].map((opt) => (
                  <label key={opt.value} className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    syncDirection === opt.value ? "border-[#13B5EA] bg-[#13B5EA]/5" : "border-gray-200 hover:bg-gray-50"
                  )}>
                    <input
                      type="radio"
                      name="syncDirection"
                      value={opt.value}
                      checked={syncDirection === opt.value}
                      onChange={() => setSyncDirection(opt.value)}
                      className="mt-0.5 accent-[#13B5EA]"
                    />
                    <div>
                      <p className="text-xs font-medium text-gray-900">{opt.label}</p>
                      <p className="text-[11px] text-gray-500">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="space-y-3">
                <p className="text-xs font-medium text-gray-700">Sync frequency</p>
                <select className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#13B5EA]/20 focus:outline-none">
                  <option>Every 6 hours (recommended)</option>
                  <option>Every hour</option>
                  <option>Every 12 hours</option>
                  <option>Daily</option>
                  <option>Manual only</option>
                </select>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-700">Options</p>
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                  <input type="checkbox" defaultChecked className="accent-[#13B5EA]" />
                  Auto-reconcile matched bank transactions
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                  <input type="checkbox" defaultChecked className="accent-[#13B5EA]" />
                  Create missing contacts automatically
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                  <input type="checkbox" className="accent-[#13B5EA]" />
                  Sync historical data (last 12 months)
                </label>
              </div>

              <button onClick={handleFinish} disabled={syncing} className="w-full py-3 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 rounded-xl transition-colors flex items-center justify-center gap-2">
                {syncing ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Running initial sync...</>
                ) : (
                  <>Save & Sync Now</>
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
                <h4 className="text-lg font-semibold text-gray-900">Xero Connected</h4>
                <p className="text-sm text-gray-500 mt-1">Initial sync complete. 24 expenses and 12 revenue entries synced to Xero.</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Sync frequency</span>
                  <span className="font-medium text-gray-700">Every 6 hours</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Last sync</span>
                  <span className="font-medium text-gray-700">Just now</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 flex items-center gap-1.5"><Settings2 className="w-3.5 h-3.5" /> Direction</span>
                  <span className="font-medium text-gray-700">Two-way</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" /> Organization</span>
                  <span className="font-medium text-gray-700">Your Organization</span>
                </div>
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

