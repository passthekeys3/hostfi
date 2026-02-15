"use client";

import dynamic from "next/dynamic";
import { UpgradeGate } from "@/components/upgrade-gate";

const BenchmarkingContent = dynamic(
  () => import("@/components/benchmarking-content"),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
      </div>
    ),
  }
);

export default function BenchmarkingPage() {
  return <UpgradeGate feature="benchmarking"><BenchmarkingContent /></UpgradeGate>;
}
