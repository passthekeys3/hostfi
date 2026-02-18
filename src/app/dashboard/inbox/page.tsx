"use client";

import { useState, useEffect, useRef } from "react";
import type { InboxItem } from "@/lib/types";
import type { Property } from "@/lib/data/data-provider";
import { ALL_EXPENSE_CATEGORIES, EXPENSE_CATEGORY_CONFIG } from "@/lib/expense-categories";
import { useDashboardData } from "@/hooks/useDashboardData";

// Helper function to get property name from properties list
function getPropertyName(propertyId: string | null, properties: Property[]): string {
  if (!propertyId) return 'Unassigned';
  const prop = properties.find(p => p.id === propertyId);
  return prop?.name || 'Unknown Property';
}
import { formatCurrency } from "@/lib/utils";
import {
  Flame, Droplets, Zap, Wifi, Trash2, Home, Shield, HelpCircle,
  Check, X, Pencil, ChevronDown, ChevronUp, Mail, Clock, MapPin,
  AlertTriangle, Building2,
} from "lucide-react";
// Note: Circle was previously imported but never used

const utilityIcons: Record<string, React.ElementType> = {
  gas: Flame, water: Droplets, electric: Zap, internet: Wifi,
  trash: Trash2, rent: Home, insurance: Shield, other: HelpCircle,
};

const utilityColors: Record<string, string> = {
  gas: "text-orange-600", water: "text-blue-600", electric: "text-yellow-600",
  internet: "text-purple-600", trash: "text-stone-600", rent: "text-teal-600",
  insurance: "text-cyan-600", other: "text-muted-foreground",
};

const statusLeftBorder: Record<string, string> = {
  exact_mapping: "border-l-teal-500",
  address: "border-l-blue-500",
  account_number: "border-l-purple-500",
  none: "border-l-red-400",
};

function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = score > 0.8
    ? "bg-teal-500/10 text-teal-600 border-teal-500/20"
    : score > 0.5
      ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
      : "bg-red-500/10 text-red-600 border-red-500/20";

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>
        {pct}%
      </span>
      <div className="w-16 h-1.5 bg-[#f0eeeb] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${score > 0.8 ? 'bg-teal-500' : score > 0.5 ? 'bg-yellow-500' : 'bg-red-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function MatchBadge({ type }: { type: string }) {
  const labels: Record<string, { label: string; color: string }> = {
    exact_mapping: { label: "Exact Match", color: "bg-teal-500/10 text-teal-600 border-teal-500/20" },
    address: { label: "Address Match", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
    account_number: { label: "Account Match", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
    none: { label: "No Match", color: "bg-red-500/10 text-red-600 border-red-500/20" },
  };
  const m = labels[type] ?? labels.none;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${m.color}`}>
      {m.label}
    </span>
  );
}

function InboxCard({ item, onConfirm, onReject, onUpdate, properties, allProperties }: { item: InboxItem; onConfirm: (propertyOverride?: string | null) => void; onReject: () => void; onUpdate: (updates: Partial<InboxItem['parsed']> & { property_id?: string | null }) => void; properties: { id: string; name: string }[]; allProperties: Property[] }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [assignedProperty, setAssignedProperty] = useState(item.match.property_id);
  const [editAmount, setEditAmount] = useState(item.parsed.amount.toString());
  const [editProvider, setEditProvider] = useState(item.parsed.provider_name);
  const [editType, setEditType] = useState(item.parsed.utility_type);
  const [editDueDate, setEditDueDate] = useState(item.parsed.due_date ?? '');
  const Icon = utilityIcons[item.parsed.utility_type] ?? HelpCircle;
  const iconColor = utilityColors[item.parsed.utility_type] ?? "text-muted-foreground";
  const leftBorder = statusLeftBorder[item.match.match_type] ?? "border-l-gray-300";

  const relativeTime = (() => {
    const diff = Date.now() - new Date(item.received_at).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  })();

  return (
    <div className={`bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-200/60 border-l-[3px] ${leftBorder} overflow-hidden transition-all duration-200 hover:shadow-md`}>
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className={`mt-0.5 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center ${iconColor}`}>
            <Icon className="w-[18px] h-[18px]" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-sm truncate">{item.parsed.provider_name}</h3>
                  <span className="text-xs text-muted-foreground capitalize px-2 py-0.5 bg-gray-100 rounded-full">
                    {item.parsed.utility_type}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.subject}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold tabular-nums">{formatCurrency(item.parsed.amount)}</p>
                {item.parsed.due_date && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end mt-0.5">
                    <Clock className="w-3 h-3" />
                    Due {new Date(item.parsed.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 mt-3 flex-wrap">
              {item.match.match_type !== "none" ? (
                <div className="flex items-center gap-1.5 text-xs">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-foreground font-medium">{getPropertyName(assignedProperty, allProperties)}</span>
                  <MatchBadge type={item.match.match_type} />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-600" />
                  <select
                    value={assignedProperty ?? ""}
                    onChange={(e) => setAssignedProperty(e.target.value || null)}
                    className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  >
                    <option value="">Assign property...</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <ConfidenceBadge score={item.parsed.confidence} />
              <span className="text-xs text-muted-foreground ml-auto">{relativeTime}</span>
            </div>
          </div>
        </div>

        {/* Edit form */}
        {editing && (
          <div className="mt-4 ml-0 sm:ml-14 bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Provider</label>
                <input
                  type="text"
                  value={editProvider}
                  onChange={(e) => setEditProvider(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  {ALL_EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{EXPENSE_CATEGORY_CONFIG[cat].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Property</label>
                <select
                  value={assignedProperty ?? ""}
                  onChange={(e) => setAssignedProperty(e.target.value || null)}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="">Unassigned</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => {
                  onUpdate({
                    provider_name: editProvider,
                    amount: parseFloat(editAmount) || item.parsed.amount,
                    utility_type: editType,
                    due_date: editDueDate || null,
                    property_id: assignedProperty,
                  });
                  setEditing(false);
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <Check className="w-3.5 h-3.5" /> Save Changes
              </button>
              <button
                onClick={() => {
                  setEditProvider(item.parsed.provider_name);
                  setEditAmount(item.parsed.amount.toString());
                  setEditType(item.parsed.utility_type);
                  setEditDueDate(item.parsed.due_date ?? '');
                  setEditing(false);
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!editing && (
          <div className="flex items-center gap-2 mt-4 sm:mt-5 ml-0 sm:ml-14 flex-wrap">
            <button
              onClick={() => {
                // Pass the locally-selected property directly to avoid state timing issues
                onConfirm(assignedProperty);
              }}
              className="flex items-center gap-1.5 px-4 py-2 min-h-[44px] bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-all duration-200 text-xs font-medium shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={!assignedProperty && item.match.match_type === 'none'}
            >
              <Check className="w-3.5 h-3.5" /> Confirm
            </button>
            {!assignedProperty && item.match.match_type === 'none' && (
              <span className="text-xs text-amber-600">← Assign a property first</span>
            )}
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-white text-foreground rounded-xl hover:bg-gray-100 transition-all duration-200 text-xs font-medium border border-gray-200 shadow-sm"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
            <button
              onClick={onReject}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 text-red-600 rounded-xl hover:bg-red-500/20 transition-all duration-200 text-xs font-medium border border-red-500/15"
            >
              <X className="w-3.5 h-3.5" /> Reject
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors duration-150"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {expanded ? "Hide" : "Details"}
            </button>
          </div>
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-4 sm:p-6 sm:ml-14 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-xs">
            <div>
              <span className="text-muted-foreground">Account</span>
              <p className="font-mono mt-0.5">{item.parsed.account_number ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Billing Period</span>
              <p className="mt-0.5">
                {item.parsed.billing_period_start && item.parsed.billing_period_end
                  ? `${new Date(item.parsed.billing_period_start).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(item.parsed.billing_period_end).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                  : "—"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Service Address</span>
              <p className="mt-0.5 flex items-start gap-1">
                <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                {item.parsed.service_address ?? "—"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Sender</span>
              <p className="mt-0.5 truncate">{item.sender_email}</p>
            </div>
          </div>

          {item.body_preview && (
            <div>
              <span className="text-xs text-muted-foreground">Email Preview</span>
              <pre className="mt-1 text-xs text-muted-foreground bg-white rounded-xl p-4 whitespace-pre-wrap font-mono leading-relaxed max-h-40 overflow-y-auto border border-gray-200/60">
                {item.body_preview}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function InboxPage() {
  const { properties: allProperties, loading: dashLoading } = useDashboardData();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [inboxLoading, setInboxLoading] = useState(true);
  const fetchedRef = useRef(false);

  // Fetch real parsed emails — only once when properties are loaded
  useEffect(() => {
    if (dashLoading || fetchedRef.current) return;
    fetchedRef.current = true;
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        if (!supabase) return;
        const { data } = await supabase.from("parsed_emails").select("*").order("received_at", { ascending: false });
        if (data && data.length > 0) {
          // Build address lookup from real properties for auto-matching
          const propList = allProperties.map((p) => ({
            id: p.id,
            address: [p.address_line1, p.city, p.state, p.zip].filter(Boolean).join(" ").toLowerCase().trim(),
          })).filter((p) => p.address.length > 0);

          const findPropertyByAddress = (serviceAddress: string | null): { id: string; confidence: number } | null => {
            if (!serviceAddress) return null;
            const addr = serviceAddress.toLowerCase().trim();
            // Exact or strong substring match
            for (const prop of propList) {
              if (addr.includes(prop.address) || prop.address.includes(addr)) {
                return { id: prop.id, confidence: 0.95 };
              }
            }
            // Fuzzy: check if major parts match (street number + street name)
            const addrParts = addr.split(/[\s,]+/).filter(Boolean);
            for (const prop of propList) {
              const propParts = prop.address.split(/[\s,]+/).filter(Boolean);
              const matchingParts = addrParts.filter((part) => propParts.includes(part));
              const score = matchingParts.length / Math.max(propParts.length, 1);
              if (score > 0.5) {
                return { id: prop.id, confidence: score };
              }
            }
            return null;
          };

          const mapped: InboxItem[] = data.map((row: Record<string, unknown>) => {
            const existingPropertyId = row.property_id as string | null;
            const serviceAddress = row.service_address as string | null;

            // Auto-match by address if no property assigned yet
            let matchedPropertyId = existingPropertyId;
            let matchType: "exact_mapping" | "address" | "account_number" | "none" = existingPropertyId ? "exact_mapping" : "none";
            let matchConfidence = existingPropertyId ? 1 : 0;

            if (!existingPropertyId && serviceAddress) {
              const addressMatch = findPropertyByAddress(serviceAddress);
              if (addressMatch) {
                matchedPropertyId = addressMatch.id;
                matchType = "address";
                matchConfidence = addressMatch.confidence;
                // Don't persist auto-match here — only save on user confirm/edit
              }
            }

            return {
              id: row.id as string,
              sender_email: row.source_from as string || "Unknown",
              subject: row.source_subject as string || "Parsed Bill",
              body_preview: "",
              received_at: row.received_at as string || new Date().toISOString(),
              status: (row.status as string) === "approved" ? "confirmed" as const : (row.status as string) === "dismissed" ? "rejected" as const : "pending_review" as const,
              parsed: {
                provider_name: row.vendor_name as string || "Unknown",
                utility_type: row.category as string || "other",
                amount: row.amount as number || 0,
                due_date: row.due_date as string || null,
                billing_period_start: null,
                billing_period_end: null,
                account_number: row.account_number as string || null,
                service_address: serviceAddress,
                confidence: row.confidence as number || 0.8,
                raw_extraction: {},
              },
              match: {
                property_id: matchedPropertyId,
                utility_account_id: null,
                match_type: matchType,
                confidence: matchConfidence,
                candidates: [],
              },
            };
          });
          setItems(mapped);
        }
      } catch (error) {
        console.error("Failed to fetch inbox items:", error);
      }
      setInboxLoading(false);
    })();
  }, [dashLoading]); // eslint-disable-line react-hooks/exhaustive-deps
  const pendingItems = items.filter((i) => i.status === "pending_review");
  const processedItems = items.filter((i) => i.status !== "pending_review");
  const [pendingPage, setPendingPage] = useState(1);
  const [processedPage, setProcessedPage] = useState(1);
  const [bulkConfirming, setBulkConfirming] = useState(false);
  const ITEMS_PER_PAGE = 20;

  // Items that have a property and can be bulk-confirmed
  const confirmableItems = pendingItems.filter(i => i.match.property_id);

  const paginatedPending = pendingItems.slice((pendingPage - 1) * ITEMS_PER_PAGE, pendingPage * ITEMS_PER_PAGE);
  const pendingTotalPages = Math.ceil(pendingItems.length / ITEMS_PER_PAGE);
  const paginatedProcessed = processedItems.slice((processedPage - 1) * ITEMS_PER_PAGE, processedPage * ITEMS_PER_PAGE);
  const processedTotalPages = Math.ceil(processedItems.length / ITEMS_PER_PAGE);

  const persistStatus = async (id: string, status: "approved" | "dismissed", item?: InboxItem, propertyId?: string | null) => {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      if (!supabase) return;

      // Update parsed_emails status
      await supabase.from("parsed_emails").update({ status }).eq("id", id);

      // If confirming, create an expense
      if (status === "approved" && item) {
        const propId = propertyId ?? item.match.property_id;
        if (propId) {
          // Map inbox utility types to expense categories
          const categoryMap: Record<string, string> = {
            gas: "utility", water: "utility", electric: "utility", internet: "utility",
            trash: "utility", rent: "rent", insurance: "insurance", cleaning: "cleaning",
            maintenance: "maintenance", supplies: "supplies", taxes: "taxes",
            management: "management", subscription: "subscription", improvement: "improvement",
            mortgage: "mortgage", other: "other",
          };
          const vendorName = item.parsed.provider_name || "Unknown";
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (!authUser) { console.error("Not authenticated — can't create expense"); return; }
          const { error: insertError } = await supabase.from("expenses").insert({
            user_id: authUser.id,
            property_id: propId,
            vendor: vendorName,
            amount: item.parsed.amount,
            category: categoryMap[item.parsed.utility_type] || "utility",
            date: item.parsed.due_date || new Date().toISOString().split("T")[0],
            source: "email_parse",
            status: "paid",
            description: vendorName,
          });
          if (insertError) {
            console.error("Failed to create expense from confirmed bill:", insertError);
          } else {
            // Fire-and-forget: sync to Google Sheets
            const prop = allProperties.find(p => p.id === propId);
            fetch("/api/integrations/google/sync-expense", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                expense: {
                  date: item.parsed.due_date || new Date().toISOString().split("T")[0],
                  property_name: prop?.name || "Unknown",
                  category: categoryMap[item.parsed.utility_type] || "utility",
                  amount: item.parsed.amount,
                  description: vendorName,
                },
              }),
            }).catch(() => {});
          }
        } else {
          console.warn("Bill confirmed without property assignment — no expense created for:", id);
        }
      }
    } catch (err) {
      console.error("Failed to persist status:", err);
    }
  };

  const handleConfirm = (id: string, propertyOverride?: string | null) => {
    const item = items.find((i) => i.id === id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: "confirmed" as const } : i)));
    // Use propertyOverride from the InboxCard's local state (most up-to-date)
    persistStatus(id, "approved", item, propertyOverride ?? item?.match.property_id);
  };

  const handleReject = (id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: "rejected" as const } : i)));
    persistStatus(id, "dismissed");
  };

  const handleUpdate = (id: string, updates: Partial<InboxItem['parsed']> & { property_id?: string | null }) => {
    setItems((prev) => prev.map((i) => {
      if (i.id !== id) return i;
      const { property_id, ...parsedUpdates } = updates;
      return {
        ...i,
        parsed: { ...i.parsed, ...parsedUpdates },
        match: property_id !== undefined
          ? { ...i.match, property_id, match_type: property_id ? 'exact_mapping' as const : 'none' as const, confidence: property_id ? 1 : 0 }
          : i.match,
      };
    }));

    // Persist all edit changes to Supabase
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        if (!supabase) return;
        const dbUpdates: Record<string, unknown> = {};
        if (updates.property_id !== undefined) dbUpdates.property_id = updates.property_id;
        if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
        if (updates.provider_name !== undefined) dbUpdates.vendor_name = updates.provider_name;
        if (updates.utility_type !== undefined) dbUpdates.category = updates.utility_type;
        if (updates.due_date !== undefined) dbUpdates.due_date = updates.due_date;
        if (Object.keys(dbUpdates).length > 0) {
          await supabase.from("parsed_emails").update(dbUpdates).eq("id", id);
        }
      } catch (error) {
        console.error("Failed to persist edit changes:", error);
      }
    })();
  };

  const handleBulkConfirm = async () => {
    if (confirmableItems.length === 0) return;
    setBulkConfirming(true);
    for (const item of confirmableItems) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "confirmed" as const } : i)));
      await persistStatus(item.id, "approved", item, item.match.property_id);
    }
    setBulkConfirming(false);
  };

  return (
    <div className="space-y-10">
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Inbox</h1>
          <p className="text-gray-500 mt-2 leading-relaxed">
            Review and Confirm Parsed Bills From Your Email
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {confirmableItems.length > 0 && (
            <button
              onClick={handleBulkConfirm}
              disabled={bulkConfirming}
              className="flex items-center gap-1.5 px-4 py-2 min-h-[44px] bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-all text-xs font-medium shadow-sm disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              {bulkConfirming ? "Confirming..." : `Confirm All Matched (${confirmableItems.length})`}
            </button>
          )}
          {pendingItems.length > 0 && (
            <span className="px-3 py-1.5 bg-teal-500/10 text-teal-600 rounded-full text-sm font-medium border border-teal-500/20">
              {pendingItems.length} pending
            </span>
          )}
        </div>
      </div>

      {inboxLoading ? (
        <div className="space-y-4 animate-pulse">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-gray-100 rounded-2xl" />)}
        </div>
      ) : pendingItems.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-200/60 p-12 text-center">
          <Mail className="w-12 h-12 mx-auto text-muted-foreground/30" />
          <h3 className="mt-4 font-semibold text-lg">All caught up!</h3>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            No bills waiting for review. Forward bills to your HostFi email to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedPending.map((item) => (
            <InboxCard
              key={item.id}
              item={item}
              properties={allProperties}
              allProperties={allProperties}
              onConfirm={(propertyOverride) => handleConfirm(item.id, propertyOverride)}
              onReject={() => handleReject(item.id)}
              onUpdate={(updates) => handleUpdate(item.id, updates)}
            />
          ))}
          {pendingTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button onClick={() => setPendingPage(p => Math.max(1, p - 1))} disabled={pendingPage === 1} className="px-3 py-2 text-sm font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]">Previous</button>
              <span className="text-sm text-muted-foreground px-3">Page {pendingPage} of {pendingTotalPages}</span>
              <button onClick={() => setPendingPage(p => Math.min(pendingTotalPages, p + 1))} disabled={pendingPage === pendingTotalPages} className="px-3 py-2 text-sm font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]">Next</button>
            </div>
          )}
        </div>
      )}

      {processedItems.length > 0 && (
        <div>
          <h2 className="text-base font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            Processed ({processedItems.length})
          </h2>
          <div className="space-y-2">
            {paginatedProcessed.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200/60 opacity-60 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              >
                <div className={`p-1.5 rounded-full bg-gray-100 ${utilityColors[item.parsed.utility_type]}`}>
                  {(() => {
                    const I = utilityIcons[item.parsed.utility_type] ?? HelpCircle;
                    return <I className="w-4 h-4" />;
                  })()}
                </div>
                <span className="text-sm font-medium flex-1">{item.parsed.provider_name}</span>
                <span className="text-sm tabular-nums">{formatCurrency(item.parsed.amount)}</span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full ${
                    item.status === "confirmed"
                      ? "bg-teal-500/10 text-teal-600"
                      : "bg-red-500/10 text-red-600"
                  }`}
                >
                  {item.status === "confirmed" ? "Confirmed" : "Rejected"}
                </span>
                <button
                  onClick={() => {
                    // Move back to pending so user can re-confirm
                    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "pending_review" as const } : i)));
                    (async () => {
                      try {
                        const { createClient } = await import("@/lib/supabase/client");
                        const supabase = createClient();
                        if (supabase) {
                          await supabase.from("parsed_emails").update({ status: "pending" }).eq("id", item.id);
                        }
                      } catch (error) {
                        console.error("Failed to reset item status:", error);
                      }
                    })();
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
                >
                  Redo
                </button>
              </div>
            ))}
            {processedTotalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button onClick={() => setProcessedPage(p => Math.max(1, p - 1))} disabled={processedPage === 1} className="px-3 py-2 text-sm font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]">Previous</button>
                <span className="text-sm text-muted-foreground px-3">Page {processedPage} of {processedTotalPages}</span>
                <button onClick={() => setProcessedPage(p => Math.min(processedTotalPages, p + 1))} disabled={processedPage === processedTotalPages} className="px-3 py-2 text-sm font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]">Next</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
