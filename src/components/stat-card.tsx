import Link from "next/link";
import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  accent?: "teal" | "blue" | "amber" | "rose";
  href?: string;
}

const accentStyles = {
  teal: {
    border: "border-t-teal-400",
    iconBg: "bg-teal-50",
    iconText: "text-teal-600",
  },
  blue: {
    border: "border-t-blue-400",
    iconBg: "bg-blue-50",
    iconText: "text-blue-600",
  },
  amber: {
    border: "border-t-amber-400",
    iconBg: "bg-amber-50",
    iconText: "text-amber-600",
  },
  rose: {
    border: "border-t-rose-400",
    iconBg: "bg-rose-50",
    iconText: "text-rose-600",
  },
};

export function StatCard({ title, value, subtitle, icon: Icon, trend, accent = "teal", href }: StatCardProps) {
  const a = accentStyles[accent];
  
  const content = (
    <div className={cn(
      "bg-white rounded-xl border border-gray-200/60 border-t-2 p-5 sm:p-6",
      "shadow-sm hover:shadow-md",
      "transition-all duration-200 hover:-translate-y-0.5",
      "h-full",
      href && "cursor-pointer",
      a.border,
    )}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-[11px] font-medium uppercase tracking-widest text-gray-400">{title}</p>
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", a.iconBg)}>
          <Icon className={cn("w-4 h-4", a.iconText)} />
        </div>
      </div>
      
      <p className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 truncate" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </p>
      
      {subtitle && (
        <p className="text-xs text-gray-400 mt-1.5">{subtitle}</p>
      )}
      
      {trend && (
        <div className="mt-2.5">
          <span className={cn(
            "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap",
            trend.positive
              ? "bg-emerald-50 text-emerald-600"
              : "bg-rose-50 text-rose-600"
          )}>
            {trend.positive ? "↑" : "↓"} {trend.value}
          </span>
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
