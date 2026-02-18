"use client";

import { useState, useEffect, useCallback } from "react";
import { isDemoMode } from "@/lib/data/data-provider";
import {
  DEMO_PROPERTIES,
  DEMO_EXPENSES,
  DEMO_ANOMALIES,
  DEMO_ALERTS,
  DEMO_REVENUE,
  DEMO_ANALYTICS_DATA,
  DEMO_RECURRING_EXPENSES,
  type Property,
  type DemoExpense,
  type RecurringExpense,
  type RevenueEntry,
  type Alert,
} from "@/lib/data/demo-data";
import type { AnomalyResult } from "@/lib/anomaly-detection";

interface DashboardData {
  properties: Property[];
  expenses: DemoExpense[];
  anomalies: AnomalyResult[];
  alerts: Alert[];
  revenue: RevenueEntry[];
  recurringExpenses: RecurringExpense[];
  isDemo: boolean;
  loading: boolean;
  refresh?: () => void;
}

export function useDashboardData(): DashboardData {
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [data, setData] = useState<DashboardData>({
    properties: [],
    expenses: [],
    anomalies: [],
    alerts: [],
    revenue: [],
    recurringExpenses: [],
    isDemo: false,
    loading: true,
  });

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    const demo = isDemoMode();

    if (demo) {
      setData({
        properties: DEMO_PROPERTIES,
        expenses: DEMO_EXPENSES,
        anomalies: DEMO_ANOMALIES,
        alerts: DEMO_ALERTS,
        revenue: DEMO_REVENUE,
        recurringExpenses: DEMO_RECURRING_EXPENSES,
        isDemo: true,
        loading: false,
        refresh,
      });
      return;
    }

    // Real mode — fetch from Supabase
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

        const [propertiesRes, expensesRes, revenueRes, recurringRes, anomalyRes] = await Promise.all([
          supabase.from("properties").select("*").order("created_at", { ascending: false }),
          supabase.from("expenses").select("*").order("date", { ascending: false }),
          supabase.from("revenue").select("*").order("date", { ascending: false }),
          supabase.from("recurring_expenses").select("*").order("created_at", { ascending: false }),
          supabase.from("anomaly_logs").select("*").order("created_at", { ascending: false }),
        ]);

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
          const property = (propertiesRes.data || []).find((p: Property) => p.id === log.property_id);
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

        setData({
          properties: (propertiesRes.data as Property[]) || [],
          expenses: (expensesRes.data as DemoExpense[]) || [],
          anomalies,
          alerts: [],
          revenue: (revenueRes.data as RevenueEntry[]) || [],
          recurringExpenses: (recurringRes.data as RecurringExpense[]) || [],
          isDemo: false,
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
