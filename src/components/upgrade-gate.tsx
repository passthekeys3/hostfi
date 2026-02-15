"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { type Plan, FEATURES, PLAN_LABELS, canAccessFeature } from "@/lib/feature-gates";
import { usePlan } from "@/hooks/usePlan";

interface UpgradeGateProps {
  feature: string;
  children: React.ReactNode;
}

export function UpgradeGate({ feature, children }: UpgradeGateProps) {
  const { plan, loading } = usePlan();

  if (loading) return <>{children}</>;
  if (canAccessFeature(plan, feature)) return <>{children}</>;

  const config = FEATURES[feature];
  const requiredLabel = PLAN_LABELS[config?.requiredPlan || 'pro'];

  return (
    <div className="relative">
      {/* Blurred content */}
      <div className="pointer-events-none select-none blur-[3px] opacity-60">
        {children}
      </div>

      {/* Upgrade overlay */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-8 max-w-sm mx-4 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-5 h-5 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Upgrade to {requiredLabel}
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            {config?.label || 'This feature'} is available on the {requiredLabel} plan and above.
          </p>
          <Link
            href="/dashboard/billing"
            className="inline-flex items-center justify-center px-6 py-3 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors"
          >
            View Plans
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Small lock badge for sidebar nav items */
export function FeatureLockBadge({ feature, plan }: { feature: string; plan: Plan }) {
  if (canAccessFeature(plan, feature)) return null;
  return <Lock className="w-3 h-3 text-gray-300 ml-auto" />;
}
