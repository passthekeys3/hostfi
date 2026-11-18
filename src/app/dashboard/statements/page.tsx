"use client";

import { useEffect, useMemo, useState } from "react";
import { ScrollText } from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { formatCurrency, plural } from "@/lib/utils";
import { downloadFile } from "@/lib/tax-export";
import { FEATURE_UNAVAILABLE } from "@/lib/user-messages";
import {
  buildOwnerStatements,
  ownerStatementCsv,
  ownerStatementHtml,
  type FeeBasis,
  type FlatCadence,
  type StatementTerms,
} from "@/lib/owner-statement";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

interface TermDraft {
  feePercent: string;
  feeFlat: string;
  feeBasis: FeeBasis;
  flatPer: FlatCadence;
}

function emptyDraft(): TermDraft {
  return { feePercent: "", feeFlat: "", feeBasis: "gross", flatPer: "period" };
}

export default function StatementsPage() {
  const { properties, revenue, expenses, loading } = useDashboardData();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState<number | "all">("all");
  const [terms, setTerms] = useState<StatementTerms[]>([]);
  const [drafts, setDrafts] = useState<Record<string, TermDraft>>({});
  const [note, setNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const years = useMemo(() => {
    const found = new Set<number>([new Date().getFullYear()]);
    for (const row of revenue) {
      const date = row.check_in || row.date;
      if (date) found.add(Number(date.slice(0, 4)));
    }
    for (const expense of expenses) {
      if (expense.date) found.add(Number(expense.date.slice(0, 4)));
    }
    return [...found].sort((a, b) => b - a);
  }, [revenue, expenses]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      if (!supabase) return;
      const { data, error } = await supabase
        .from("owner_statement_terms")
        .select("property_id, fee_percent, fee_flat, fee_basis, flat_per");
      if (cancelled) return;
      if (error) {
        console.error("owner_statement_terms is missing:", error);
        setNote(FEATURE_UNAVAILABLE);
        return;
      }
      const next = (data || []).map(row => ({
        propertyId: row.property_id as string,
        feePercent: Number(row.fee_percent) || 0,
        feeFlat: Number(row.fee_flat) || 0,
        feeBasis: (row.fee_basis === "after_platform_fees" ? "after_platform_fees" : "gross") as FeeBasis,
        flatPer: (row.flat_per === "booking" ? "booking" : "period") as FlatCadence,
      }));
      setTerms(next);
      setDrafts(Object.fromEntries(next.map(term => [term.propertyId, {
        feePercent: term.feePercent ? String(term.feePercent) : "",
        feeFlat: term.feeFlat ? String(term.feeFlat) : "",
        feeBasis: term.feeBasis,
        flatPer: term.flatPer,
      }])));
      setNote(null);
    })();
    return () => { cancelled = true; };
  }, []);

  const statements = useMemo(() => buildOwnerStatements(
    properties.map(property => ({
      id: property.id,
      name: property.name,
      propertyType: property.property_type,
    })),
    revenue.map(row => ({
      propertyId: row.property_id,
      date: row.date,
      checkIn: row.check_in,
      amount: row.amount || 0,
      platformFee: row.platform_fee,
      payoutAmount: row.payout_amount,
      notes: row.notes,
    })),
    expenses.map(expense => ({
      propertyId: expense.property_id,
      date: expense.date,
      amount: expense.amount,
      category: expense.category,
    })),
    terms,
    year,
    month
  ), [properties, revenue, expenses, terms, year, month]);

  const saveTerms = async (propertyId: string) => {
    const draft = drafts[propertyId] || emptyDraft();
    const feePercent = Number(draft.feePercent) || 0;
    const feeFlat = Number(draft.feeFlat) || 0;
    if (feePercent < 0 || feePercent > 100 || feeFlat < 0) {
      setNote("Use a percent from 0 to 100 and a flat fee that is not negative.");
      return;
    }
    setSaving(true);
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const user = supabase ? (await supabase.auth.getUser()).data.user : null;
    if (!supabase || !user) {
      setNote("Sign in to save a co-host fee.");
      setSaving(false);
      return;
    }
    const next: StatementTerms = {
      propertyId,
      feePercent,
      feeFlat,
      feeBasis: draft.feeBasis,
      flatPer: draft.flatPer,
    };
    const { error } = await supabase.from("owner_statement_terms").upsert({
      user_id: user.id,
      property_id: propertyId,
      fee_percent: feePercent,
      fee_flat: feeFlat,
      fee_basis: draft.feeBasis,
      flat_per: draft.flatPer,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,property_id" });
    if (error) {
      console.error("Could not save owner statement terms:", error);
      setNote(FEATURE_UNAVAILABLE);
    } else {
      setTerms(prev => [...prev.filter(term => term.propertyId !== propertyId), next]);
      setNote("Saved the co-host fee for this property.");
    }
    setSaving(false);
  };

  const printPdf = () => {
    const popup = window.open("", "_blank");
    if (!popup) {
      setNote("Allow pop-ups to print the statement.");
      return;
    }
    popup.document.write(ownerStatementHtml(statements));
    popup.document.close();
    popup.onload = () => popup.print();
  };

  const periodSlug = statements[0]?.periodLabel.toLowerCase().replace(/\s+/g, "-") || `${year}`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-700 mb-1">
            <ScrollText className="w-4 h-4" aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-widest">Statements</p>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Owner and co-host statements</h1>
          <p className="text-sm text-gray-600 mt-1 max-w-2xl">
            Gross bookings, platform fees, the co-host fee you set, expenses, and net to the owner. On an arbitrage property, rent paid is an expense on Schedule E line 19.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="stmt-year" className="text-sm text-gray-600">Year</label>
          <select id="stmt-year" value={year} onChange={e => setYear(Number(e.target.value))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg">
            {years.map(value => <option key={value} value={value}>{value}</option>)}
          </select>
          <label htmlFor="stmt-month" className="text-sm text-gray-600">Month</label>
          <select id="stmt-month" value={month} onChange={e => setMonth(e.target.value === "all" ? "all" : Number(e.target.value))} className="px-3 py-2 text-sm border border-gray-200 rounded-lg">
            <option value="all">All months</option>
            {MONTHS.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
          </select>
          <button type="button" onClick={() => downloadFile(ownerStatementCsv(statements), `hostfi-owner-statement-${periodSlug}.csv`, "text/csv")} disabled={statements.length === 0} className="px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg disabled:opacity-40">
            Export CSV
          </button>
          <button type="button" onClick={printPdf} disabled={statements.length === 0} className="px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg disabled:opacity-40">
            Print PDF
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        A flat fee is charged once for the period selected above. A full-year view does not multiply it by 12. This statement is not a payment and not a tax return.
      </p>
      {note && <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">{note}</p>}

      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Co-host or management fee</h2>
        {properties.length === 0 ? (
          <p className="text-sm text-gray-600">Add a property before setting a fee.</p>
        ) : properties.map(property => {
          const draft = drafts[property.id] || emptyDraft();
          const set = (patch: Partial<TermDraft>) => setDrafts(prev => ({ ...prev, [property.id]: { ...draft, ...patch } }));
          return (
            <div key={property.id} className="grid sm:grid-cols-5 gap-2 items-end border-t border-gray-100 pt-3">
              <p className="text-sm font-medium text-gray-900 sm:col-span-5">{property.name}{property.property_type === "arbitrage" ? " · arbitrage" : ""}</p>
              <label className="text-xs text-gray-600 block">Percent
                <input inputMode="decimal" value={draft.feePercent} onChange={e => set({ feePercent: e.target.value })} className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
              </label>
              <label className="text-xs text-gray-600 block">Flat amount
                <input inputMode="decimal" value={draft.feeFlat} onChange={e => set({ feeFlat: e.target.value })} className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
              </label>
              <label className="text-xs text-gray-600 block">Percent of
                <select value={draft.feeBasis} onChange={e => set({ feeBasis: e.target.value as FeeBasis })} className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                  <option value="gross">Gross bookings</option>
                  <option value="after_platform_fees">After platform fees</option>
                </select>
              </label>
              <label className="text-xs text-gray-600 block">Flat fee
                <select value={draft.flatPer} onChange={e => set({ flatPer: e.target.value as FlatCadence })} className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg">
                  <option value="period">Once per period</option>
                  <option value="booking">Per booking</option>
                </select>
              </label>
              <button type="button" onClick={() => saveTerms(property.id)} disabled={saving} className="px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg disabled:opacity-50">Save</button>
            </div>
          );
        })}
      </section>

      {loading ? (
        <p className="text-sm text-gray-500">Loading bookings and expenses…</p>
      ) : statements.length === 0 ? (
        <p className="text-sm text-gray-600 bg-white border border-gray-200 rounded-xl p-6">
          Nothing to statement for this period. This page does not fill in sample bookings.
        </p>
      ) : statements.map(row => (
        <section key={row.propertyId} className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold text-gray-900">{row.propertyName}</h2>
            <p className="text-sm text-gray-600">{row.periodLabel} · {plural(row.bookingCount, "booking")}</p>
          </div>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div><dt className="text-gray-500">Gross bookings</dt><dd className="font-medium">{formatCurrency(row.gross)}</dd></div>
            <div><dt className="text-gray-500">Platform fees</dt><dd className="font-medium">{formatCurrency(row.platformFees)}</dd></div>
            <div><dt className="text-gray-500">Co-host / management fee</dt><dd className="font-medium">{formatCurrency(row.managementFee)}</dd></div>
            <div><dt className="text-gray-500">Rent paid{row.rentPaid > 0 ? ` · Schedule E line ${row.rentScheduleELine}` : ""}</dt><dd className="font-medium">{formatCurrency(row.rentPaid)}</dd></div>
            <div><dt className="text-gray-500">Other expenses</dt><dd className="font-medium">{formatCurrency(row.otherExpenses)}</dd></div>
            <div><dt className="text-gray-500">Net to owner</dt><dd className="font-medium">{formatCurrency(row.netToOwner)}</dd></div>
          </dl>
          {row.recordedManagement > 0 && (
            <p className="text-sm text-gray-600">
              Management expenses already recorded: {formatCurrency(row.recordedManagement)}.
              {row.recordedManagementSubtracted ? " They are included in the net." : " They are not subtracted again."}
            </p>
          )}
          {row.notes.length > 0 && (
            <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
              {row.notes.map(item => <li key={item}>{item}</li>)}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
