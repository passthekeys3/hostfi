"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { getCategoryConfig, EXPENSE_CATEGORY_CONFIG, getCategoryColorClasses, ALL_EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/expense-categories";
import { formatCurrency, formatDate, cn, getStatusColor } from "@/lib/utils";
import { Receipt, Plus, X, Loader2, Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useDashboardData } from "@/hooks/useDashboardData";

interface EditState {
  description: string;
  category: ExpenseCategory;
  amount: string;
  date: string;
  status: string;
  vendor: string;
  property_id: string;
}

type SortColumn = 'date' | 'amount' | 'category' | 'vendor';
type SortDirection = 'asc' | 'desc';

const ITEMS_PER_PAGE = 25;

export default function ExpensesPage() {
  const { properties, expenses, loading, refresh } = useDashboardData();
  
  // All state declarations BEFORE any early returns
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<SortColumn>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 when filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedProperty, selectedStatus, sortColumn, sortDirection]);

  const openEdit = (expense: typeof expenses[0]) => {
    setEditingId(expense.id);
    setEditState({
      description: expense.description || '',
      category: expense.category as ExpenseCategory,
      amount: expense.amount.toString(),
      date: expense.date,
      status: expense.status,
      vendor: expense.vendor || '',
      property_id: expense.property_id,
    });
    setShowEditModal(true);
  };

  const closeEdit = () => {
    setShowEditModal(false);
    setEditingId(null);
    setEditState(null);
  };

  const saveEdit = useCallback(async () => {
    if (!editState || !editingId) return;
    setSaving(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      if (!supabase) return;
      const { error } = await supabase
        .from('expenses')
        .update({
          description: editState.description,
          category: editState.category,
          amount: parseFloat(editState.amount),
          date: editState.date,
          status: editState.status,
          vendor: editState.vendor,
          property_id: editState.property_id,
        })
        .eq('id', editingId);
      if (error) throw error;
      closeEdit();
      if (refresh) refresh();
    } catch (err) {
      console.error('Failed to update expense:', err);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [editState, editingId, refresh]);

  const deleteExpense = useCallback(async () => {
    if (!editingId) return;
    if (!confirm('Delete this expense? This cannot be undone.')) return;
    setSaving(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      if (!supabase) return;
      const { error } = await supabase.from('expenses').delete().eq('id', editingId);
      if (error) throw error;
      closeEdit();
      if (refresh) refresh();
    } catch (err) {
      console.error('Failed to delete expense:', err);
    } finally {
      setSaving(false);
    }
  }, [editingId, refresh]);

  // Handle column sort click
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection(column === 'date' ? 'desc' : 'asc');
    }
  };

  // Filter, search, sort, and paginate expenses
  const { paginatedExpenses, totalFilteredCount, totalPages } = useMemo(() => {
    // Step 1: Apply filters
    let result = expenses.filter((exp) => {
      if (selectedCategory !== "all" && exp.category !== selectedCategory) return false;
      if (selectedProperty !== "all" && exp.property_id !== selectedProperty) return false;
      if (selectedStatus !== "all" && exp.status !== selectedStatus) return false;
      return true;
    });

    // Step 2: Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((exp) => {
        const vendor = (exp.vendor || '').toLowerCase();
        const description = (exp.description || '').toLowerCase();
        const notes = (exp.notes || '').toLowerCase();
        return vendor.includes(query) || description.includes(query) || notes.includes(query);
      });
    }

    // Step 3: Apply sorting
    result = [...result].sort((a, b) => {
      let comparison = 0;
      
      switch (sortColumn) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'category':
          comparison = (a.category || '').localeCompare(b.category || '');
          break;
        case 'vendor':
          comparison = (a.vendor || a.description || '').localeCompare(b.vendor || b.description || '');
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    const totalFilteredCount = result.length;
    const totalPages = Math.ceil(totalFilteredCount / ITEMS_PER_PAGE);
    
    // Step 4: Apply pagination
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedExpenses = result.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return { paginatedExpenses, totalFilteredCount, totalPages };
  }, [expenses, selectedCategory, selectedProperty, selectedStatus, searchQuery, sortColumn, sortDirection, currentPage]);

  // Sort indicator component
  const SortIndicator = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' 
      ? <ChevronUp className="w-3 h-3 inline-block ml-1" />
      : <ChevronDown className="w-3 h-3 inline-block ml-1" />;
  };

  // Sortable header component
  const SortableHeader = ({ column, children, align = 'left' }: { column: SortColumn; children: React.ReactNode; align?: 'left' | 'right' }) => (
    <th 
      onClick={() => handleSort(column)}
      className={cn(
        "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3 bg-gray-50/80 cursor-pointer hover:bg-gray-100/80 transition-colors select-none",
        align === 'right' ? 'text-right' : 'text-left'
      )}
    >
      {children}
      <SortIndicator column={column} />
    </th>
  );

  // Pagination range calculation
  const getPaginationRange = () => {
    const range: (number | 'ellipsis')[] = [];
    
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) range.push(i);
    } else {
      range.push(1);
      
      if (currentPage > 3) range.push('ellipsis');
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) range.push(i);
      
      if (currentPage < totalPages - 2) range.push('ellipsis');
      
      range.push(totalPages);
    }
    
    return range;
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded-lg" />
        <div className="h-64 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  const startItem = totalFilteredCount > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalFilteredCount);

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-gray-500 mt-1 sm:mt-2 text-sm leading-relaxed">
            <span className="tabular-nums">{expenses.length}</span> total expenses
          </p>
        </div>
        <Link
          href="/dashboard/expenses/new"
          className="flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-gray-900 text-white font-medium rounded-xl text-sm min-h-[44px] transition-colors hover:bg-gray-800 shrink-0"
        >
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Expense</span><span className="sm:hidden">Add</span>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search vendor, description, notes..."
            className="w-full pl-9 pr-9 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm w-full sm:w-auto">
          <option value="all">All Categories</option>
          {ALL_EXPENSE_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{EXPENSE_CATEGORY_CONFIG[cat]?.label || cat}</option>
          ))}
        </select>
        <select value={selectedProperty} onChange={e => setSelectedProperty(e.target.value)} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm w-full sm:w-auto">
          <option value="all">All Properties</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm w-full sm:w-auto">
          <option value="all">All Statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {totalFilteredCount === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {searchQuery || selectedCategory !== 'all' || selectedProperty !== 'all' || selectedStatus !== 'all'
              ? "No expenses match your filters"
              : "No expenses yet"
            }
          </p>
          {!searchQuery && selectedCategory === 'all' && selectedProperty === 'all' && selectedStatus === 'all' && (
            <Link href="/dashboard/expenses/new" className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-gray-900 text-white font-medium rounded-xl text-sm hover:bg-gray-800">
              <Plus className="w-4 h-4" /> Add Your First Expense
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <SortableHeader column="vendor">Expense</SortableHeader>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3 bg-gray-50/80">Property</th>
                  <SortableHeader column="amount" align="right">Amount</SortableHeader>
                  <SortableHeader column="date">Date</SortableHeader>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3 bg-gray-50/80">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedExpenses.map((expense, index) => {
                  const catConfig = getCategoryConfig(expense.category);
                  const colorClasses = getCategoryColorClasses(catConfig?.color || 'gray');
                  const property = properties.find(p => p.id === expense.property_id);

                  return (
                    <tr key={expense.id} onClick={() => openEdit(expense)} className={cn("group transition-colors duration-150 hover:bg-gray-50/60 cursor-pointer", index !== paginatedExpenses.length - 1 && "border-b border-gray-100")}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className={cn("flex items-center justify-center w-9 h-9 rounded-xl text-sm border", colorClasses.bg, colorClasses.border)}>
                            {catConfig?.icon && <catConfig.icon className="w-4 h-4" />}
                          </span>
                          <div>
                            <p className="font-medium text-sm">{expense.vendor || expense.description}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{catConfig?.label || expense.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-muted-foreground">{property?.name || '—'}</td>
                      <td className="px-5 py-3 text-right font-semibold text-sm tabular-nums">{formatCurrency(expense.amount)}</td>
                      <td className="px-5 py-3 text-sm text-muted-foreground">{formatDate(expense.date)}</td>
                      <td className="px-5 py-3">
                        <span className={cn("inline-flex items-center text-[11px] font-medium px-2.5 py-1 rounded-full capitalize", getStatusColor(expense.status))}>{expense.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {paginatedExpenses.map((expense) => {
              const catConfig = getCategoryConfig(expense.category);
              const colorClasses = getCategoryColorClasses(catConfig?.color || 'gray');
              const property = properties.find(p => p.id === expense.property_id);

              return (
                <div key={expense.id} onClick={() => openEdit(expense)} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm cursor-pointer hover:bg-gray-50/60 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={cn("flex items-center justify-center w-10 h-10 rounded-xl text-sm border shrink-0", colorClasses.bg, colorClasses.border)}>
                      {catConfig?.icon && <catConfig.icon className="w-4 h-4" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{expense.vendor || expense.description}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{property?.name} · {formatDate(expense.date)}</p>
                    </div>
                    <div className="text-right shrink-0 pl-2">
                      <p className="font-semibold text-sm tabular-nums">{formatCurrency(expense.amount)}</p>
                      <span className={cn("inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full capitalize mt-1", getStatusColor(expense.status))}>{expense.status}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
              <p className="text-sm text-gray-500">
                Showing <span className="font-medium tabular-nums">{startItem}</span>-<span className="font-medium tabular-nums">{endItem}</span> of <span className="font-medium tabular-nums">{totalFilteredCount}</span> expenses
              </p>
              
              <div className="flex items-center gap-1">
                {/* Previous button */}
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2.5 sm:p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                {/* Page numbers */}
                {totalPages > 3 && (
                  <div className="hidden sm:flex items-center gap-1">
                    {getPaginationRange().map((page, index) => (
                      page === 'ellipsis' ? (
                        <span key={`ellipsis-${index}`} className="px-2 text-gray-400">…</span>
                      ) : (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            "min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium transition-colors",
                            currentPage === page
                              ? "bg-gray-900 text-white"
                              : "text-gray-600 hover:bg-gray-100"
                          )}
                        >
                          {page}
                        </button>
                      )
                    ))}
                  </div>
                )}
                
                {/* Mobile page indicator */}
                <span className="sm:hidden px-3 text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                
                {/* Next button */}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2.5 sm:p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit Expense Modal */}
      {showEditModal && editState && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm" onClick={closeEdit}>
          <div role="dialog" aria-modal="true" className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto safe-area-bottom" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Edit Expense</h3>
              <button onClick={closeEdit} className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Vendor</label>
                <input type="text" value={editState.vendor} onChange={e => setEditState({ ...editState, vendor: e.target.value })} placeholder="e.g. Spectrum, Home Depot" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Description</label>
                <input type="text" value={editState.description} onChange={e => setEditState({ ...editState, description: e.target.value })} placeholder="What was this expense for?" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Category</label>
                  <select value={editState.category} onChange={e => setEditState({ ...editState, category: e.target.value as ExpenseCategory })} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:outline-none bg-white">
                    {ALL_EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{EXPENSE_CATEGORY_CONFIG[cat]?.label || cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Property</label>
                  <select value={editState.property_id} onChange={e => setEditState({ ...editState, property_id: e.target.value })} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:outline-none bg-white">
                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Amount</label>
                  <input type="number" step="0.01" value={editState.amount} onChange={e => setEditState({ ...editState, amount: e.target.value })} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Date</label>
                  <input type="date" value={editState.date} onChange={e => setEditState({ ...editState, date: e.target.value })} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Status</label>
                <select value={editState.status} onChange={e => setEditState({ ...editState, status: e.target.value })} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:outline-none bg-white">
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <button onClick={deleteExpense} disabled={saving} className="px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
                Delete
              </button>
              <div className="flex gap-2">
                <button onClick={closeEdit} className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                <button onClick={saveEdit} disabled={saving || !editState.amount || !editState.date} className="px-4 py-2.5 text-sm font-medium text-white bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 rounded-lg transition-colors flex items-center gap-2">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
