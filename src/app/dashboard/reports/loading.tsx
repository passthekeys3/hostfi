import { SkeletonHeader, SkeletonLine, SkeletonCard } from "@/components/skeleton";

export default function ReportsLoading() {
  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Header */}
      <SkeletonHeader />

      {/* Summary Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gray-200 animate-pulse rounded-xl" />
          <div>
            <SkeletonLine width="w-40" height="h-5" />
            <SkeletonLine width="w-28" height="h-3" className="mt-1" />
          </div>
        </div>

        {/* Total Spend */}
        <div className="mb-8">
          <SkeletonLine width="w-48" height="h-12" />
          <SkeletonLine width="w-32" height="h-4" className="mt-2" />
        </div>

        {/* Per-Property Breakdown */}
        <div className="border-t border-gray-100 pt-6 space-y-4">
          <SkeletonLine width="w-32" height="h-4" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gray-200 animate-pulse rounded-lg" />
                <div>
                  <SkeletonLine width="w-36" height="h-4" />
                  <SkeletonLine width="w-24" height="h-3" className="mt-1" />
                </div>
              </div>
              <div className="text-right">
                <SkeletonLine width="w-20" height="h-5" />
                <SkeletonLine width="w-16" height="h-3" className="mt-1" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights Section */}
      <SkeletonCard className="p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gray-200 animate-pulse rounded-xl" />
          <SkeletonLine width="w-32" height="h-5" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border-l-4 border-gray-200 rounded-r-lg p-4 bg-gray-50">
              <SkeletonLine width="w-full" height="h-4" />
              <SkeletonLine width="w-3/4" height="h-4" className="mt-2" />
            </div>
          ))}
        </div>
      </SkeletonCard>
    </div>
  );
}
