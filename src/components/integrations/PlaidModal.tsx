"use client";

import { useState, useId } from "react";
import { Check, X, Shield, Landmark, CreditCard, ArrowRight, AlertCircle } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import type { ModalProps } from "./types";
import { PlaidLinkButton } from "./PlaidLinkButton";

interface Account {
  account_id: string;
  name: string;
  type: string;
  mask: string | null;
}

export function PlaidModal({ onClose }: ModalProps) {
  const [step, setStep] = useState<"intro" | "connect" | "accounts" | "success">("intro");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [institution, setInstitution] = useState<{ name: string } | null>(null);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const titleId = useId();
  const modalRef = useFocusTrap<HTMLDivElement>(true, { onEscape: onClose });

  const handlePlaidSuccess = (accts: Account[], inst: { name: string } | null) => {
    setAccounts(accts);
    setInstitution(inst);
    setSelectedAccounts(new Set(accts.map(a => a.account_id)));
    setStep("accounts");
  };

  const toggleAccount = (id: string) => {
    setSelectedAccounts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleFinish = () => {
    // TODO: Save selected accounts to user preferences
    setStep("success");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[90vh] safe-area-bottom overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#111111] rounded-xl flex items-center justify-center text-white text-sm font-bold" aria-hidden="true">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h2 id={titleId} className="text-base font-semibold text-gray-900">Connect Bank Account</h2>
              <p className="text-xs text-gray-400">Powered by Plaid</p>
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
                <h4 className="text-sm font-semibold text-gray-900">Auto-Import Bank Transactions</h4>
                {[
                  { icon: CreditCard, label: "Automatic Categorization", desc: "Transactions are matched to properties and categorized by AI" },
                  { icon: ArrowRight, label: "Real-Time Sync", desc: "New transactions appear within hours — no manual entry" },
                  { icon: Shield, label: "Bank-Level Security", desc: "Plaid connects to 12,000+ institutions with 256-bit encryption" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                      <item.icon className="w-4 h-4 text-gray-700" />
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
                <p className="text-xs text-blue-700">HostFi never sees your bank credentials. Plaid handles all authentication securely. We only receive transaction data you authorize.</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-700 mb-2">Supported Banks</p>
                <div className="flex flex-wrap gap-2">
                  {["Chase", "Bank of America", "Wells Fargo", "Citi", "Capital One", "US Bank", "PNC", "12,000+ more"].map((bank) => (
                    <span key={bank} className="px-2.5 py-1 text-[11px] font-medium text-gray-600 bg-white border border-gray-200 rounded-lg">{bank}</span>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setStep("connect")}
                className="w-full py-3 text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 rounded-xl transition-colors"
              >
                Continue
              </button>
            </div>
          )}

          {step === "connect" && (
            <div className="space-y-6">
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Landmark className="w-8 h-8 text-gray-700" />
                </div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Connect Your Bank</h4>
                <p className="text-xs text-gray-500">Select your bank and sign in securely through Plaid</p>
              </div>

              <PlaidLinkButton
                onSuccess={handlePlaidSuccess}
                onError={(err) => console.error("Plaid error:", err)}
              />

              <button
                onClick={() => setStep("intro")}
                className="w-full py-3 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Back
              </button>

              <p className="text-center text-[10px] text-gray-400">
                By connecting, you agree to Plaid&apos;s <a href="https://plaid.com/legal/#end-user-privacy-policy" target="_blank" rel="noopener noreferrer" className="underline">End User Privacy Policy</a>
              </p>
            </div>
          )}

          {step === "accounts" && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">
                  {institution?.name || "Bank"} Connected
                </h4>
                <p className="text-xs text-gray-500">Select which accounts to track expenses from</p>
              </div>

              <div className="space-y-2">
                {accounts.map((account) => (
                  <label key={account.account_id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedAccounts.has(account.account_id) ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:bg-gray-50"}`}>
                    <input
                      type="checkbox"
                      checked={selectedAccounts.has(account.account_id)}
                      onChange={() => toggleAccount(account.account_id)}
                      className="accent-gray-900"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900">{account.name}</p>
                      <p className="text-[11px] text-gray-500 capitalize">{account.type}{account.mask ? ` ••${account.mask}` : ""}</p>
                    </div>
                  </label>
                ))}
              </div>

              {selectedAccounts.size === 0 && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                  <p className="text-xs text-amber-700">Select at least one account to import transactions</p>
                </div>
              )}

              <button
                onClick={handleFinish}
                disabled={selectedAccounts.size === 0}
                className="w-full py-3 text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 rounded-xl transition-colors"
              >
                Import Transactions
              </button>
            </div>
          )}

          {step === "success" && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-teal-500" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">Bank Connected</h4>
                <p className="text-sm text-gray-500 mt-1">
                  {institution?.name || "Your bank"} is now syncing {selectedAccounts.size} account{selectedAccounts.size !== 1 ? "s" : ""}.
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-left space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Institution</span>
                  <span className="font-medium text-gray-700">{institution?.name || "Connected"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Accounts</span>
                  <span className="font-medium text-gray-700">{selectedAccounts.size}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Sync</span>
                  <span className="font-medium text-teal-600">Active — Real-Time</span>
                </div>
              </div>
              <p className="text-xs text-gray-500">Transactions will appear in your Expenses within a few minutes. HostFi will auto-categorize and match them to your properties.</p>
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
