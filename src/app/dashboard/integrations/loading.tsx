import { SkeletonHeader, SkeletonLine } from "@/components/skeleton";

function SkeletonIntegrationCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-gray-200 animate-pulse rounded-xl shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <SkeletonLine width="w-32" height="h-5" />
            <div className="w-20 h-6 bg-gray-200 animate-pulse rounded-full" />
          </div>
          <SkeletonLine width="w-full" height="h-3" />
          <SkeletonLine width="w-2/3" height="h-3" className="mt-2" />
        </div>
      </div>
    </div>
  );
}

export default function IntegrationsLoading() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <SkeletonHeader />

      {/* Category sections */}
      {["Accounting", "Property Management", "Payments"].map((category) => (
        <div key={category} className="space-y-4">
          <SkeletonLine width="w-40" height="h-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SkeletonIntegrationCard />
            <SkeletonIntegrationCard />
            <SkeletonIntegrationCard />
          </div>
        </div>
      ))}
    </div>
  );
}
