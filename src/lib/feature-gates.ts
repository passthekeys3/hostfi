// Feature gating by plan tier

import type { ExpenseCategory } from '@/lib/expense-categories';

export type Plan = 'free' | 'pro' | 'business';

export interface FeatureConfig {
  requiredPlan: Plan;
  label: string; // shown in upgrade prompt
}

export const FEATURES: Record<string, FeatureConfig> = {
  'ask-ai':           { requiredPlan: 'pro', label: 'Ask AI' },
  'tax-prep':         { requiredPlan: 'pro', label: 'Tax Prep' },
  'reports':          { requiredPlan: 'pro', label: 'Reports' },
  'receipt-scanning':  { requiredPlan: 'pro', label: 'Unlimited Receipt Scanning' },
  'integrations':     { requiredPlan: 'pro', label: 'Integrations' },
  'anomaly-full':     { requiredPlan: 'pro', label: 'Advanced Anomaly Detection' },
  'pnl-pdf':          { requiredPlan: 'pro', label: 'P&L PDF Export' },
  'benchmarking':     { requiredPlan: 'business', label: 'Benchmarking' },
  'slack':            { requiredPlan: 'business', label: 'Slack Two-Way Sync' },
};

export const PLAN_HIERARCHY: Record<Plan, number> = {
  free: 0,
  pro: 1,
  business: 2,
};

export const PLAN_LABELS: Record<Plan, string> = {
  free: 'Free',
  pro: 'Pro',
  business: 'Business',
};

export const PROPERTY_LIMITS: Record<Plan, number> = {
  free: 3,
  pro: 10,
  business: 25,
};

export const RECEIPT_LIMITS: Record<Plan, number> = {
  free: 3,
  pro: Infinity,
  business: Infinity,
};

// Categories that are typically recurring for STR operators
export const RECURRING_CATEGORIES: ExpenseCategory[] = [
  'rent',
  'mortgage',
  'insurance',
  'utility',
  'subscription',
  'management',
  'cleaning',
];

export function hasAccess(userPlan: Plan, requiredPlan: Plan): boolean {
  return PLAN_HIERARCHY[userPlan] >= PLAN_HIERARCHY[requiredPlan];
}

export function canAccessFeature(userPlan: Plan, featureKey: string): boolean {
  const feature = FEATURES[featureKey];
  if (!feature) return true; // unknown feature = allow
  return hasAccess(userPlan, feature.requiredPlan);
}

export function getUpgradePlan(featureKey: string): Plan {
  return FEATURES[featureKey]?.requiredPlan || 'pro';
}
