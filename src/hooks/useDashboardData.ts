"use client";

import { useState, useEffect, useCallback } from "react";
import type { Property, Expense, RecurringExpense, RevenueEntry } from "@/lib/data/data-provider";
import type { Alert } from "@/lib/alerts";
import type { AnomalyResult } from "@/lib/anomaly-detection";

interface DashboardData {
  properties: Property[];
  expenses: Expense[];
  anomalies: AnomalyResult[];
  alerts: Alert[];
  revenue: RevenueEntry[];
  recurringExpenses: RecurringExpense[];
  loading: boolean;
  refresh?: () => void;
}

/**
 * Generate real-time alerts from expense data
 */
function generateAlertsFromExpenses(
  expenses: Expense[],
  properties: Property[],
  recurringExpenses: RecurringExpense[]
): Alert[] {
  const alerts: Alert[] = [];
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  for (const expense of expenses) {
    if (!expense.due_date) continue;
    const property = properties.find(p => p.id === expense.property_id);
    const propertyName = property?.name || 'Unknown Property';
    const dueDate = expense.due_date;

    // Overdue: due_date < today AND status is pending
    if (dueDate < today && expense.status === 'pending') {
      const daysOverdue = Math.floor((now.getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24));
      alerts.push({
        id: `overdue-${expense.id}`,
        type: 'overdue',
        title: `${expense.vendor || expense.description || 'Bill'} is overdue`,
        description: `This bill at ${propertyName} was due ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} ago.`,
        severity: daysOverdue > 7 ? 'critical' : 'warning',
        read: false,
        created_at: expense.due_date,
        property_id: expense.property_id,
        bill_id: expense.id,
      });
    }
    // Due soon: due_date within 7 days AND status is pending
    else if (dueDate >= today && dueDate <= sevenDaysFromNow && expense.status === 'pending') {
      const daysUntilDue = Math.ceil((new Date(dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      alerts.push({
        id: `due_soon-${expense.id}`,
        type: 'due_soon',
        title: `${expense.vendor || expense.description || 'Bill'} due ${daysUntilDue === 0 ? 'today' : `in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`}`,
        description: `$${expense.amount.toFixed(2)} due at ${propertyName} on ${dueDate}.`,
        severity: daysUntilDue <= 1 ? 'warning' : 'info',
        read: false,
        created_at: new Date().toISOString(),
        property_id: expense.property_id,
        bill_id: expense.id,
      });
    }
  }

  // Generate missing_bill alerts from recurring expenses
  // Check if a recurring expense is overdue based on its next_due date
  for (const recurring of recurringExpenses) {
    if (!recurring.next_due) continue;
    
    const property = properties.find(p => p.id === recurring.property_id);
    const propertyName = property?.name || 'Unknown Property';
    const nextDueDate = new Date(recurring.next_due);
    
    // Add a grace period of 3 days
    const gracePeriod = 3 * 24 * 60 * 60 * 1000;
    const overdueThreshold = new Date(nextDueDate.getTime() + gracePeriod);
    
    // If we're past the next_due date + grace period, check if there's a recent matching expense
    if (now > overdueThreshold) {
      // Look for expenses after the next_due date for this category + property
      const hasRecentExpense = expenses.some(
        e => e.property_id === recurring.property_id && 
             e.category === recurring.category &&
             new Date(e.date) >= nextDueDate
      );
      
      // If no matching expense found, generate missing_bill alert
      if (!hasRecentExpense) {
        const daysMissing = Math.floor((now.getTime() - nextDueDate.getTime()) / (1000 * 60 * 60 * 24));
        alerts.push({
          id: `missing_bill-${recurring.id}`,
          type: 'missing_bill',
          title: `Missing ${recurring.vendor || recurring.description || recurring.category} bill`,
          description: `Expected ${recurring.frequency} bill at ${propertyName} is ${daysMissing} day${daysMissing === 1 ? '' : 's'} overdue.`,
          severity: daysMissing > 14 ? 'warning' : 'info',
          read: false,
          created_at: recurring.next_due,
          property_id: recurring.property_id,
        });
      }
    }
  }

  // Sort by severity (critical > warning > info)
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

export function useDashboardData(): DashboardData {
  const [refreshKey, setRefreshKey] = useState(0);
  const [data, setData] = useState<DashboardData>({
    properties: [],
    expenses: [],
    anomalies: [],
    alerts: [],
    revenue: [],
    recurringExpenses: [],
    loading: true,
  });

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    async function fetchData() {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        if (!supabase) {
          setData(prev => ({ ...prev, loading: false, refresh }));
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setData(prev => ({ ...prev, loading: false, refresh }));
          return;
        }

        const [propertiesRes, expensesRes, revenueRes, recurringRes, anomalyRes, parsedEmailsRes] = await Promise.all([
          supabase.from("properties").select("*").order("created_at", { ascending: false }),
          supabase.from("expenses").select("*").order("date", { ascending: false }),
          supabase.from("revenue").select("*").order("date", { ascending: false }),
          supabase.from("recurring_expenses").select("*").order("created_at", { ascending: false }),
          supabase.from("anomaly_logs").select("*").order("created_at", { ascending: false }),
          supabase.from("parsed_emails").select("*").eq("status", "ready").order("received_at", { ascending: false }).limit(10),
        ]);

        const properties = (propertiesRes.data as Property[]) || [];
        const expenses = (expensesRes.data as Expense[]) || [];

        // Transform anomaly_logs to AnomalyResult format
        const anomalies: AnomalyResult[] = (anomalyRes.data || []).map((log: {
          id: string;
          expense_id: string | null;
          property_id: string | null;
          anomaly_type: string;
          severity: string;
          utility_type: string | null;
          current_amount: number | null;
          expected_amount: number | null;
          deviation_percent: number | null;
          message: string;
          recommendation: string | null;
          seasonal_context: string | null;
          status: string;
          created_at: string;
        }) => {
          // Find property name
          const property = properties.find((p: Property) => p.id === log.property_id);
          return {
            id: log.id,
            bill_id: log.expense_id || '',
            property_name: property?.name || 'Unknown Property',
            utility_type: log.utility_type || 'other',
            anomaly_type: log.anomaly_type as AnomalyResult['anomaly_type'],
            severity: log.severity as AnomalyResult['severity'],
            current_amount: log.current_amount || 0,
            expected_amount: log.expected_amount || 0,
            deviation_percent: log.deviation_percent || 0,
            message: log.message,
            recommendation: log.recommendation || '',
            seasonal_context: log.seasonal_context || undefined,
            detected_at: log.created_at,
            status: log.status as AnomalyResult['status'],
          };
        });

        const recurringExpenses = (recurringRes.data as RecurringExpense[]) || [];
        
        // Generate real-time alerts from expense due dates and recurring expenses
        const alerts = generateAlertsFromExpenses(expenses, properties, recurringExpenses);
        
        // Generate new_parsed alerts from unprocessed parsed emails
        const parsedEmails = parsedEmailsRes.data || [];
        for (const parsed of parsedEmails) {
          alerts.push({
            id: `new_parsed-${parsed.id}`,
            type: 'new_parsed',
            title: `New bill from ${parsed.vendor_name || 'Unknown'}`,
            description: `$${(parsed.amount || 0).toFixed(2)} parsed from email. Review and approve in your Inbox.`,
            severity: 'info',
            read: false,
            created_at: parsed.received_at || parsed.created_at,
          });
        }

        setData({
          properties,
          expenses,
          anomalies,
          alerts,
          revenue: (revenueRes.data as RevenueEntry[]) || [],
          recurringExpenses,
          loading: false,
          refresh,
        });
      } catch (err) {
        console.error("Dashboard data fetch error:", err);
        setData(prev => ({ ...prev, loading: false, refresh }));
      }
    }

    fetchData();
  }, [refreshKey, refresh]);

  return data;
}
