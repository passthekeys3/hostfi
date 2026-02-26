"use client";

import { useState, useEffect, useId } from "react";
import Image from "next/image";
import { Check, X, Shield, Landmark, CreditCard, ArrowRight, AlertCircle, Building2, Link2, RefreshCw, Unlink, Loader2 } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import type { ModalProps } from "./types";
import { PlaidLinkButton } from "./PlaidLinkButton";

interface Account {
  account_id: string;
  name: string;
  type: string;
  mask: string | null;
}

interface PlaidItem {
  item_id: string;
  institution_name: string | null;
  status: string;
  last_synced_at: string | null;
}

interface MappedAccount {
  id: string;
  plaid_account_id: string;
  account_name: string | null;
  account_mask: string | null;
  property_id: string | null;
  properties: { id: string; name: string } | null;
}

interface Property {
  id: string;
  name: string;
}

export function PlaidModal({ onClose, onConnected }: ModalProps & { onConnected?: () => void }) {
  const [step, setStep] = useState<"loading" | "intro" | "connect" | "accounts" | "mapping" | "connected" | "success">("loading");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [institution, setInstitution] = useState<{ name: string } | null>(null);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [properties, setProperties] = useState<Property[]>([]);
  const [accountPropertyMap, setAccountPropertyMap] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [savingMappings, setSavingMappings] = useState(false);
  const [txnCount, setTxnCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Connected state
  const [existingItems, setExistingItems] = useState<PlaidItem[]>([]);
  const [existingAccounts, setExistingAccounts] = useState<MappedAccount[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncResult, setSyncResult] = useState<{ added: number; modified: number; removed: number } | null>(null);

  const titleId = useId();
  const modalRef = useFocusTrap<HTMLDivElement>(true, { onEscape: onClose });

  // Check for existing connections on mount
  useEffect(() => {
    async function checkExisting() {
      try {
        const res = await fetch("/api/integrations/plaid/accounts");
        if (res.ok) {
          const data = await res.json();
          if (data.items?.length > 0 && data.items.some((i: PlaidItem) => i.status !== "disconnected")) {
            setExistingItems(data.items.filter((i: PlaidItem) => i.status !== "disconnected"));
            setExistingAccounts(data.accounts || []);
            setStep("connected");
            return;
          }
        }
      } catch {
        // Fall through to intro
      }
      setStep("intro");
    }
    checkExisting();
  }, []);

  // Load properties
  useEffect(() => {
    async function loadProperties() {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        if (!supabase) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("properties")
          .select("id, name")
          .eq("user_id", user.id)
          .order("name");
        if (data) setProperties(data);
      } catch {
        // silent
      }
    }
    loadProperties();
  }, []);

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

  const handleContinueToMapping = () => {
    const initial: Record<string, string> = {};
    accounts
      .filter(a => selectedAccounts.has(a.account_id))
      .forEach(a => { initial[a.account_id] = accountPropertyMap[a.account_id] || ""; });
    setAccountPropertyMap(initial);
    setStep("mapping");
  };

  const handleFinish = async () => {
    setSavingMappings(true);
    try {
      const mappingPromises = Object.entries(accountPropertyMap)
        .filter(([accountId]) => selectedAccounts.has(accountId))
        .map(([plaid_account_id, property_id]) =>
          fetch("/api/integrations/plaid/accounts/map", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plaid_account_id, property_id: property_id || null }),
          })
        );
      await Promise.all(mappingPromises);
    } catch {
      // continue anyway
    }
    setSavingMappings(false);
    setImporting(true);
    try {
      const res = await fetch("/api/integrations/plaid/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setTxnCount((data.added || []).length);
      }
    } catch {
      // continue anyway
    }
    setImporting(false);
    onConnected?.();
    setStep("success");
  };

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setSyncResult(null);
    try {
      const res = await fetch("/api/integrations/plaid/sync", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setSyncResult({
          added: data.added?.length || 0,
          modified: data.modified?.length || 0,
          removed: data.removed?.length || 0,
        });
        // Refresh accounts list
        const acctRes = await fetch("/api/integrations/plaid/accounts");
        if (acctRes.ok) {
          const acctData = await acctRes.json();
          setExistingItems(acctData.items?.filter((i: PlaidItem) => i.status !== "disconnected") || []);
          setExistingAccounts(acctData.accounts || []);
        }
      } else {
        const data = await res.json();
        setError(data.error || "Sync failed");
      }
    } catch {
      setError("Sync failed. Please try again.");
    }
    setSyncing(false);
  };

  const handleDisconnect = async (itemId?: string) => {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/integrations/plaid/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemId ? { item_id: itemId } : {}),
      });
      if (res.ok) {
        if (itemId) {
          // Remove just that item
          setExistingItems(prev => prev.filter(i => i.item_id !== itemId));
          setExistingAccounts(prev => prev.filter(a => {
            // Can't easily filter by item, so refresh
            return true;
          }));
          // If no items left, go to intro
          const remaining = existingItems.filter(i => i.item_id !== itemId);
          if (remaining.length === 0) {
            setStep("intro");
          } else {
            // Refresh
            const acctRes = await fetch("/api/integrations/plaid/accounts");
            if (acctRes.ok) {
              const acctData = await acctRes.json();
              setExistingItems(acctData.items?.filter((i: PlaidItem) => i.status !== "disconnected") || []);
              setExistingAccounts(acctData.accounts || []);
            }
          }
        } else {
          setExistingItems([]);
          setExistingAccounts([]);
          setStep("intro");
        }
      }
    } catch {
      setError("Failed to disconnect. Please try again.");
    }
    setDisconnecting(false);
  };

  const handleAddAnother = () => {
    setAccounts([]);
    setInstitution(null);
    setSelectedAccounts(new Set());
    setAccountPropertyMap({});
    setSyncResult(null);
    setStep("connect");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[90vh] safe-area-bottom overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Image src="/logos/plaid.svg" alt="Plaid" width={40} height={40} className="rounded-xl object-contain" />
            <div>
              <h2 id={titleId} className="text-base font-semibold text-gray-900">
                {step === "connected" ? "Bank Connections" : "Connect Bank Account"}
              </h2>
              <p className="text-xs text-gray-600 mt-0.5">Powered by Plaid</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close modal" className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/40">
            <X className="w-4 h-4 text-gray-400" aria-hidden="true" />
          </button>
        </div>

        <div className="px-6 py-5">
          {/* Loading */}
          {step === "loading" && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-2.5 p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
            </div>
          )}

          {/* ─── CONNECTED STATE ─── */}
          {step === "connected" && (
            <div className="space-y-5">
              {/* Status banner */}
              <div className="flex items-center gap-3 p-4 bg-teal-50 rounded-xl border border-teal-100">
                <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-teal-900">Connected</p>
                  <p className="text-xs text-teal-700">
                    {existingItems.length} bank{existingItems.length !== 1 ? "s" : ""} linked
                  </p>
                </div>
              </div>

              {/* Connected institutions */}
              {existingItems.map((item) => (
                <div key={item.item_id} className="p-4 rounded-xl border border-gray-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Landmark className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.institution_name || "Bank Account"}</p>
                        <p className="text-[11px] text-gray-500">
                          {item.last_synced_at
                            ? `Last synced ${new Date(item.last_synced_at).toLocaleDateString()} at ${new Date(item.last_synced_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
                            : "Pending initial sync"}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                      item.status === "good" || item.status === "active"
                        ? "bg-teal-50 text-teal-700"
                        : item.status === "error"
                        ? "bg-red-50 text-red-700"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {item.status === "good" || item.status === "active" ? "Active" : item.status}
                    </span>
                  </div>

                  {/* Accounts under this institution */}
                  {existingAccounts.length > 0 && (
                    <div className="space-y-1.5 pl-6">
                      {existingAccounts.map((acct) => (
                        <div key={acct.id} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-700">
                              {acct.account_name || "Account"}
                              {acct.account_mask ? <span className="text-gray-400 ml-1">••{acct.account_mask}</span> : ""}
                            </span>
                          </div>
                          <span className="text-gray-500 truncate max-w-[120px]">
                            {acct.properties?.name || "All properties"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {existingItems.length > 1 && (
                    <button
                      onClick={() => handleDisconnect(item.item_id)}
                      disabled={disconnecting}
                      className="text-xs text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                    >
                      Disconnect this bank
                    </button>
                  )}
                </div>
              ))}

              {/* Sync results */}
              {syncResult && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <RefreshCw className="w-4 h-4 text-gray-500" />
                  <p className="text-xs text-gray-700">
                    <span className="font-medium">{syncResult.added} added</span>
                    {syncResult.modified > 0 && <>, <span className="font-medium">{syncResult.modified} updated</span></>}
                    {syncResult.removed > 0 && <>, <span className="font-medium">{syncResult.removed} removed</span></>}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="w-full py-3 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {syncing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Syncing...</>
                  ) : (
                    <><RefreshCw className="w-4 h-4" /> Sync Transactions</>
                  )}
                </button>

                <button
                  onClick={handleAddAnother}
                  className="w-full py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Landmark className="w-4 h-4" /> Connect Another Bank
                </button>

                <button
                  onClick={() => handleDisconnect()}
                  disabled={disconnecting}
                  className="w-full py-3 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {disconnecting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Disconnecting...</>
                  ) : (
                    <><Unlink className="w-4 h-4" /> Disconnect {existingItems.length > 1 ? "All Banks" : "Bank"}</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ─── INTRO ─── */}
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

          {/* ─── CONNECT ─── */}
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
                onError={(err) => setError(err)}
              />

              <button
                onClick={() => setStep(existingItems.length > 0 ? "connected" : "intro")}
                className="w-full py-3 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Back
              </button>

              <p className="text-center text-[10px] text-gray-400">
                By connecting, you agree to Plaid&apos;s <a href="https://plaid.com/legal/#end-user-privacy-policy" target="_blank" rel="noopener noreferrer" className="underline">End User Privacy Policy</a>
              </p>
            </div>
          )}

          {/* ─── ACCOUNTS ─── */}
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
                onClick={handleContinueToMapping}
                disabled={selectedAccounts.size === 0}
                className="w-full py-3 text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 rounded-xl transition-colors"
              >
                Next: Link to Properties
              </button>
            </div>
          )}

          {/* ─── MAPPING ─── */}
          {step === "mapping" && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Link2 className="w-4 h-4 text-teal-500" />
                  <h4 className="text-sm font-semibold text-gray-900">Link Accounts to Properties</h4>
                </div>
                <p className="text-xs text-gray-500">
                  Map each bank account to a property so transactions are automatically assigned. You can skip this and assign later.
                </p>
              </div>

              <div className="space-y-3">
                {accounts
                  .filter(a => selectedAccounts.has(a.account_id))
                  .map((account) => (
                    <div key={account.account_id} className="p-3 rounded-lg border border-gray-200 space-y-2">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                        <p className="text-xs font-medium text-gray-900">
                          {account.name}
                          {account.mask ? <span className="text-gray-400 ml-1">••{account.mask}</span> : ""}
                        </p>
                      </div>
                      <select
                        value={accountPropertyMap[account.account_id] || ""}
                        onChange={(e) =>
                          setAccountPropertyMap(prev => ({
                            ...prev,
                            [account.account_id]: e.target.value,
                          }))
                        }
                        className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-300"
                      >
                        <option value="">All properties (auto-match)</option>
                        {properties.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
              </div>

              {properties.length === 0 && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <Building2 className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700">No properties found. Add properties first, or skip this step -- you can map accounts to properties later from the integration settings.</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("accounts")}
                  className="flex-1 py-3 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleFinish}
                  disabled={savingMappings || importing}
                  className="flex-1 py-3 text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500 rounded-xl transition-colors"
                >
                  {savingMappings ? "Saving..." : importing ? "Importing..." : "Import Transactions"}
                </button>
              </div>
            </div>
          )}

          {/* ─── SUCCESS ─── */}
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
                {Object.values(accountPropertyMap).some(v => v) && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Linked Properties</span>
                    <span className="font-medium text-gray-700">
                      {Object.values(accountPropertyMap).filter(v => v).length}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Sync</span>
                  <span className="font-medium text-teal-600">Active -- Real-Time</span>
                </div>
              </div>
              <p className="text-xs text-gray-500">{txnCount > 0 ? `${txnCount} transactions imported and auto-categorized.` : "Transactions will appear in your Expenses shortly."} HostFi will match them to your properties.</p>
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
