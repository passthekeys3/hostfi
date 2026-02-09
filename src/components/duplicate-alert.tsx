"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getDemoDuplicates, type DuplicateGroup } from "@/lib/duplicate-detection";
import { DEMO_PROPERTIES } from "@/lib/data";

interface DuplicateAlertProps {
  className?: string;
}

export function DuplicateAlert({ className }: DuplicateAlertProps) {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [resolvedGroups, setResolvedGroups] = useState<Set<string>>(new Set());

  const allDuplicates = getDemoDuplicates();
  const duplicates = allDuplicates.filter(g => !resolvedGroups.has(g.id));

  if (dismissed || duplicates.length === 0) {
    return null;
  }

  const totalDuplicates = duplicates.reduce((sum, g) => sum + g.expenses.length, 0);

  const handleKeepBoth = (groupId: string) => {
    setResolvedGroups(prev => new Set([...prev, groupId]));
  };

  const handleRemoveDuplicate = (groupId: string) => {
    setResolvedGroups(prev => new Set([...prev, groupId]));
  };

  return (
    <div
      className={cn(
        "bg-amber-50/80 border border-amber-200/60 rounded-2xl overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="w-4.5 h-4.5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-amber-900">
              We found {totalDuplicates} potential duplicate expenses
            </p>
            <p className="text-xs text-amber-700/80 mt-0.5">
              {duplicates.length} group{duplicates.length !== 1 ? 's' : ''} need review
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-100 hover:bg-amber-200/80 text-amber-800 font-medium text-sm rounded-xl transition-colors"
          >
            {expanded ? 'Hide' : 'Review'}
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-2 hover:bg-amber-100 rounded-lg transition-colors text-amber-600"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-amber-200/60 px-5 py-4 space-y-4">
          {duplicates.map((group) => (
            <div
              key={group.id}
              className="bg-white rounded-xl border border-amber-100 overflow-hidden"
            >
              {/* Group header */}
              <div className="px-4 py-3 bg-gray-50 border-b border-amber-100/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide",
                      group.confidence === 'high'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    )}
                  >
                    {group.confidence} confidence
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {group.reason}
                  </span>
                </div>
              </div>

              {/* Side by side expenses */}
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-amber-100">
                {group.expenses.map((expense, idx) => {
                  const property = DEMO_PROPERTIES.find(p => p.id === expense.property_id);
                  return (
                    <div key={expense.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium">{expense.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {property?.name} · {formatDate(expense.date)}
                          </p>
                          {expense.vendor && (
                            <p className="text-xs text-muted-foreground">
                              Vendor: {expense.vendor}
                            </p>
                          )}
                        </div>
                        <p className="font-semibold text-sm tabular-nums">
                          {formatCurrency(expense.amount)}
                        </p>
                      </div>
                      {idx === 0 && (
                        <div className="mt-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                          Original
                        </div>
                      )}
                      {idx === 1 && (
                        <div className="mt-3 text-[10px] font-medium text-amber-600 uppercase tracking-wide">
                          Possible duplicate
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="px-4 py-3 bg-gray-50 border-t border-amber-100/60 flex justify-end gap-2">
                <button
                  onClick={() => handleKeepBoth(group.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-white rounded-lg border border-gray-200 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  Keep Both
                </button>
                <button
                  onClick={() => handleRemoveDuplicate(group.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-lg transition-colors hover:bg-gray-800"
                >
                  <X className="w-3.5 h-3.5" />
                  Remove Duplicate
                </button>
              </div>
            </div>
          ))}

          <p className="text-xs text-amber-700/70 text-center pt-2">
            Demo mode: changes won&apos;t be saved
          </p>
        </div>
      )}
    </div>
  );
}
