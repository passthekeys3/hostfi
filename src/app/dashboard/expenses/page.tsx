"use client";

import { useState, useMemo, useCallback } from "react";
import { getCategoryConfig, EXPENSE_CATEGORY_CONFIG, getCategoryColorClasses, ALL_EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/expense-categories";
import { formatCurrency, formatDate, cn, getStatusColor } from "@/lib/utils";
import { Receipt, Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { useDashboardData } from "@/hooks/useDashboardData";
import { isDemoMode } from "@/lib/data/data-provider";

interface EditState {
  description: string;
  category: ExpenseCategory;
  amount: string;
  date: string;
  status: string;
  vendor: string;
  property_id: string;
}

export default function ExpensesPage() {
  const { properties, expenses, loading, refresh } = useDashboardData();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const demo = isDemoMode();

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
    if (!editState || !editingId || demo) return;
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
  }, [editState, editingId, demo, refresh]);

  const deleteExpense = useCallback(async () => {
    if (!editingId || demo) return;
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
  }, [editingId, demo, refresh]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (selectedCategory !== "all" && exp.category !== selectedCategory) return false;
      if (selectedProperty !== "all" && exp.property_id !== selectedProperty) return false;
      if (selectedStatus !== "all" && exp.status !== selectedStatus) return false;
      return true;
    });
  }, [expenses, selectedCategory, selectedProperty, selectedStatus]);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded-lg" />
        <div className="h-64 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

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

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm">
          <option value="all">All Categories</option>
          {ALL_EXPENSE_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{EXPENSE_CATEGORY_CONFIG[cat]?.label || cat}</option>
          ))}
        </select>
        <select value={selectedProperty} onChange={e => setSelectedProperty(e.target.value)} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm">
          <option value="all">All Properties</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm">
          <option value="all">All Statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {filteredExpenses.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No expenses yet</p>
          <Link href="/dashboard/expenses/new" className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-gray-900 text-white font-medium rounded-xl text-sm hover:bg-gray-800">
            <Plus className="w-4 h-4" /> Add Your First Expense
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-6 py-4 bg-gray-50/80">Expense</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-6 py-4 bg-gray-50/80">Property</th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-6 py-4 bg-gray-50/80">Amount</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-6 py-4 bg-gray-50/80">Date</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-6 py-4 bg-gray-50/80">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense, index) => {
                  const catConfig = getCategoryConfig(expense.category);
                  const colorClasses = getCategoryColorClasses(catConfig?.color || 'gray');
                  const property = properties.find(p => p.id === expense.property_id);

                  return (
                    <tr key={expense.id} onClick={() => openEdit(expense)} className={cn("group transition-colors duration-150 hover:bg-gray-50/60 cursor-pointer", index !== filteredExpenses.length - 1 && "border-b border-gray-100")}>
                      <td className="px-6 py-4">
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
                      <td className="px-6 py-4 text-sm text-muted-foreground">{property?.name || '—'}</td>
                      <td className="px-6 py-4 text-right font-semibold text-sm tabular-nums">{formatCurrency(expense.amount)}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{formatDate(expense.date)}</td>
                      <td className="px-6 py-4">
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
            {filteredExpenses.map((expense) => {
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
        </>
      )}

      {/* Edit Expense Modal */}
      {showEditModal && editState && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm" onClick={closeEdit}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto safe-area-bottom" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Edit Expense</h3>
              <button onClick={closeEdit} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
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
