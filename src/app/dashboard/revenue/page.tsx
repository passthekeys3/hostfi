"use client";

import { useState, useMemo, useCallback } from "react";
import { 
  DollarSign, TrendingUp, Calendar, Upload, Plus, Building2, 
  ArrowUpRight, ArrowDownRight, FileSpreadsheet, X, ChevronDown,
  Filter, Download, Check, Loader2, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DEMO_REVENUE, DEMO_PROPERTIES, DEMO_EXPENSES } from "@/lib/data";
import { isDemoMode } from "@/lib/data/data-provider";
import { useDashboardData } from "@/hooks/useDashboardData";
import { REVENUE_SOURCES, getRevenueByMonth, getRevenueBySource, type RevenueEntry, type RevenueSource } from "@/lib/demo-revenue";
import { parseRevenueCSV, SAMPLE_CSV } from "@/lib/revenue-csv-parser";
import { StatCard } from "@/components/stat-card";

type ModalView = null | 'add' | 'csv';

interface ImportApiResult {
  imported: number;
  skipped: number;
  duplicates: number;
}

export default function RevenuePage() {
  const demo = isDemoMode();
  const { properties: realProperties, expenses: realExpenses, revenue: dashRevenue, loading: dashLoading, refresh } = useDashboardData();
  const [revenue, setRevenue] = useState<RevenueEntry[]>(demo ? DEMO_REVENUE : []);
  const [realRevenue, setRealRevenue] = useState<RevenueEntry[]>([]);
  const [revenueLoaded, setRevenueLoaded] = useState(false);

  // Fetch real revenue from Supabase
  useState(() => {
    if (demo) return;
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        if (!supabase) return;
        const { data } = await supabase.from("revenue").select("*").order("check_in", { ascending: false });
        if (data) { setRealRevenue(data as RevenueEntry[]); setRevenue(data as RevenueEntry[]); }
      } catch {}
      setRevenueLoaded(true);
    })();
  });
  const [modal, setModal] = useState<ModalView>(null);
  const [filterProperty, setFilterProperty] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [csvText, setCsvText] = useState('');
  const [csvResult, setCsvResult] = useState<ReturnType<typeof parseRevenueCSV> | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportApiResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Manual add form
  const [form, setForm] = useState({
    property_id: '',
    source: 'airbnb' as RevenueSource,
    guest_name: '',
    amount: '',
    platform_fee: '',
    check_in: '',
    check_out: '',
    confirmation_code: '',
    payout_date: '',
  });

  const filtered = useMemo(() => {
    return revenue.filter(r => {
      if (filterProperty !== 'all' && r.property_id !== filterProperty) return false;
      if (filterSource !== 'all' && r.source !== filterSource) return false;
      return true;
    }).sort((a, b) => b.payout_date.localeCompare(a.payout_date));
  }, [revenue, filterProperty, filterSource]);

  // Stats
  const totalGross = useMemo(() => revenue.reduce((s, r) => s + r.amount, 0), [revenue]);
  const totalNet = useMemo(() => revenue.reduce((s, r) => s + r.payout_amount, 0), [revenue]);
  const totalFees = useMemo(() => revenue.reduce((s, r) => s + r.platform_fee, 0), [revenue]);
  const allExpenses = demo ? DEMO_EXPENSES : realExpenses;
  const allProperties = demo ? DEMO_PROPERTIES : realProperties;
  const totalExpenses = useMemo(() => allExpenses.reduce((s, e) => s + e.amount, 0), [allExpenses]);
  const netProfit = totalNet - totalExpenses;
  const totalBookings = revenue.length;

  // P&L per property
  const propertyPnL = useMemo(() => {
    return allProperties.map(prop => {
      const propRevenue = revenue.filter(r => r.property_id === prop.id);
      const propExpenses = allExpenses.filter(e => e.property_id === prop.id);
      const gross = propRevenue.reduce((s, r) => s + r.amount, 0);
      const net = propRevenue.reduce((s, r) => s + r.payout_amount, 0);
      const expenses = propExpenses.reduce((s, e) => s + e.amount, 0);
      return { property: prop, gross, net, expenses, profit: net - expenses, bookings: propRevenue.length };
    });
  }, [revenue]);

  const bySource = useMemo(() => getRevenueBySource(revenue), [revenue]);
  const byMonth = useMemo(() => getRevenueByMonth(revenue), [revenue]);

  const handleAddManual = useCallback(async () => {
    const amount = parseFloat(form.amount) || 0;
    const fee = parseFloat(form.platform_fee) || 0;
    const checkIn = form.check_in;
    const checkOut = form.check_out;
    const nights = Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000));

    const entry: RevenueEntry = {
      id: `manual-${Date.now()}`,
      user_id: 'demo',
      property_id: form.property_id,
      source: form.source,
      description: 'Manual entry',
      guest_name: form.guest_name || null,
      amount,
      payout_amount: amount - fee,
      platform_fee: fee,
      check_in: checkIn,
      check_out: checkOut,
      nights,
      payout_date: form.payout_date || checkOut,
      confirmation_code: form.confirmation_code || null,
      created_at: new Date().toISOString(),
      import_source: 'manual',
    };

    if (!demo) {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { error } = await supabase.from("revenue").insert({
              user_id: user.id,
              property_id: form.property_id,
              source: form.source,
              description: 'Manual entry',
              guest_name: form.guest_name || null,
              amount,
              payout_amount: amount - fee,
              platform_fee: fee,
              check_in: checkIn,
              check_out: checkOut,
              nights,
              payout_date: form.payout_date || checkOut,
              confirmation_code: form.confirmation_code || null,
              import_source: 'manual',
            });
            if (error) { console.error("Revenue insert error:", error.message); }
            else if (refresh) { refresh(); setModal(null); setForm({ property_id: '', source: 'airbnb', guest_name: '', amount: '', platform_fee: '', check_in: '', check_out: '', confirmation_code: '', payout_date: '' }); return; }
          }
        }
      } catch {}
    }

    setRevenue(prev => [...prev, entry]);
    setModal(null);
    setForm({ property_id: '', source: 'airbnb', guest_name: '', amount: '', platform_fee: '', check_in: '', check_out: '', confirmation_code: '', payout_date: '' });
  }, [form, demo]);

  const handleCSVParse = useCallback(() => {
    const result = parseRevenueCSV(csvText);
    setCsvResult(result);
  }, [csvText]);

  const handleCSVImport = useCallback(async () => {
    if (!csvResult) return;
    
    setIsImporting(true);
    setImportError(null);
    setImportResult(null);
    
    const validEntries = csvResult.entries.filter(e => e.property_id);
    
    try {
      const response = await fetch('/api/revenue/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          entries: validEntries,
          existingEntries: revenue.map(r => ({
            confirmation_code: r.confirmation_code,
            check_in: r.check_in,
            check_out: r.check_out,
            amount: r.amount,
            property_id: r.property_id,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      const result = await response.json();
      
      if (result.success) {
        // Add imported entries to local state
        setRevenue(prev => [...prev, ...result.entries]);
        setImportResult({
          imported: result.imported,
          skipped: result.skipped,
          duplicates: result.duplicates,
        });
      } else {
        throw new Error(result.error || 'Import failed');
      }
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'An error occurred during import');
    } finally {
      setIsImporting(false);
    }
  }, [csvResult, revenue]);

  const handleCSVFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCsvText(ev.target?.result as string || '');
      setCsvResult(null);
    };
    reader.readAsText(file);
  }, []);

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6 pb-24 lg:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Revenue</h1>
            <p className="text-sm text-gray-500">Track Income Across All Properties and Platforms</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModal('csv')} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Upload className="w-4 h-4" /> Import CSV
          </button>
          <button onClick={() => setModal('add')} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-teal-500 rounded-lg hover:bg-teal-600 transition-colors">
            <Plus className="w-4 h-4" /> Add Revenue
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard title="Gross Revenue" value={`$${fmt(totalGross)}`} accent="teal" icon={DollarSign} subtitle={`${totalBookings} bookings`} />
        <StatCard title="Net Payouts" value={`$${fmt(totalNet)}`} accent="blue" icon={TrendingUp} subtitle={`$${fmt(totalFees)} in fees`} />
        <StatCard title="Total Expenses" value={`$${fmt(totalExpenses)}`} accent="amber" icon={ArrowDownRight} subtitle="All properties" />
        <StatCard title="Net Profit" value={`$${fmt(netProfit)}`} accent={netProfit >= 0 ? 'teal' : 'rose'} icon={netProfit >= 0 ? ArrowUpRight : ArrowDownRight} subtitle={`${((netProfit / totalNet) * 100).toFixed(1)}% margin`} />
      </div>

      {/* Property P&L */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-400" /> Profit & Loss by Property
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th className="px-5 py-3">Property</th>
                <th className="px-5 py-3 text-right">Gross Revenue</th>
                <th className="px-5 py-3 text-right hidden sm:table-cell">Platform Fees</th>
                <th className="px-5 py-3 text-right">Net Payouts</th>
                <th className="px-5 py-3 text-right">Expenses</th>
                <th className="px-5 py-3 text-right">Profit</th>
                <th className="px-5 py-3 text-right hidden sm:table-cell">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {propertyPnL.map(row => {
                const margin = row.net > 0 ? ((row.profit / row.net) * 100) : 0;
                return (
                  <tr key={row.property.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-900">{row.property.name}</p>
                      <p className="text-xs text-gray-400">{row.bookings} bookings</p>
                    </td>
                    <td className="px-5 py-3.5 text-right text-gray-700">${fmt(row.gross)}</td>
                    <td className="px-5 py-3.5 text-right text-gray-400 hidden sm:table-cell">-${fmt(row.gross - row.net)}</td>
                    <td className="px-5 py-3.5 text-right text-gray-700">${fmt(row.net)}</td>
                    <td className="px-5 py-3.5 text-right text-gray-700">-${fmt(row.expenses)}</td>
                    <td className={cn("px-5 py-3.5 text-right font-semibold", row.profit >= 0 ? "text-teal-600" : "text-rose-600")}>
                      {row.profit >= 0 ? '' : '-'}${fmt(Math.abs(row.profit))}
                    </td>
                    <td className={cn("px-5 py-3.5 text-right hidden sm:table-cell", margin >= 0 ? "text-teal-600" : "text-rose-600")}>
                      {margin.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50/50 font-semibold text-sm">
                <td className="px-5 py-3">Total</td>
                <td className="px-5 py-3 text-right">${fmt(totalGross)}</td>
                <td className="px-5 py-3 text-right hidden sm:table-cell text-gray-400">-${fmt(totalFees)}</td>
                <td className="px-5 py-3 text-right">${fmt(totalNet)}</td>
                <td className="px-5 py-3 text-right">-${fmt(totalExpenses)}</td>
                <td className={cn("px-5 py-3 text-right", netProfit >= 0 ? "text-teal-600" : "text-rose-600")}>
                  {netProfit >= 0 ? '' : '-'}${fmt(Math.abs(netProfit))}
                </td>
                <td className={cn("px-5 py-3 text-right hidden sm:table-cell", netProfit >= 0 ? "text-teal-600" : "text-rose-600")}>
                  {((netProfit / totalNet) * 100).toFixed(1)}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Revenue by Source */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Revenue by Platform</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {REVENUE_SOURCES.map(src => {
            const amount = bySource[src.value] || 0;
            const pct = totalNet > 0 ? ((amount / totalNet) * 100) : 0;
            return (
              <div key={src.value} className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: src.color }} />
                  <span className="text-xs font-medium text-gray-600">{src.label}</span>
                </div>
                <p className="text-lg font-bold text-gray-900">${fmt(amount)}</p>
                <p className="text-xs text-gray-400">{pct.toFixed(1)}% of net</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Monthly Breakdown */}
      {Object.keys(byMonth).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Monthly Summary</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(byMonth).sort().reverse().map(([month, data]) => (
              <div key={month} className="p-4 rounded-lg border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                  <span className="text-xs text-gray-400">{data.bookings} bookings</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Gross</span>
                    <span className="font-medium text-gray-900">${fmt(data.gross)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Fees</span>
                    <span className="text-gray-400">-${fmt(data.fees)}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-1 border-t border-gray-50">
                    <span className="text-gray-500 font-medium">Net</span>
                    <span className="font-semibold text-teal-600">${fmt(data.net)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters + Transaction Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" /> All Transactions
          </h2>
          <div className="flex gap-2">
            <div className="relative">
              <select value={filterProperty} onChange={e => setFilterProperty(e.target.value)} className="appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 pr-8 text-xs font-medium text-gray-700 focus:ring-2 focus:ring-teal-500/20 focus:outline-none">
                <option value="all">All Properties</option>
                {allProperties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className="appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 pr-8 text-xs font-medium text-gray-700 focus:ring-2 focus:ring-teal-500/20 focus:outline-none">
                <option value="all">All Platforms</option>
                {REVENUE_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Property</th>
                <th className="px-5 py-3 hidden sm:table-cell">Guest</th>
                <th className="px-5 py-3">Platform</th>
                <th className="px-5 py-3 text-right hidden sm:table-cell">Nights</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3 text-right">Payout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(r => {
                const prop = allProperties.find(p => p.id === r.property_id);
                const src = REVENUE_SOURCES.find(s => s.value === r.source);
                return (
                  <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                      {new Date(r.payout_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900 truncate max-w-[150px]">{prop?.name || 'Unmatched'}</p>
                    </td>
                    <td className="px-5 py-3 text-gray-600 hidden sm:table-cell">{r.guest_name || '—'}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: src?.color || '#6B7280' }} />
                        {src?.label || r.source}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-600 hidden sm:table-cell">{r.nights}</td>
                    <td className="px-5 py-3 text-right text-gray-700">${fmt(r.amount)}</td>
                    <td className="px-5 py-3 text-right font-medium text-teal-600">${fmt(r.payout_amount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">No revenue entries match your filters.</div>
        )}
      </div>

      {/* Add Revenue Modal */}
      {modal === 'add' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto safe-area-bottom" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Add Revenue</h3>
              <button onClick={() => setModal(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Property</label>
                <select value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:outline-none bg-white">
                  <option value="">Select property...</option>
                  {allProperties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Platform</label>
                  <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value as RevenueSource }))} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:outline-none bg-white">
                    {REVENUE_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Guest Name</label>
                  <input type="text" value={form.guest_name} onChange={e => setForm(f => ({ ...f, guest_name: e.target.value }))} placeholder="Optional" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Total Amount</label>
                  <input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="$0.00" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Platform Fee</label>
                  <input type="number" step="0.01" value={form.platform_fee} onChange={e => setForm(f => ({ ...f, platform_fee: e.target.value }))} placeholder="$0.00" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Check-in</label>
                  <input type="date" value={form.check_in} onChange={e => setForm(f => ({ ...f, check_in: e.target.value }))} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Check-out</label>
                  <input type="date" value={form.check_out} onChange={e => setForm(f => ({ ...f, check_out: e.target.value }))} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Payout Date</label>
                  <input type="date" value={form.payout_date} onChange={e => setForm(f => ({ ...f, payout_date: e.target.value }))} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Confirmation Code</label>
                  <input type="text" value={form.confirmation_code} onChange={e => setForm(f => ({ ...f, confirmation_code: e.target.value }))} placeholder="Optional" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:outline-none" />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleAddManual} disabled={!form.property_id || !form.amount || !form.check_in || !form.check_out} className="px-4 py-2.5 text-sm font-medium text-white bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 rounded-lg transition-colors">Add Revenue</button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {modal === 'csv' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm" onClick={() => { if (!isImporting) { setModal(null); setCsvResult(null); setCsvText(''); setImportResult(null); setImportError(null); } }}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto safe-area-bottom" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-teal-500" /> Import CSV
              </h3>
              <button onClick={() => { if (!isImporting) { setModal(null); setCsvResult(null); setCsvText(''); setImportResult(null); setImportError(null); } }} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" disabled={isImporting}>
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Success state */}
              {importResult && (
                <div className="text-center py-6">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-teal-100 flex items-center justify-center">
                    <Check className="w-7 h-7 text-teal-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Import Complete!</h4>
                  <p className="text-gray-600 mb-1">
                    {importResult.imported} revenue {importResult.imported === 1 ? 'entry' : 'entries'} imported successfully
                  </p>
                  {(importResult.skipped > 0 || importResult.duplicates > 0) && (
                    <p className="text-sm text-gray-500">
                      {importResult.skipped > 0 && `${importResult.skipped} skipped`}
                      {importResult.skipped > 0 && importResult.duplicates > 0 && ' • '}
                      {importResult.duplicates > 0 && `${importResult.duplicates} duplicates`}
                    </p>
                  )}
                  <button
                    onClick={() => { setModal(null); setCsvResult(null); setCsvText(''); setImportResult(null); }}
                    className="mt-4 px-6 py-2.5 text-sm font-medium text-white bg-teal-500 hover:bg-teal-600 rounded-lg transition-colors"
                  >
                    Done
                  </button>
                </div>
              )}

              {/* Loading state */}
              {isImporting && !importResult && (
                <div className="text-center py-8">
                  <Loader2 className="w-10 h-10 text-teal-500 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Importing revenue entries...</p>
                </div>
              )}

              {/* Normal state */}
              {!isImporting && !importResult && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Upload CSV file or paste data</label>
                    <input type="file" accept=".csv" onChange={handleCSVFile} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 mb-3" />
                    <textarea
                      value={csvText}
                      onChange={e => { setCsvText(e.target.value); setCsvResult(null); setImportError(null); }}
                      placeholder="Or paste CSV data here..."
                      rows={6}
                      className="w-full px-3 py-2.5 text-xs font-mono border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:outline-none resize-none"
                    />
                  </div>

                  <button onClick={() => setCsvText(SAMPLE_CSV)} className="text-xs text-teal-600 hover:text-teal-700 font-medium">
                    Load sample Airbnb CSV
                  </button>

                  {importError && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {importError}
                    </div>
                  )}

                  {!csvResult && csvText && (
                    <button onClick={handleCSVParse} className="w-full py-2.5 text-sm font-medium text-white bg-teal-500 hover:bg-teal-600 rounded-lg transition-colors">
                      Parse CSV
                    </button>
                  )}

                  {csvResult && (
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-sm">
                        <p className="font-medium text-gray-900">Detected: {REVENUE_SOURCES.find(s => s.value === csvResult.platform)?.label || csvResult.platform}</p>
                        <p className="text-gray-600">{csvResult.entries.length} entries found</p>
                        {csvResult.unmatchedCount > 0 && (
                          <p className="text-amber-600 mt-1">{csvResult.unmatchedCount} entries could not be matched to a property (will be skipped)</p>
                        )}
                        {csvResult.errors.length > 0 && (
                          <div className="mt-2 text-rose-600">{csvResult.errors.map((e, i) => <p key={i}>{e}</p>)}</div>
                        )}
                      </div>

                      {csvResult.entries.length > 0 && (
                        <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-50 sticky top-0">
                              <tr>
                                <th className="px-3 py-2 text-left text-gray-500">Status</th>
                                <th className="px-3 py-2 text-left text-gray-500">Guest</th>
                                <th className="px-3 py-2 text-left text-gray-500">Property</th>
                                <th className="px-3 py-2 text-right text-gray-500">Amount</th>
                                <th className="px-3 py-2 text-right text-gray-500">Payout</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {csvResult.entries.map((e, i) => {
                                const prop = allProperties.find(p => p.id === e.property_id);
                                return (
                                  <tr key={i} className={!e.property_id ? 'opacity-40' : ''}>
                                    <td className="px-3 py-2">
                                      {e.property_id ? (
                                        <span className="inline-flex items-center gap-1 text-green-600">
                                          <Check className="w-3 h-3" />
                                          <span>Ready</span>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-amber-600">
                                          <AlertCircle className="w-3 h-3" />
                                          <span>Skip</span>
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-gray-700">{e.guest_name || '—'}</td>
                                    <td className="px-3 py-2 text-gray-700">{prop?.name || 'No match'}</td>
                                    <td className="px-3 py-2 text-right">${fmt(e.amount || 0)}</td>
                                    <td className="px-3 py-2 text-right text-teal-600">${fmt(e.payout_amount || 0)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <button
                        onClick={handleCSVImport}
                        disabled={csvResult.entries.filter(e => e.property_id).length === 0}
                        className="w-full py-2.5 text-sm font-medium text-white bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        Confirm Import ({csvResult.entries.filter(e => e.property_id).length} Entries)
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
