import { SkeletonHeader, SkeletonLine } from "@/components/skeleton";

function SkeletonPropertyCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Image placeholder */}
      <div className="h-40 bg-gray-200 animate-pulse" />
      {/* Content */}
      <div className="p-5">
        <SkeletonLine width="w-3/4" height="h-5" />
        <SkeletonLine width="w-full" height="h-3" className="mt-2" />
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 bg-gray-200 animate-pulse rounded" />
            <SkeletonLine width="w-6" height="h-4" />
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 bg-gray-200 animate-pulse rounded" />
            <SkeletonLine width="w-6" height="h-4" />
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 bg-gray-200 animate-pulse rounded" />
            <SkeletonLine width="w-12" height="h-4" />
          </div>
        </div>
        <div className="border-t border-gray-100 mt-4 pt-4 flex items-center justify-between">
          <div>
            <SkeletonLine width="w-20" height="h-3" />
            <SkeletonLine width="w-24" height="h-5" className="mt-1" />
          </div>
          <div className="w-20 h-8 bg-gray-200 animate-pulse rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export default function PropertiesLoading() {
  return (
    <div className="space-y-10">
      {/* Header */}
      <SkeletonHeader />

      {/* Property Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
        <SkeletonPropertyCard />
        <SkeletonPropertyCard />
        <SkeletonPropertyCard />
        <SkeletonPropertyCard />
        <SkeletonPropertyCard />
        <SkeletonPropertyCard />
      </div>
    </div>
  );
}
