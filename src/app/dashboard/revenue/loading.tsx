import { SkeletonHeader, SkeletonStatCard, SkeletonTable, SkeletonLine } from "@/components/skeleton";

export default function RevenueLoading() {
  return (
    <div className="space-y-6 pb-24 lg:pb-6">
      {/* Header */}
      <SkeletonHeader />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Property P&L Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <SkeletonLine width="w-48" height="h-5" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-100">
                {["Property", "Gross Revenue", "Net Payouts", "Expenses", "Profit"].map((_, i) => (
                  <th key={i} className="px-5 py-3">
                    <SkeletonLine width="w-20" height="h-3" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[1, 2, 3, 4].map((i) => (
                <tr key={i}>
                  <td className="px-5 py-3.5">
                    <SkeletonLine width="w-32" height="h-4" />
                    <SkeletonLine width="w-20" height="h-3" className="mt-1" />
                  </td>
                  {[1, 2, 3, 4].map((j) => (
                    <td key={j} className="px-5 py-3.5 text-right">
                      <SkeletonLine width="w-20" height="h-4" className="ml-auto" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revenue by Source */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <SkeletonLine width="w-40" height="h-5" className="mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-3 rounded-lg border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-200 animate-pulse" />
                <SkeletonLine width="w-16" height="h-3" />
              </div>
              <SkeletonLine width="w-20" height="h-6" />
              <SkeletonLine width="w-14" height="h-3" className="mt-1" />
            </div>
          ))}
        </div>
      </div>

      {/* Transactions Table */}
      <SkeletonTable rows={6} columns={5} />
    </div>
  );
}
