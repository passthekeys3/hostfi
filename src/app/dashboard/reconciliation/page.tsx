"use client";

import { useEffect, useMemo, useState } from "react";
import { Scale } from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { formatCurrency } from "@/lib/utils";
import { downloadFile } from "@/lib/tax-export";
import {
  reconcilePlatforms,
  taxYearOf,
  type UserReconciliationInputs,
} from "@/lib/payout-reconciliation";

const PLATFORM_LABELS: Record<string, string> = {
  airbnb: "Airbnb",
  vrbo: "Vrbo",
  booking_com: "Booking.com",
  booking: "Booking.com",
  direct: "Direct",
  other: "Other",
};

function labelFor(platform: string): string {
  return PLATFORM_LABELS[platform] || platform;
}

function moneyInput(value: number): string {
  return value ? String(value) : "";
}

export default function ReconciliationPage() {
  const { revenue, loading } = useDashboardData();
  const [year, setYear] = useState(new Date().getFullYear());
  const [inputs, setInputs] = useState<Record<string, UserReconciliationInputs>>({});
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const years = useMemo(() => {
    const found = new Set<number>([new Date().getFullYear()]);
    for (const row of revenue) {
      const y = taxYearOf(row.check_in || row.date);
      if (y) found.add(y);
    }
    return [...found].sort((a, b) => b - a);
  }, [revenue]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      if (!supabase) return;
      const { data, error } = await supabase
        .from("tax_reconciliations")
        .select("platform, form_1099k_gross, occupancy_tax, adjustments")
        .eq("tax_year", year);
      if (cancelled) return;
      if (error) {
        setSaveNote("The 1099-K fields cannot be saved until the tax_reconciliations table exists. The booking and deposit math below still uses your records.");
        return;
      }
      const next: Record<string, UserReconciliationInputs> = {};
      for (const row of data || []) {
        next[row.platform] = {
          form1099kGross: row.form_1099k_gross == null ? null : Number(row.form_1099k_gross),
          occupancyTax: Number(row.occupancy_tax) || 0,
          adjustments: Number(row.adjustments) || 0,
        };
      }
      setInputs(next);
      setSaveNote(null);
    })();
    return () => { cancelled = true; };
  }, [year]);

  const rows = useMemo(() => reconcilePlatforms(
    revenue.map(row => ({
      platform: row.platform || "other",
      date: row.check_in || row.date,
      amount: row.amount || 0,
      platformFee: row.platform_fee ?? null,
      notes: row.notes,
      source: row.source,
    })),
    year,
    inputs
  ), [revenue, year, inputs]);

  const update = (platform: string, patch: Partial<UserReconciliationInputs>) => {
    setInputs(prev => {
      const current = prev[platform] || { form1099kGross: null, occupancyTax: 0, adjustments: 0 };
      return { ...prev, [platform]: { ...current, ...patch } };
    });
  };

  const save = async (platform: string) => {
    setSaving(true);
    setSaveNote(null);
    const current = inputs[platform] || { form1099kGross: null, occupancyTax: 0, adjustments: 0 };
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    if (!supabase) {
      setSaveNote("Sign in to save these figures.");
      setSaving(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaveNote("Sign in to save these figures.");
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("tax_reconciliations").upsert({
      user_id: user.id,
      tax_year: year,
      platform,
      form_1099k_gross: current.form1099kGross,
      occupancy_tax: current.occupancyTax,
      adjustments: current.adjustments,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,tax_year,platform" });
    setSaveNote(error ? "Could not save. Run the tax_reconciliations migration in Supabase, then try again." : `Saved ${labelFor(platform)} for ${year}.`);
    setSaving(false);
  };

  const exportCsv = () => {
    const header = ["Platform", "Bookings", "Gross bookings", "Host fees", "Occupancy tax entered", "Adjustments entered", "Expected payout", "Bank deposits", "Gap", "1099-K gross", "1099-K minus bookings"];
    const body = rows.map(row => [
      labelFor(row.platform),
      row.bookingCount,
      row.grossBookings.toFixed(2),
      row.platformFees.toFixed(2),
      row.occupancyTax.toFixed(2),
      row.adjustments.toFixed(2),
      row.expectedPayout.toFixed(2),
      row.bankDeposits.toFixed(2),
      row.gap.toFixed(2),
      row.form1099kGross == null ? "" : row.form1099kGross.toFixed(2),
      row.formVsBookings == null ? "" : row.formVsBookings.toFixed(2),
    ]);
    const csv = [header, ...body].map(line => line.map(cell => `"${cell}"`).join(",")).join("\n");
    downloadFile(csv, `hostfi-1099k-${year}.csv`, "text/csv");
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-700 mb-1">
            <Scale className="w-4 h-4" aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-widest">Tax</p>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">1099-K and bank payouts</h1>
          <p className="text-sm text-gray-600 mt-1 max-w-2xl">
            Gross bookings minus the host fee, the occupancy tax you enter, and refunds you enter. That expected payout is compared with deposits Plaid imported for the same platform.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="recon-year" className="text-sm text-gray-600">Tax year</label>
          <select
            id="recon-year"
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            type="button"
            onClick={exportCsv}
            disabled={rows.length === 0}
            className="px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg disabled:opacity-40"
          >
            Export CSV
          </button>
        </div>
      </div>

      {saveNote && (
        <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">{saveNote}</p>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading your bookings…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-600 bg-white border border-gray-200 rounded-xl p-6">
          No bookings or bank deposits for {year}. Add revenue, import a CSV, or sync Plaid. This page does not fill in sample numbers.
        </p>
      ) : (
        <div className="space-y-4">
          {rows.map(row => {
            const entered = inputs[row.platform] || { form1099kGross: null, occupancyTax: 0, adjustments: 0 };
            return (
              <section key={row.platform} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-lg font-semibold text-gray-900">{labelFor(row.platform)}</h2>
                  <p className={`text-sm font-medium ${Math.abs(row.gap) < 0.01 ? "text-teal-700" : "text-amber-700"}`}>
                    Gap {formatCurrency(row.gap)}
                  </p>
                </div>
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div><dt className="text-gray-500">Gross bookings</dt><dd className="font-medium">{formatCurrency(row.grossBookings)}</dd><dd className="text-xs text-gray-400">{row.bookingCount} stays</dd></div>
                  <div><dt className="text-gray-500">Host fees</dt><dd className="font-medium">{formatCurrency(row.platformFees)}</dd></div>
                  <div><dt className="text-gray-500">Expected payout</dt><dd className="font-medium">{formatCurrency(row.expectedPayout)}</dd></div>
                  <div><dt className="text-gray-500">Bank deposits</dt><dd className="font-medium">{formatCurrency(row.bankDeposits)}</dd><dd className="text-xs text-gray-400">{row.depositCount} deposits</dd></div>
                </dl>
                <div className="grid sm:grid-cols-3 gap-3">
                  <label className="text-xs text-gray-600 block">
                    1099-K gross from the form
                    <input
                      inputMode="decimal"
                      value={entered.form1099kGross == null ? "" : String(entered.form1099kGross)}
                      onChange={e => update(row.platform, { form1099kGross: e.target.value === "" ? null : Number(e.target.value) })}
                      className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                      placeholder="Leave blank if you do not have the form"
                    />
                  </label>
                  <label className="text-xs text-gray-600 block">
                    Occupancy tax the platform remitted
                    <input
                      inputMode="decimal"
                      value={moneyInput(entered.occupancyTax)}
                      onChange={e => update(row.platform, { occupancyTax: Number(e.target.value) || 0 })}
                      className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                    />
                  </label>
                  <label className="text-xs text-gray-600 block">
                    Refunds and adjustments
                    <input
                      inputMode="decimal"
                      value={moneyInput(entered.adjustments)}
                      onChange={e => update(row.platform, { adjustments: Number(e.target.value) || 0 })}
                      className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                    />
                  </label>
                </div>
                {row.formVsBookings != null && (
                  <p className="text-sm text-gray-700">
                    1099-K gross minus your booking gross: {formatCurrency(row.formVsBookings)}
                  </p>
                )}
                <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
                  {row.notes.map(note => <li key={note}>{note}</li>)}
                </ul>
                <button
                  type="button"
                  onClick={() => save(row.platform)}
                  disabled={saving}
                  className="px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg disabled:opacity-50"
                >
                  Save {labelFor(row.platform)}
                </button>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
