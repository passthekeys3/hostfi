"use client";

import { useState, useEffect } from "react";
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
}

export function useDashboardData(): DashboardData {
  const [loading, setLoading] = useState(true);
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
      });
      return;
    }

    // Real mode — fetch from Supabase
    async function fetchData() {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        if (!supabase) {
          setData(prev => ({ ...prev, loading: false }));
          return;
        }

        const [
          { data: properties },
          { data: expenses },
          { data: revenue },
        ] = await Promise.all([
          supabase.from("properties").select("*").order("created_at", { ascending: false }),
          supabase.from("expenses").select("*").order("date", { ascending: false }),
          supabase.from("revenue").select("*").order("date", { ascending: false }),
        ]);

        setData({
          properties: (properties as Property[]) || [],
          expenses: (expenses as DemoExpense[]) || [],
          anomalies: [],
          alerts: [],
          revenue: (revenue as RevenueEntry[]) || [],
          recurringExpenses: [],
          isDemo: false,
          loading: false,
        });
      } catch {
        setData(prev => ({ ...prev, loading: false }));
      }
    }

    fetchData();
  }, []);

  return data;
}
