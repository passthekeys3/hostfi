import Stripe from 'stripe';

// Server-side Stripe instance
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey && process.env.NODE_ENV === 'production') {
  console.error('STRIPE_SECRET_KEY not configured — payments will not work');
}

export const stripe = new Stripe(stripeKey || 'sk_test_placeholder_not_configured', {
  apiVersion: '2026-01-28.clover',
});

// Plan configuration
export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    priceId: null,
    annualPriceId: null,
    properties: 5,
    askAiQueries: 10,
    aiCategorizations: 50,
    receiptScans: 10,
    emailParses: 5,
    features: [
      'Up to 5 properties',
      'AI categorization (50/mo)',
      'Ask AI (10 queries/mo)',
      'Revenue tracking (CSV)',
      'Basic analytics',
      'Bill pay — CC only',
    ],
  },
  pro: {
    name: 'Pro',
    price: 15,
    annualPrice: 12,
    priceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_pro_monthly',
    annualPriceId: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || 'price_pro_annual',
    properties: 25,
    askAiQueries: -1, // unlimited
    aiCategorizations: -1,
    receiptScans: -1,
    emailParses: -1,
    features: [
      'Up to 25 properties',
      'Unlimited AI features',
      'AI monthly summaries',
      'Anomaly detection',
      'Schedule E tax export',
      'Free ACH bill pay',
      'Unlimited receipt scanning',
    ],
  },
  business: {
    name: 'Business',
    price: 49,
    annualPrice: 39,
    priceId: process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID || 'price_business_monthly',
    annualPriceId: process.env.STRIPE_BUSINESS_ANNUAL_PRICE_ID || 'price_business_annual',
    properties: -1, // unlimited
    askAiQueries: -1,
    aiCategorizations: -1,
    receiptScans: -1,
    emailParses: -1,
    features: [
      'Unlimited properties',
      'Everything in Pro',
      'Cross-property benchmarking',
      'Team access (up to 5)',
      'QuickBooks / Xero sync',
      'API access',
      'Priority phone support',
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;

export function getPlanLimits(plan: PlanId) {
  return PLANS[plan];
}

export function isFeatureAvailable(plan: PlanId, feature: string): boolean {
  const planConfig = PLANS[plan];
  switch (feature) {
    case 'ach_payments': return plan !== 'free';
    case 'tax_export': return plan !== 'free';
    case 'ai_summaries': return plan !== 'free';
    case 'anomaly_detection': return plan !== 'free';
    case 'benchmarking': return plan === 'business';
    case 'team_access': return plan === 'business';
    case 'quickbooks': return plan === 'business';
    case 'xero': return plan === 'business';
    case 'api_access': return plan === 'business';
    default: return true;
  }
}

// CC platform fee by plan
export function getPlatformFeePercent(plan: PlanId): number {
  return plan === 'free' ? 0.5 : 0.25;
}
