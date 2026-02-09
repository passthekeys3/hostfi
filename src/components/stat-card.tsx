import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  accent?: "teal" | "blue" | "amber" | "rose";
}

const accentStyles = {
  teal: {
    border: "border-t-teal-500",
    iconBg: "bg-teal-500",
    iconText: "text-white",
  },
  blue: {
    border: "border-t-blue-500",
    iconBg: "bg-blue-500",
    iconText: "text-white",
  },
  amber: {
    border: "border-t-amber-500",
    iconBg: "bg-amber-500",
    iconText: "text-white",
  },
  rose: {
    border: "border-t-rose-500",
    iconBg: "bg-rose-500",
    iconText: "text-white",
  },
};

export function StatCard({ title, value, subtitle, icon: Icon, trend, accent = "teal" }: StatCardProps) {
  const a = accentStyles[accent];
  
  return (
    <div className={cn(
      "bg-white rounded-xl border border-gray-200/60 border-t-[3px] p-5 sm:p-6",
      "shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)]",
      "transition-all duration-200 hover:-translate-y-0.5",
      a.border,
    )}>
      <div className="flex items-start justify-between mb-4">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{title}</p>
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", a.iconBg)}>
          <Icon className={cn("w-5 h-5", a.iconText)} />
        </div>
      </div>
      
      <p className="text-xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-gray-900 truncate" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </p>
      
      {subtitle && (
        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
      )}
      
      {trend && (
        <div className="mt-3">
          <span className={cn(
            "inline-flex items-center gap-1.5 text-sm font-semibold px-2.5 py-1 rounded-full",
            trend.positive
              ? "bg-emerald-100 text-emerald-700"
              : "bg-rose-100 text-rose-700"
          )}>
            {trend.positive ? "↑" : "↓"} {trend.value}
          </span>
        </div>
      )}
    </div>
  );
}
