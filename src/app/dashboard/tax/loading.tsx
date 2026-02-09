import { SkeletonHeader, SkeletonLine, SkeletonCard } from "@/components/skeleton";

function SkeletonSummaryCard() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-gray-200 animate-pulse rounded-xl" />
        <SkeletonLine width="w-32" height="h-4" />
      </div>
      <SkeletonLine width="w-28" height="h-8" />
    </div>
  );
}

function SkeletonPropertyTaxCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 animate-pulse rounded-xl" />
            <div>
              <SkeletonLine width="w-40" height="h-5" />
              <SkeletonLine width="w-24" height="h-3" className="mt-1" />
            </div>
          </div>
          <div className="text-right">
            <SkeletonLine width="w-28" height="h-7" />
            <SkeletonLine width="w-24" height="h-3" className="mt-1" />
          </div>
        </div>
      </div>
      {/* Table */}
      <div className="divide-y divide-gray-50">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="px-4 py-3 flex items-center gap-4">
            <SkeletonLine width="w-10" height="h-4" />
            <SkeletonLine width="w-48" height="h-4" />
            <SkeletonLine width="w-20" height="h-4" className="ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TaxLoading() {
  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Header */}
      <SkeletonHeader />

      {/* Export Actions */}
      <div className="flex flex-wrap gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-11 w-44 bg-gray-200 animate-pulse rounded-xl" />
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SkeletonSummaryCard />
        <SkeletonSummaryCard />
        <SkeletonSummaryCard />
      </div>

      {/* Tax Insights */}
      <SkeletonCard className="p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gray-200 animate-pulse rounded-xl" />
          <SkeletonLine width="w-32" height="h-5" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border-l-4 border-gray-200 rounded-r-lg p-4 bg-gray-50">
              <SkeletonLine width="w-full" height="h-4" />
            </div>
          ))}
        </div>
      </SkeletonCard>

      {/* Schedule E by Property */}
      <div className="space-y-6">
        <SkeletonLine width="w-48" height="h-6" />
        <SkeletonPropertyTaxCard />
        <SkeletonPropertyTaxCard />
      </div>
    </div>
  );
}
