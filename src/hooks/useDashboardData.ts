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

        const [propertiesRes, expensesRes, revenueRes, recurringRes] = await Promise.all([
          supabase.from("properties").select("*").order("created_at", { ascending: false }),
          supabase.from("expenses").select("*").order("date", { ascending: false }),
          supabase.from("revenue").select("*").order("date", { ascending: false }),
          supabase.from("recurring_expenses").select("*").order("created_at", { ascending: false }),
        ]);

        setData({
          properties: (propertiesRes.data as Property[]) || [],
          expenses: (expensesRes.data as DemoExpense[]) || [],
          anomalies: [],
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
