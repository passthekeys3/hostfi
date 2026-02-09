import { SkeletonHeader, SkeletonLine, SkeletonTable } from "@/components/skeleton";

function SkeletonExpenseCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-200 animate-pulse rounded-xl shrink-0" />
        <div className="flex-1 min-w-0">
          <SkeletonLine width="w-40" height="h-4" />
          <SkeletonLine width="w-28" height="h-3" className="mt-1" />
        </div>
        <div className="text-right shrink-0 pl-2">
          <SkeletonLine width="w-20" height="h-5" className="ml-auto" />
          <div className="flex items-center gap-1.5 justify-end mt-1">
            <SkeletonLine width="w-16" height="h-3" />
            <div className="w-12 h-5 bg-gray-200 animate-pulse rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ExpensesLoading() {
  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Header */}
      <SkeletonHeader />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="w-full sm:w-40 h-11 bg-gray-200 animate-pulse rounded-xl" />
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block">
        <SkeletonTable rows={8} columns={6} />
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <SkeletonExpenseCard key={i} />
        ))}
      </div>
    </div>
  );
}
