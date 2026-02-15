"use client";

import Link from "next/link";
import { ANOMALY_TYPE_CONFIG, SEVERITY_CONFIG } from "@/lib/anomaly-detection";
import { cn } from "@/lib/utils";
import { ArrowRight, Search } from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";

export function AnomalySummary() {
  const { anomalies } = useDashboardData();
  const active = anomalies.filter(a => a.status === 'new').slice(0, 3);

  if (active.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-200/60 p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-violet-500/10 rounded-full flex items-center justify-center">
            <Search className="w-4 h-4 text-violet-600" />
          </div>
          <h2 className="text-base font-semibold uppercase tracking-wide text-muted-foreground">AI-Detected Anomalies</h2>
        </div>
        <Link href="/dashboard/alerts?filter=anomalies" className="flex items-center gap-1 text-xs text-accent hover:underline">
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-3">
        {active.map(anomaly => {
          const typeConfig = ANOMALY_TYPE_CONFIG[anomaly.anomaly_type];
          const sevConfig = SEVERITY_CONFIG[anomaly.severity];

          return (
            <div key={anomaly.id} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-150">
              <typeConfig.icon className="w-4 h-4 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground leading-snug">{anomaly.message}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", sevConfig.bgColor, sevConfig.color)}>
                    {sevConfig.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{anomaly.property_name}</span>
                  <span className="text-[10px] text-orange-600 font-medium">+{anomaly.deviation_percent}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
