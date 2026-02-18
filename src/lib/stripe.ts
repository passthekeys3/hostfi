import Stripe from 'stripe';

// Server-side Stripe instance
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey && process.env.NODE_ENV === 'production') {
  console.error('STRIPE_SECRET_KEY not configured — payments will not work');
}

export const stripe = stripeKey ? new Stripe(stripeKey) : null;

// Plan configuration
export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    priceId: null,
    annualPriceId: null,
    properties: 3,
    extraPropertyPrice: 0,
    askAiQueries: 10,
    aiCategorizations: 50,
    receiptScans: 10,
    emailParses: 5,
    features: [
      'Up to 3 properties',
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
    properties: 10,
    extraPropertyPrice: 2.50,
    askAiQueries: -1, // unlimited
    aiCategorizations: -1,
    receiptScans: -1,
    emailParses: -1,
    features: [
      'Up to 10 properties',
      '+$2.50/property beyond 10',
      'Unlimited AI features',
      'AI monthly summaries',
      'Anomaly detection',
      'Schedule E tax export',
      'Free ACH bill pay',
      'Receipt scanning',
    ],
  },
  business: {
    name: 'Business',
    price: 49,
    annualPrice: 39,
    priceId: process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID || 'price_business_monthly',
    annualPriceId: process.env.STRIPE_BUSINESS_ANNUAL_PRICE_ID || 'price_business_annual',
    properties: 25,
    extraPropertyPrice: 2.00,
    askAiQueries: -1,
    aiCategorizations: -1,
    receiptScans: -1,
    emailParses: -1,
    features: [
      'Up to 25 properties',
      '+$2/property beyond 25',
      'Everything in Pro',
      'Cross-property benchmarking',
      'Team access (up to 5)',
      'QuickBooks / Xero sync',
      'Accountant portal',
      'Priority support',
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;

export function getPlanLimits(plan: PlanId) {
  return PLANS[plan];
}

/**
 * Validate that Stripe price IDs are configured (not using placeholder defaults)
 * @param priceId - The price ID to validate
 * @returns true if configured, false if using placeholder
 */
export function isStripePriceConfigured(priceId: string | null): boolean {
  if (!priceId) return false;
  // Placeholder patterns from defaults
  return !priceId.startsWith('price_pro_') && !priceId.startsWith('price_business_');
}

/**
 * Get a valid price ID or throw an error with clear message
 */
export function getValidPriceId(plan: 'pro' | 'business', annual: boolean): string {
  const planConfig = PLANS[plan];
  const priceId = annual ? planConfig.annualPriceId : planConfig.priceId;
  
  if (!priceId || !isStripePriceConfigured(priceId)) {
    throw new Error(`Stripe price not configured for ${plan} plan (${annual ? 'annual' : 'monthly'}). Set ${plan === 'pro' ? (annual ? 'STRIPE_PRO_ANNUAL_PRICE_ID' : 'STRIPE_PRO_MONTHLY_PRICE_ID') : (annual ? 'STRIPE_BUSINESS_ANNUAL_PRICE_ID' : 'STRIPE_BUSINESS_MONTHLY_PRICE_ID')} in environment variables.`);
  }
  
  return priceId;
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
