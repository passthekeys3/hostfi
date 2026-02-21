"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import type { RecurringExpense } from "@/lib/types";
import { getCategoryConfig, EXPENSE_CATEGORY_CONFIG, FREQUENCY_LABELS, getCategoryColorClasses, ALL_EXPENSE_CATEGORIES, type ExpenseCategory, type ExpenseFrequency } from "@/lib/expense-categories";
import { useDashboardData } from "@/hooks/useDashboardData";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { Plus, ArrowLeft, RefreshCw, X, Loader2 } from "lucide-react";

interface EditState {
  description: string;
  category: ExpenseCategory;
  amount: string;
  vendor: string;
  property_id: string;
  frequency: ExpenseFrequency;
  next_due_date: string;
  is_active: boolean;
}

export default function RecurringExpensesPage() {
  const { properties, loading, refresh } = useDashboardData();
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);

  // Fetch recurring expenses from Supabase
  useEffect(() => {
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        if (!supabase) return;
        const { data } = await supabase.from('recurring_expenses').select('*').order('created_at', { ascending: false }).limit(200);
        if (data) setRecurringExpenses(data as RecurringExpense[]);
      } catch (error) {
        console.error('Failed to fetch recurring expenses:', error);
      }
    })();
  }, []);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const activeExpenses = recurringExpenses.filter(e => e.is_active);
  const totalMonthly = activeExpenses.reduce((sum, e) => {
    switch (e.frequency) {
      case 'monthly': return sum + e.amount;
      case 'quarterly': return sum + e.amount / 3;
      case 'semi-annual': return sum + e.amount / 6;
      case 'annual': return sum + e.amount / 12;
      case 'weekly': return sum + e.amount * 4.33;
      default: return sum;
    }
  }, 0);

  const openEdit = (expense: RecurringExpense) => {
    setEditingId(expense.id);
    setEditState({
      description: expense.description || '',
      category: expense.category as ExpenseCategory,
      amount: expense.amount.toString(),
      vendor: expense.vendor || '',
      property_id: expense.property_id,
      frequency: expense.frequency as ExpenseFrequency,
      next_due_date: expense.next_due_date || '',
      is_active: expense.is_active,
    });
    setShowEditModal(true);
  };

  const closeEdit = () => {
    setShowEditModal(false);
    setEditingId(null);
    setEditState(null);
  };

  const saveEdit = useCallback(async () => {
    if (!editState || !editingId) {
      closeEdit();
      return;
    }
    setSaving(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      if (!supabase) {
        // Update local state if no supabase
        setRecurringExpenses(prev => prev.map(e => 
          e.id === editingId 
            ? {
                ...e,
                description: editState.description,
                category: editState.category,
                amount: parseFloat(editState.amount) || e.amount,
                vendor: editState.vendor,
                property_id: editState.property_id,
                frequency: editState.frequency,
                next_due_date: editState.next_due_date,
                is_active: editState.is_active,
              }
            : e
        ));
        closeEdit();
        return;
      }
      const { error } = await supabase.from('recurring_expenses').update({
        description: editState.description,
        category: editState.category,
        amount: parseFloat(editState.amount),
        vendor: editState.vendor,
        property_id: editState.property_id,
        frequency: editState.frequency,
        next_due_date: editState.next_due_date,
        is_active: editState.is_active,
      }).eq('id', editingId);
      if (error) throw error;
      // Update local state
      setRecurringExpenses(prev => prev.map(e => 
        e.id === editingId 
          ? {
              ...e,
              description: editState.description,
              category: editState.category,
              amount: parseFloat(editState.amount) || e.amount,
              vendor: editState.vendor,
              property_id: editState.property_id,
              frequency: editState.frequency,
              next_due_date: editState.next_due_date,
              is_active: editState.is_active,
            }
          : e
      ));
      closeEdit();
      if (refresh) refresh();
    } catch (err) {
      console.error('Failed to update recurring expense:', err);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [editState, editingId, refresh]);

  const deleteExpense = useCallback(async () => {
    if (!editingId) return;
    if (!confirm('Delete this recurring expense? This cannot be undone.')) return;
    
    setSaving(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      if (!supabase) {
        setRecurringExpenses(prev => prev.filter(e => e.id !== editingId));
        closeEdit();
        return;
      }
      const { error } = await supabase.from('recurring_expenses').delete().eq('id', editingId);
      if (error) throw error;
      setRecurringExpenses(prev => prev.filter(e => e.id !== editingId));
      closeEdit();
      if (refresh) refresh();
    } catch (err) {
      console.error('Failed to delete recurring expense:', err);
    } finally {
      setSaving(false);
    }
  }, [editingId, refresh]);

  const togglePause = useCallback(async () => {
    if (!editState || !editingId) return;
    const newIsActive = !editState.is_active;
    setEditState({ ...editState, is_active: newIsActive });
    setRecurringExpenses(prev => prev.map(e => 
      e.id === editingId ? { ...e, is_active: newIsActive } : e
    ));
    
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      if (supabase) {
        await supabase.from('recurring_expenses').update({ is_active: newIsActive }).eq('id', editingId);
        if (refresh) refresh();
      }
    } catch (err) {
      console.error('Failed to toggle pause:', err);
    }
  }, [editState, editingId, refresh]);

  if (loading) {
    return (
      <div className="space-y-10 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-gray-100 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          <Link href="/dashboard/expenses" className="p-2 hover:bg-gray-100 rounded-xl transition-colors duration-150 min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Recurring</h1>
            <p className="text-muted-foreground mt-1 sm:mt-2 text-sm leading-relaxed">
              {activeExpenses.length} active · ~{formatCurrency(totalMonthly)}/mo
            </p>
          </div>
        </div>
        <Link href="/dashboard/expenses/new" className="flex items-center gap-2 px-3 sm:px-5 py-2.5 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition-all duration-200 text-sm shadow-sm min-h-[44px] shrink-0">
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Recurring</span><span className="sm:hidden">Add</span>
        </Link>
      </div>

      {recurringExpenses.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <RefreshCw className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="font-medium text-gray-700">No recurring expenses yet</p>
          <p className="text-gray-500 text-sm mt-1">Set up recurring expenses to track monthly bills like utilities, insurance, and subscriptions.</p>
          <Link href="/dashboard/expenses/new" className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-teal-600 text-white font-medium rounded-xl text-sm hover:bg-teal-700 transition-colors">
            <Plus className="w-4 h-4" /> Add Recurring Expense
          </Link>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-5">
        {recurringExpenses.map((expense) => {
          const catConfig = getCategoryConfig(expense.category);
          const colors = getCategoryColorClasses(catConfig.color);
          const property = properties.find(p => p.id === expense.property_id);

          return (
            <div
              key={expense.id}
              onClick={() => openEdit(expense)}
              className={cn(
                "bg-white rounded-xl sm:rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-200/60 p-4 sm:p-6 flex gap-3 sm:gap-4 hover:shadow-md hover:translate-y-[-1px] transition-all duration-200 cursor-pointer",
                !expense.is_active && "opacity-50"
              )}
            >
              <span className={cn("flex items-center justify-center w-10 h-10 rounded-full shrink-0", colors.bg)}>
                <catConfig.icon className="w-5 h-5" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{expense.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{property?.name} · {expense.vendor}</p>
                  </div>
                  <p className="font-semibold text-sm whitespace-nowrap shrink-0">{formatCurrency(expense.amount)}</p>
                </div>
                <div className="flex items-center justify-between mt-3 gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="px-2 sm:px-2.5 py-0.5 rounded-full bg-gray-100 font-medium">{FREQUENCY_LABELS[expense.frequency]}</span>
                    <span className="hidden sm:inline">Next: {formatDate(expense.next_due_date)}</span>
                    {!expense.is_active && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Paused</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Edit Recurring Expense Modal */}
      {showEditModal && editState && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm" onClick={closeEdit}>
          <div role="dialog" aria-modal="true" className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto safe-area-bottom" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Edit Recurring Expense</h3>
              <button onClick={closeEdit} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Vendor</label>
                <input type="text" value={editState.vendor} onChange={e => setEditState({ ...editState, vendor: e.target.value })} placeholder="e.g. Spectrum, State Farm" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Description</label>
                <input type="text" value={editState.description} onChange={e => setEditState({ ...editState, description: e.target.value })} placeholder="What is this recurring expense?" className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:outline-none" />
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
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Frequency</label>
                  <select value={editState.frequency} onChange={e => setEditState({ ...editState, frequency: e.target.value as ExpenseFrequency })} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:outline-none bg-white">
                    {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Next Due Date</label>
                <input type="date" value={editState.next_due_date} onChange={e => setEditState({ ...editState, next_due_date: e.target.value })} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:outline-none" />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={togglePause}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                    editState.is_active
                      ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                      : "bg-teal-50 text-teal-700 hover:bg-teal-100"
                  )}
                >
                  {editState.is_active ? 'Pause Recurring' : 'Resume Recurring'}
                </button>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <button onClick={deleteExpense} disabled={saving} className="px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
                Delete
              </button>
              <div className="flex gap-2">
                <button onClick={closeEdit} className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                <button onClick={saveEdit} disabled={saving || !editState.amount || !editState.next_due_date} className="px-4 py-2.5 text-sm font-medium text-white bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 rounded-lg transition-colors flex items-center gap-2">
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
