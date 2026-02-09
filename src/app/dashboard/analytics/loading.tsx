import { SkeletonHeader, SkeletonStatCard, SkeletonChartCard, SkeletonTable } from "@/components/skeleton";

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6 sm:space-y-10">
      {/* Header */}
      <SkeletonHeader />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonChartCard />
        <SkeletonChartCard />
        <SkeletonChartCard />
        <SkeletonChartCard />
      </div>

      {/* Table */}
      <SkeletonTable rows={5} columns={5} />
    </div>
  );
}
