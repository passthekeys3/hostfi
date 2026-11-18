"use client";

import { useEffect, useMemo, useState } from "react";
import { Users } from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { formatCurrency } from "@/lib/utils";
import { downloadFile } from "@/lib/tax-export";
import {
  necRollupCsv,
  rollupVendors,
  tinLast4OrReject,
  type VendorTaxProfile,
} from "@/lib/nec-1099";

export default function NecPage() {
  const { expenses, loading } = useDashboardData();
  const [year, setYear] = useState(new Date().getFullYear());
  const [profiles, setProfiles] = useState<VendorTaxProfile[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { w9: boolean; last4: string }>>({});
  const [note, setNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const years = useMemo(() => {
    const found = new Set<number>([new Date().getFullYear()]);
    for (const expense of expenses) {
      if (expense.date) found.add(Number(expense.date.slice(0, 4)));
    }
    return [...found].sort((a, b) => b - a);
  }, [expenses]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      if (!supabase) return;
      const { data, error } = await supabase.from("vendor_tax_profiles").select("vendor_key, w9_on_file, tin_last4");
      if (cancelled) return;
      if (error) {
        setNote("W-9 flags cannot be saved until the vendor_tax_profiles migration is applied. Totals below still use your expenses.");
        return;
      }
      const next = (data || []).map(row => ({
        vendorKey: row.vendor_key as string,
        w9OnFile: Boolean(row.w9_on_file),
        tinLast4: (row.tin_last4 as string | null) || null,
      }));
      setProfiles(next);
      setNote(null);
    })();
    return () => { cancelled = true; };
  }, []);

  const rollup = useMemo(() => rollupVendors(
    expenses.map(expense => ({
      vendor: expense.vendor,
      amount: expense.amount,
      date: expense.date,
      status: expense.status,
      paidAt: expense.paid_at,
      category: expense.category,
    })),
    profiles,
    year
  ), [expenses, profiles, year]);

  useEffect(() => {
    setDrafts(Object.fromEntries(rollup.rows.map(row => [row.vendorKey, {
      w9: row.w9OnFile,
      last4: row.tinLast4 || "",
    }])));
  }, [rollup]);

  const save = async (vendorKey: string) => {
    const draft = drafts[vendorKey] || { w9: false, last4: "" };
    const tin = tinLast4OrReject(draft.last4);
    if (!tin.ok) {
      setNote(tin.reason);
      return;
    }
    setSaving(true);
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const user = supabase ? (await supabase.auth.getUser()).data.user : null;
    if (!supabase || !user) {
      setNote("Sign in to save a W-9 flag.");
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("vendor_tax_profiles").upsert({
      user_id: user.id,
      vendor_key: vendorKey,
      w9_on_file: draft.w9,
      tin_last4: tin.last4,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,vendor_key" });
    if (error) {
      setNote("Could not save. Run the vendor_tax_profiles migration in Supabase, then try again.");
    } else {
      setProfiles(prev => {
        const rest = prev.filter(profile => profile.vendorKey !== vendorKey);
        return [...rest, { vendorKey, w9OnFile: draft.w9, tinLast4: tin.last4 }];
      });
      setNote("Saved. Only the last 4 digits were stored.");
    }
    setSaving(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-700 mb-1">
            <Users className="w-4 h-4" aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-widest">Tax</p>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">1099-NEC vendor rollup</h1>
          <p className="text-sm text-gray-600 mt-1 max-w-2xl">
            Paid expenses grouped by vendor for {year}. HostFi does not file Form 1099-NEC.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="nec-year" className="text-sm text-gray-600">Tax year</label>
          <select id="nec-year" value={year} onChange={e => setYear(Number(e.target.value))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg">
            {years.map(value => <option key={value} value={value}>{value}</option>)}
          </select>
          <button
            type="button"
            onClick={() => downloadFile(necRollupCsv(rollup), `hostfi-1099-nec-${year}.csv`, "text/csv")}
            disabled={rollup.rows.length === 0}
            className="px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg disabled:opacity-40"
          >
            Export CSV
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        {rollup.threshold.source} Backup withholding still requires a form at any amount, and some payees (including many corporations) are exempt. This page only flags the dollar threshold. Enter the last 4 digits of a TIN if you want them on the worksheet. Do not paste a full SSN or EIN.
      </p>

      {note && <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">{note}</p>}

      {loading ? (
        <p className="text-sm text-gray-500">Loading expenses…</p>
      ) : rollup.rows.length === 0 ? (
        <p className="text-sm text-gray-600 bg-white border border-gray-200 rounded-xl p-6">
          No paid expenses with a vendor name for {year}. Pending and scheduled bills are not included. This page does not add sample vendors.
        </p>
      ) : (
        <div className="space-y-4">
          {rollup.rows.map(row => {
            const draft = drafts[row.vendorKey] || { w9: row.w9OnFile, last4: row.tinLast4 || "" };
            return (
              <section key={row.vendorKey} className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-lg font-semibold text-gray-900">{row.vendorName}</h2>
                  <p className={`text-sm font-medium ${row.atOrOverThreshold ? "text-amber-700" : "text-gray-600"}`}>
                    {formatCurrency(row.amount)}
                    {row.atOrOverThreshold === true && " · at or over the reporting threshold"}
                    {row.atOrOverThreshold === false && " · under the reporting threshold"}
                    {row.atOrOverThreshold === null && " · threshold for this year is not hardcoded"}
                  </p>
                </div>
                <p className="text-xs text-gray-500">{row.expenseCount} paid {row.expenseCount === 1 ? "expense" : "expenses"} · {row.categories.join(", ") || "no category"}</p>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="text-xs text-gray-600 inline-flex items-center gap-2 min-h-11">
                    <input
                      type="checkbox"
                      checked={draft.w9}
                      onChange={e => setDrafts(prev => ({ ...prev, [row.vendorKey]: { ...draft, w9: e.target.checked } }))}
                    />
                    W-9 on file
                  </label>
                  <label className="text-xs text-gray-600 block">
                    TIN last 4
                    <input
                      inputMode="numeric"
                      autoComplete="off"
                      value={draft.last4}
                      onChange={e => {
                        const digits = e.target.value.replace(/\D/g, "");
                        if (digits.length > 4) {
                          setNote("Enter only the last 4 digits. HostFi does not store a full TIN.");
                          return;
                        }
                        setDrafts(prev => ({ ...prev, [row.vendorKey]: { ...draft, last4: digits } }));
                      }}
                      className="mt-1 w-28 px-3 py-2 text-sm border border-gray-200 rounded-lg"
                      placeholder="4 digits"
                    />
                  </label>
                  <button type="button" onClick={() => save(row.vendorKey)} disabled={saving} className="px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg disabled:opacity-50">
                    Save
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {rollup.unassignedCount > 0 && (
        <p className="text-sm text-gray-600">
          {formatCurrency(rollup.unassignedAmount)} across {rollup.unassignedCount} paid {rollup.unassignedCount === 1 ? "expense" : "expenses"} has no vendor name, so it is left off the filing worksheet.
        </p>
      )}
    </div>
  );
}
