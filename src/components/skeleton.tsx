import { cn } from "@/lib/utils";

interface SkeletonLineProps {
  width?: string;
  height?: string;
  className?: string;
}

export function SkeletonLine({ width = "w-full", height = "h-4", className }: SkeletonLineProps) {
  return (
    <div className={cn("bg-gray-200 animate-pulse rounded-md", width, height, className)} />
  );
}

interface SkeletonCardProps {
  className?: string;
  children?: React.ReactNode;
}

export function SkeletonCard({ className, children }: SkeletonCardProps) {
  return (
    <div className={cn(
      "bg-white rounded-xl border border-gray-200 shadow-sm p-6",
      className
    )}>
      {children || (
        <div className="space-y-3">
          <SkeletonLine width="w-1/3" height="h-4" />
          <SkeletonLine width="w-full" height="h-3" />
          <SkeletonLine width="w-2/3" height="h-3" />
        </div>
      )}
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 border-t-[3px] border-t-gray-300 shadow-sm p-5 sm:p-6">
      <div className="flex items-start justify-between mb-4">
        <SkeletonLine width="w-24" height="h-3" />
        <div className="w-10 h-10 rounded-lg bg-gray-200 animate-pulse" />
      </div>
      <SkeletonLine width="w-32" height="h-8" />
      <SkeletonLine width="w-20" height="h-3" className="mt-2" />
    </div>
  );
}

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function SkeletonTable({ rows = 5, columns = 4, className }: SkeletonTableProps) {
  return (
    <div className={cn(
      "bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden",
      className
    )}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/80">
        <div className="flex items-center gap-6">
          {Array.from({ length: columns }).map((_, i) => (
            <SkeletonLine key={i} width={i === 0 ? "w-32" : "w-20"} height="h-3" />
          ))}
        </div>
      </div>
      {/* Rows */}
      <div className="divide-y divide-gray-50">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="px-6 py-4">
            <div className="flex items-center gap-6">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <SkeletonLine 
                  key={colIndex} 
                  width={colIndex === 0 ? "w-40" : colIndex === columns - 1 ? "w-16" : "w-24"} 
                  height="h-4" 
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonHeader() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <SkeletonLine width="w-48" height="h-8" />
        <SkeletonLine width="w-64" height="h-4" className="mt-2" />
      </div>
      <div className="flex gap-3">
        <div className="w-32 h-10 bg-gray-200 animate-pulse rounded-xl" />
      </div>
    </div>
  );
}

export function SkeletonChartCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <SkeletonLine width="w-40" height="h-5" className="mb-6" />
      <div className="h-[300px] bg-gray-100 animate-pulse rounded-lg" />
    </div>
  );
}
