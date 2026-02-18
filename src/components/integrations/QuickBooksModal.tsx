"use client";

import { useState, useId } from "react";
import { Check, X, ArrowRight, RefreshCw, ChevronRight, ExternalLink, Shield, Clock, Settings2, AlertCircle, Zap, Link2 } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import type { ModalProps } from "./types";

export function QBConnectModal({ onClose }: ModalProps) {
  const [step, setStep] = useState<"intro" | "permissions" | "mapping" | "success">("intro");
  const [syncing, setSyncing] = useState(false);
  const titleId = useId();
  const modalRef = useFocusTrap<HTMLDivElement>(true, { onEscape: onClose });

  const handleConnect = () => {
    setStep("permissions");
  };

  const handleAuthorize = () => {
    setStep("mapping");
  };

  const handleFinish = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setStep("success");
    }, 2000);
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
            <img src="/logos/quickbooks.svg" alt="QuickBooks" className="w-10 h-10 rounded-xl object-contain" />
            <div>
              <h2 id={titleId} className="text-base font-semibold text-gray-900">Connect QuickBooks</h2>
              <p className="text-xs text-gray-400">Two-way expense sync</p>
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
                <h4 className="text-sm font-semibold text-gray-900">What gets synced</h4>
                {[
                  { icon: ArrowRight, label: "Expenses", desc: "HostFi expenses sync as journal entries or bills in QuickBooks" },
                  { icon: ArrowRight, label: "Revenue", desc: "Booking revenue syncs as income entries" },
                  { icon: ArrowRight, label: "Categories", desc: "Auto-maps to your Chart of Accounts" },
                  { icon: ArrowRight, label: "Vendors", desc: "Vendor names sync as QB vendors" },
                  { icon: ArrowRight, label: "Properties", desc: "Map to Classes or Locations in QuickBooks" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                      <item.icon className="w-4 h-4 text-teal-500" />
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
                <p className="text-xs text-blue-700">HostFi uses OAuth 2.0 to connect. We never see or store your QuickBooks password.</p>
              </div>
              <button onClick={handleConnect} className="w-full py-3 text-sm font-semibold text-white bg-[#2CA01C] hover:bg-[#248F17] rounded-xl transition-colors flex items-center justify-center gap-2">
                Connect to QuickBooks <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === "permissions" && (
            <div className="space-y-6">
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-[#2CA01C]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-[#2CA01C]" />
                </div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Authorize HostFi</h4>
                <p className="text-xs text-gray-500">You&apos;ll be redirected to Intuit to grant access</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-700">Permissions requested:</p>
                {["Read and write accounting data", "Access Chart of Accounts", "Manage vendors and customers", "Create journal entries"].map((perm, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                    <Check className="w-3.5 h-3.5 text-teal-500" />
                    {perm}
                  </div>
                ))}
              </div>

              <button onClick={handleAuthorize} className="w-full py-3 text-sm font-semibold text-white bg-[#2CA01C] hover:bg-[#248F17] rounded-xl transition-colors">
                Authorize Access
              </button>
              <p className="text-center text-[10px] text-gray-400">Coming soon — QuickBooks integration is not yet available.</p>
            </div>
          )}

          {step === "mapping" && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Map your accounts</h4>
                <p className="text-xs text-gray-500">Tell HostFi where to sync each category in QuickBooks</p>
              </div>

              <div className="space-y-3">
                {[
                  { category: "Utilities", qbAccount: "Utilities Expense" },
                  { category: "Cleaning", qbAccount: "Cleaning & Maintenance" },
                  { category: "Maintenance", qbAccount: "Repairs & Maintenance" },
                  { category: "Insurance", qbAccount: "Insurance Expense" },
                  { category: "Mortgage / Rent", qbAccount: "Rent Expense" },
                  { category: "Taxes", qbAccount: "Taxes & Licenses" },
                  { category: "Supplies", qbAccount: "Supplies Expense" },
                  { category: "Management", qbAccount: "Management Fees" },
                ].map((m, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-700 font-medium w-32 shrink-0">{m.category}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                    <select defaultValue={m.qbAccount} className="flex-1 px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:outline-none">
                      <option>{m.qbAccount}</option>
                      <option>Other Expense</option>
                      <option>Cost of Goods Sold</option>
                      <option>Create new account...</option>
                    </select>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-medium text-gray-700 mb-2">Property mapping</p>
                <p className="text-xs text-gray-500 mb-3">Map properties to QuickBooks Classes for per-property reporting.</p>
                <div className="space-y-2">
                  {["Venice Beach Unit", "Silver Lake Duplex", "Joshua Tree Cabin"].map((prop, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-gray-700 font-medium w-32 shrink-0 truncate">{prop}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                      <select defaultValue={prop} className="flex-1 px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:outline-none">
                        <option>{prop}</option>
                        <option>Create new class...</option>
                      </select>
                    </div>
                  ))}
                </div>
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
                <h4 className="text-lg font-semibold text-gray-900">QuickBooks Connected</h4>
                <p className="text-sm text-gray-500 mt-1">Initial sync complete. 24 expenses and 12 revenue entries synced.</p>
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

