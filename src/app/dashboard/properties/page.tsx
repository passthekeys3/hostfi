"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { PropertyCard } from "@/components/property-card";
import { Plus, Building2, Search, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";

const TYPE_LABELS: Record<string, string> = {
  str: 'Short-Term Rental',
  ltr: 'Long-Term Rental',
  primary: 'Primary Residence',
  arbitrage: 'Arbitrage',
};

const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Name A–Z' },
  { value: 'name-desc', label: 'Name Z–A' },
  { value: 'revenue-desc', label: 'Revenue (High → Low)' },
  { value: 'revenue-asc', label: 'Revenue (Low → High)' },
  { value: 'spend-desc', label: 'Spend (High → Low)' },
  { value: 'spend-asc', label: 'Spend (Low → High)' },
  { value: 'profit-desc', label: 'Profit (High → Low)' },
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
] as const;

export default function PropertiesPage() {
  const { properties, expenses, revenue, loading } = useDashboardData();
  const [cmStr, setCmStr] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name-asc');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const n = new Date();
    setCmStr(`${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`);
  }, []);

  // Pre-compute monthly figures for each property
  const propertyMetrics = useMemo(() => {
    const map = new Map<string, { spend: number; rev: number; expenseCount: number }>();
    for (const p of properties) {
      const pExpenses = expenses.filter(e => e.property_id === p.id);
      const spend = pExpenses.filter(e => cmStr ? e.date?.startsWith(cmStr) : false).reduce((s, e) => s + e.amount, 0);
      const pRevenue = revenue.filter(r => r.property_id === p.id);
      const rev = pRevenue.filter(r => cmStr ? r.date?.startsWith(cmStr) : false).reduce((s, r) => s + (r.payout_amount ?? r.amount ?? 0), 0);
      map.set(p.id, { spend, rev, expenseCount: pExpenses.length });
    }
    return map;
  }, [properties, expenses, revenue, cmStr]);

  // Filter + sort
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let result = properties.filter(p => {
      if (q && !p.name.toLowerCase().includes(q) && !p.address_line1?.toLowerCase().includes(q) && !p.city?.toLowerCase().includes(q) && !p.state?.toLowerCase().includes(q)) return false;
      if (typeFilter !== 'all' && p.property_type !== typeFilter) return false;
      if (statusFilter !== 'all' && (p.status ?? 'active') !== statusFilter) return false;
      return true;
    });

    result.sort((a, b) => {
      const mA = propertyMetrics.get(a.id) ?? { spend: 0, rev: 0 };
      const mB = propertyMetrics.get(b.id) ?? { spend: 0, rev: 0 };
      switch (sortBy) {
        case 'name-asc': return a.name.localeCompare(b.name);
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'revenue-desc': return mB.rev - mA.rev;
        case 'revenue-asc': return mA.rev - mB.rev;
        case 'spend-desc': return mB.spend - mA.spend;
        case 'spend-asc': return mA.spend - mB.spend;
        case 'profit-desc': return (mB.rev - mB.spend) - (mA.rev - mA.spend);
        case 'newest': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default: return 0;
      }
    });
    return result;
  }, [properties, search, typeFilter, statusFilter, sortBy, propertyMetrics]);

  // Unique types present in data (for filter options)
  const activeTypes = useMemo(() => [...new Set(properties.map(p => p.property_type))], [properties]);
  const hasFilters = search || typeFilter !== 'all' || statusFilter !== 'all';

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-36 bg-gray-200 rounded-lg" />
            <div className="h-4 w-40 bg-gray-100 rounded mt-2" />
          </div>
          <div className="h-11 w-36 bg-gray-200 rounded-xl" />
        </div>
        {/* Search bar */}
        <div className="h-11 bg-gray-100 rounded-xl" />
        {/* Property cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-xl" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-32 bg-gray-200 rounded" />
                  <div className="h-3 w-48 bg-gray-100 rounded" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="h-14 bg-gray-50 rounded-lg" />
                <div className="h-14 bg-gray-50 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Properties</h1>
          <p className="text-gray-500 mt-1.5 sm:mt-2 text-sm leading-relaxed">
            <span className="tabular-nums">{properties.length}</span> {properties.length === 1 ? 'property' : 'properties'} managed
            {hasFilters && filtered.length !== properties.length && (
              <span className="text-gray-400"> · {filtered.length} shown</span>
            )}
          </p>
        </div>
        <Link 
          href="/dashboard/properties/new" 
          className="flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-gray-900 text-white font-medium rounded-xl text-sm min-h-[44px] transition-colors hover:bg-gray-800 shrink-0"
        >
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Property</span><span className="sm:hidden">Add</span>
        </Link>
      </div>

      {/* Search + Filter Bar */}
      {properties.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, address, city..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 min-h-[44px]"
              />
            </div>

            {/* Sort */}
            <div className="relative">
              <ArrowUpDown className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="pl-10 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 min-h-[44px] min-w-[180px]"
              >
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm min-h-[44px] transition-colors ${
                showFilters || hasFilters
                  ? 'bg-teal-50 border-teal-200 text-teal-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
              {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />}
            </button>
          </div>

          {/* Filter chips */}
          {showFilters && (
            <div className="flex flex-wrap gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
              {/* Type filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Type</label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setTypeFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      typeFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >All</button>
                  {activeTypes.map(t => (
                    <button
                      key={t}
                      onClick={() => setTypeFilter(typeFilter === t ? 'all' : t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        typeFilter === t ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >{TYPE_LABELS[t] || t}</button>
                  ))}
                </div>
              </div>

              {/* Status filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</label>
                <div className="flex gap-1.5">
                  {['all', 'active', 'inactive'].map(s => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                        statusFilter === s ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >{s}</button>
                  ))}
                </div>
              </div>

              {/* Clear */}
              {hasFilters && (
                <button
                  onClick={() => { setSearch(''); setTypeFilter('all'); setStatusFilter('all'); }}
                  className="self-end px-3 py-1.5 text-xs font-medium text-teal-600 hover:text-teal-800 transition-colors"
                >Clear all</button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Property Grid */}
      {properties.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No properties yet</p>
          <Link href="/dashboard/properties/new" className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-gray-900 text-white font-medium rounded-xl text-sm hover:bg-gray-800">
            <Plus className="w-4 h-4" /> Add Your First Property
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-900 font-medium text-sm">No properties match your filters</p>
          <p className="text-gray-500 text-xs mt-1">Try adjusting your search or filters</p>
          <button
            onClick={() => { setSearch(''); setTypeFilter('all'); setStatusFilter('all'); }}
            className="mt-4 px-4 py-2 text-sm font-medium text-teal-600 hover:text-teal-800 transition-colors"
          >Clear all filters</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {filtered.map((property) => {
            const m = propertyMetrics.get(property.id) ?? { spend: 0, rev: 0, expenseCount: 0 };
            return (
              <PropertyCard
                key={property.id}
                property={property}
                monthlySpend={m.spend}
                monthlyRevenue={m.rev}
                billCount={m.expenseCount}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
