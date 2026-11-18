"use client";

import { useEffect, useMemo, useState } from "react";
import { Landmark } from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { formatCurrency } from "@/lib/utils";
import { downloadFile } from "@/lib/tax-export";
import {
  buildOccupancyLedger,
  occupancyLedgerCsv,
  stayDate,
  type FilingCadence,
  type OccupancyRate,
  type OccupancyRemittance,
} from "@/lib/occupancy-tax";

function moneyText(value: number | null): string {
  return value == null ? "—" : formatCurrency(value);
}

function draftMoney(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export default function OccupancyTaxPage() {
  const { properties, revenue, loading } = useDashboardData();
  const [year, setYear] = useState(new Date().getFullYear());
  const [cadence, setCadence] = useState<FilingCadence>("quarterly");
  const [rates, setRates] = useState<OccupancyRate[]>([]);
  const [remittances, setRemittances] = useState<OccupancyRemittance[]>([]);
  const [rateDrafts, setRateDrafts] = useState<Record<string, { jurisdiction: string; rate: string }>>({});
  const [moneyDrafts, setMoneyDrafts] = useState<Record<string, { collected: string; remittedPlatform: string; remittedHost: string }>>({});
  const [note, setNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const years = useMemo(() => {
    const found = new Set<number>([new Date().getFullYear()]);
    for (const row of revenue) {
      const date = stayDate({ propertyId: row.property_id, date: row.date, checkIn: row.check_in, amount: row.amount });
      if (date) found.add(Number(date.slice(0, 4)));
    }
    return [...found].sort((a, b) => b - a);
  }, [revenue]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      if (!supabase) return;
      const [rateResult, remittanceResult] = await Promise.all([
        supabase.from("occupancy_tax_rates").select("property_id, jurisdiction, rate_percent"),
        supabase.from("occupancy_tax_remittances").select("property_id, period_start, cadence, collected_by_platform, remitted_by_platform, remitted_by_host"),
      ]);
      if (cancelled) return;
      if (rateResult.error || remittanceResult.error) {
        setNote("Rates and remittances cannot be saved until the occupancy tax migration is applied. Booking totals below still use your records.");
        return;
      }
      const nextRates = (rateResult.data || []).map(row => ({
        propertyId: row.property_id as string,
        jurisdiction: (row.jurisdiction as string) || "",
        ratePercent: Number(row.rate_percent),
      }));
      setRates(nextRates);
      setRateDrafts(Object.fromEntries(nextRates.map(rate => [rate.propertyId, {
        jurisdiction: rate.jurisdiction,
        rate: String(rate.ratePercent),
      }])));
      setRemittances((remittanceResult.data || []).map(row => ({
        propertyId: row.property_id as string,
        periodStart: String(row.period_start).slice(0, 10),
        cadence: row.cadence as FilingCadence,
        collectedByPlatform: Number(row.collected_by_platform) || 0,
        remittedByPlatform: Number(row.remitted_by_platform) || 0,
        remittedByHost: Number(row.remitted_by_host) || 0,
      })));
      setNote(null);
    })();
    return () => { cancelled = true; };
  }, []);

  const rows = useMemo(() => buildOccupancyLedger(
    properties.map(property => ({ id: property.id, name: property.name })),
    revenue.map(row => ({
      propertyId: row.property_id,
      date: row.date,
      checkIn: row.check_in,
      checkOut: row.check_out,
      nights: row.nights,
      amount: row.amount || 0,
      notes: row.notes,
    })),
    rates,
    remittances,
    year,
    cadence
  ), [properties, revenue, rates, remittances, year, cadence]);

  useEffect(() => {
    setMoneyDrafts(Object.fromEntries(rows.map(row => [`${row.propertyId}:${row.periodStart}`, {
      collected: row.collectedByPlatform ? String(row.collectedByPlatform) : "",
      remittedPlatform: row.remittedByPlatform ? String(row.remittedByPlatform) : "",
      remittedHost: row.remittedByHost ? String(row.remittedByHost) : "",
    }])));
  }, [rows]);

  const signedInClient = async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    return { supabase, userId: user.id };
  };

  const saveRate = async (propertyId: string) => {
    const draft = rateDrafts[propertyId] || { jurisdiction: "", rate: "" };
    const ratePercent = Number(draft.rate);
    if (!draft.jurisdiction.trim() || !Number.isFinite(ratePercent) || ratePercent < 0 || ratePercent > 100) {
      setNote("Enter the jurisdiction name you use and a rate from 0 to 100. HostFi does not look one up.");
      return;
    }
    setSaving(true);
    const client = await signedInClient();
    if (!client) {
      setNote("Sign in to save a rate.");
      setSaving(false);
      return;
    }
    const { error } = await client.supabase.from("occupancy_tax_rates").upsert({
      user_id: client.userId,
      property_id: propertyId,
      jurisdiction: draft.jurisdiction.trim(),
      rate_percent: ratePercent,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,property_id" });
    if (error) {
      setNote("Could not save the rate. Run the occupancy tax migration in Supabase, then try again.");
    } else {
      setRates(prev => {
        const rest = prev.filter(rate => rate.propertyId !== propertyId);
        return [...rest, { propertyId, jurisdiction: draft.jurisdiction.trim(), ratePercent }];
      });
      setNote("Saved the rate you entered.");
    }
    setSaving(false);
  };

  const saveRemittance = async (propertyId: string, periodStart: string) => {
    const draft = moneyDrafts[`${propertyId}:${periodStart}`] || { collected: "", remittedPlatform: "", remittedHost: "" };
    setSaving(true);
    const client = await signedInClient();
    if (!client) {
      setNote("Sign in to save remittance amounts.");
      setSaving(false);
      return;
    }
    const next = {
      propertyId,
      periodStart,
      cadence,
      collectedByPlatform: draftMoney(draft.collected),
      remittedByPlatform: draftMoney(draft.remittedPlatform),
      remittedByHost: draftMoney(draft.remittedHost),
    };
    const { error } = await client.supabase.from("occupancy_tax_remittances").upsert({
      user_id: client.userId,
      property_id: propertyId,
      period_start: periodStart,
      cadence,
      collected_by_platform: next.collectedByPlatform,
      remitted_by_platform: next.remittedByPlatform,
      remitted_by_host: next.remittedByHost,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,property_id,period_start,cadence" });
    if (error) {
      setNote("Could not save. Run the occupancy tax migration in Supabase, then try again.");
    } else {
      setRemittances(prev => {
        const rest = prev.filter(row => !(row.propertyId === propertyId && row.periodStart === periodStart && row.cadence === cadence));
        return [...rest, next];
      });
      setNote(`Saved ${cadence} amounts for ${periodStart}.`);
    }
    setSaving(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-700 mb-1">
            <Landmark className="w-4 h-4" aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-widest">Tax</p>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Occupancy tax ledger</h1>
          <p className="text-sm text-gray-600 mt-1 max-w-2xl">
            Gross bookings for each property and filing period, the rate you enter, tax the platform collected or remitted, and the balance you still have to remit. HostFi is not a tax advisor and does not look up town or county rates.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="occ-year" className="text-sm text-gray-600">Year</label>
          <select id="occ-year" value={year} onChange={e => setYear(Number(e.target.value))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg">
            {years.map(value => <option key={value} value={value}>{value}</option>)}
          </select>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden" role="group" aria-label="Filing period">
            {(["monthly", "quarterly"] as FilingCadence[]).map(value => (
              <button
                key={value}
                type="button"
                onClick={() => setCadence(value)}
                aria-pressed={cadence === value}
                className={`px-3 py-2 text-sm capitalize ${cadence === value ? "bg-gray-900 text-white" : "bg-white text-gray-700"}`}
              >
                {value}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => downloadFile(occupancyLedgerCsv(rows), `hostfi-occupancy-tax-${year}-${cadence}.csv`, "text/csv")}
            disabled={rows.length === 0}
            className="px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg disabled:opacity-40"
          >
            Export CSV
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        The rate is applied to gross bookings you recorded for stays in the period. HostFi does not have a separate taxable-rent amount, and a platform&apos;s own tax line can disagree with the town. Confirm the rate and what you owe with the jurisdiction or a tax professional before you file or pay.
      </p>

      {note && <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">{note}</p>}

      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Rates you enter</h2>
        {properties.length === 0 ? (
          <p className="text-sm text-gray-600">Add a property before entering a rate.</p>
        ) : (
          <div className="space-y-3">
            {properties.map(property => {
              const draft = rateDrafts[property.id] || { jurisdiction: "", rate: "" };
              return (
                <div key={property.id} className="grid sm:grid-cols-[1fr_1fr_8rem_auto] gap-2 items-end">
                  <p className="text-sm font-medium text-gray-900 sm:col-span-4">{property.name}</p>
                  <label className="text-xs text-gray-600 block">
                    Jurisdiction
                    <input
                      value={draft.jurisdiction}
                      onChange={e => setRateDrafts(prev => ({ ...prev, [property.id]: { ...draft, jurisdiction: e.target.value } }))}
                      className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                      placeholder="Name you use for this town or county"
                    />
                  </label>
                  <label className="text-xs text-gray-600 block">
                    Rate percent
                    <input
                      inputMode="decimal"
                      value={draft.rate}
                      onChange={e => setRateDrafts(prev => ({ ...prev, [property.id]: { ...draft, rate: e.target.value } }))}
                      className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                      placeholder="You enter this"
                    />
                  </label>
                  <button type="button" onClick={() => saveRate(property.id)} disabled={saving} className="px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg disabled:opacity-50">
                    Save rate
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {loading ? (
        <p className="text-sm text-gray-500">Loading your bookings…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-600 bg-white border border-gray-200 rounded-xl p-6">
          No stays for {year}. This page does not fill in sample tax or sample revenue.
        </p>
      ) : (
        <div className="space-y-4">
          {rows.map(row => {
            const key = `${row.propertyId}:${row.periodStart}`;
            const draft = moneyDrafts[key] || { collected: "", remittedPlatform: "", remittedHost: "" };
            return (
              <section key={key} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-lg font-semibold text-gray-900">{row.propertyName}</h2>
                  <p className="text-sm text-gray-600">{row.periodLabel}{row.jurisdiction ? ` · ${row.jurisdiction}` : ""}</p>
                </div>
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div><dt className="text-gray-500">Stays</dt><dd className="font-medium">{row.bookingCount}</dd></div>
                  <div><dt className="text-gray-500">Nights</dt><dd className="font-medium">{row.nights == null ? "—" : row.nights}</dd></div>
                  <div><dt className="text-gray-500">Gross bookings</dt><dd className="font-medium">{formatCurrency(row.grossBookings)}</dd></div>
                  <div><dt className="text-gray-500">Gross per night</dt><dd className="font-medium">{moneyText(row.grossPerNight)}</dd></div>
                  <div><dt className="text-gray-500">Your rate</dt><dd className="font-medium">{row.ratePercent == null ? "—" : `${row.ratePercent}%`}</dd></div>
                  <div><dt className="text-gray-500">Tax at your rate</dt><dd className="font-medium">{moneyText(row.taxAtRate)}</dd></div>
                  <div><dt className="text-gray-500">Host balance</dt><dd className="font-medium">{moneyText(row.hostBalance)}</dd></div>
                  <div><dt className="text-gray-500">Running balance</dt><dd className="font-medium">{moneyText(row.runningBalance)}</dd></div>
                </dl>
                <div className="grid sm:grid-cols-3 gap-3">
                  <label className="text-xs text-gray-600 block">
                    Tax collected by the platform
                    <input inputMode="decimal" value={draft.collected} onChange={e => setMoneyDrafts(prev => ({ ...prev, [key]: { ...draft, collected: e.target.value } }))} className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
                  </label>
                  <label className="text-xs text-gray-600 block">
                    Tax the platform remitted
                    <input inputMode="decimal" value={draft.remittedPlatform} onChange={e => setMoneyDrafts(prev => ({ ...prev, [key]: { ...draft, remittedPlatform: e.target.value } }))} className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
                  </label>
                  <label className="text-xs text-gray-600 block">
                    Tax you already remitted
                    <input inputMode="decimal" value={draft.remittedHost} onChange={e => setMoneyDrafts(prev => ({ ...prev, [key]: { ...draft, remittedHost: e.target.value } }))} className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
                  </label>
                </div>
                {row.notes.length > 0 && (
                  <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
                    {row.notes.map(item => <li key={item}>{item}</li>)}
                  </ul>
                )}
                <button type="button" onClick={() => saveRemittance(row.propertyId, row.periodStart)} disabled={saving} className="px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg disabled:opacity-50">
                  Save {row.periodLabel}
                </button>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
