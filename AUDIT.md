# HostFi Full-Stack Audit Report

**Date:** February 9, 2026  
**Auditor:** OpenClaw Subagent  
**Codebase:** propflow (Next.js 16 / React 19 / TypeScript 5.8)

---

## Overall Grade: B-

The codebase is generally well-structured with good TypeScript usage and proper Supabase RLS policies. However, there are **critical security issues** in API routes that must be addressed before launch, along with several important code quality and performance concerns.

---

## Summary of Findings

| Severity | Count | Category |
|----------|-------|----------|
| 🔴 Critical | 5 | Security |
| 🟠 Important | 12 | Security, Performance, Code Quality |
| 🟡 Minor | 18 | Code Quality, Accessibility, Performance |

---

## 🔴 Critical Issues (Must Fix Before Launch)

### 1. **CRITICAL: Unauthenticated API Routes**
**Files:**
- `src/app/api/expenses/import/route.ts`
- `src/app/api/revenue/import/route.ts`

**Description:** These import endpoints have **NO authentication**. Anyone can POST data to them.

**Current Code (expenses/import/route.ts, line 32):**
```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // No auth check - proceeds directly to import!
```

**Fix:**
```typescript
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... rest of logic
```

---

### 2. **CRITICAL: Unauthenticated Ask AI Route**
**File:** `src/app/api/ask/route.ts` (line 19)

**Description:** The `/api/ask` endpoint only rate-limits by IP but doesn't require authentication. Anyone can query the AI with financial context.

**Fix:** Add Supabase auth check before processing the request.

---

### 3. **CRITICAL: Optional Webhook Authentication**
**Files:**
- `src/app/api/parse-bill/route.ts` (line 71)
- `src/app/api/parse-receipt/route.ts` (line 25)

**Description:** Webhook secret is only checked if `WEBHOOK_SECRET` env var exists. In production without this set, these endpoints are completely open.

**Current Code:**
```typescript
const webhookSecret = process.env.WEBHOOK_SECRET;
if (webhookSecret) {  // If not set, auth is skipped!
  const providedSecret = request.headers.get("X-Webhook-Secret");
  if (providedSecret !== webhookSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
```

**Fix:** Make webhook secret **required** in production:
```typescript
const webhookSecret = process.env.WEBHOOK_SECRET;
if (!webhookSecret) {
  console.error('WEBHOOK_SECRET not configured');
  return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
}
const providedSecret = request.headers.get("X-Webhook-Secret");
if (providedSecret !== webhookSecret) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

---

### 4. **CRITICAL: Stripe Secret Key Fallback**
**File:** `src/lib/stripe.ts` (line 4)

**Description:** Stripe is initialized with a placeholder if secret key is missing. This could cause unexpected behavior.

**Current Code:**
```typescript
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
```

**Fix:** Fail explicitly if Stripe key is not set:
```typescript
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey || stripeKey === 'sk_test_placeholder') {
  console.warn('Stripe not configured - payments will not work');
}
export const stripe = new Stripe(stripeKey || '', {
```

---

### 5. **CRITICAL: Missing Stripe Env Vars in .env.local.example**
**File:** `.env.local.example`

**Description:** Critical Stripe environment variables are missing from the example file:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRO_MONTHLY_PRICE_ID`
- `STRIPE_PRO_ANNUAL_PRICE_ID`
- `STRIPE_BUSINESS_MONTHLY_PRICE_ID`
- `STRIPE_BUSINESS_ANNUAL_PRICE_ID`

**Fix:** Update `.env.local.example`:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
ANTHROPIC_API_KEY=your-anthropic-api-key
WEBHOOK_SECRET=your-webhook-secret
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRO_MONTHLY_PRICE_ID=price_xxx
STRIPE_PRO_ANNUAL_PRICE_ID=price_xxx
STRIPE_BUSINESS_MONTHLY_PRICE_ID=price_xxx
STRIPE_BUSINESS_ANNUAL_PRICE_ID=price_xxx
```

---

## 🟠 Important Issues (Should Fix Soon)

### 6. **Console.log Statements in Production Code**
**File:** `src/app/api/stripe/webhook/route.ts`

**Lines:** 38, 41, 61, 73, 76, 104, 113, 116, 134, 144, 147, 164, 174

**Description:** 13 `console.log` statements containing customer IDs, emails, subscription IDs. Should use structured logging with appropriate log levels.

**Fix:** Replace with a proper logging solution or at minimum use `console.info` for expected logs and remove sensitive data:
```typescript
// Instead of:
console.log(`Checkout completed: customer=${customerId}, subscription=${subscriptionId}, plan=${plan}, email=${customerEmail}`);

// Use:
console.info(`Checkout completed for plan: ${plan}`);
```

---

### 7. **Missing Rate Limiting on Critical Routes**
**Files:**
- `src/app/api/expenses/import/route.ts`
- `src/app/api/revenue/import/route.ts`
- `src/app/api/stripe/cancel/route.ts`

**Description:** Import routes have no rate limiting. Cancel route has no rate limiting.

**Fix:** Add rate limiting similar to other routes.

---

### 8. **In-Memory Rate Limiting Won't Scale**
**Files:** All API routes using `rateLimitMap`

**Description:** Rate limiting uses `Map<string, ...>` which:
- Resets on server restart
- Doesn't work across multiple serverless instances
- Leaks memory (no cleanup of old entries)

**Fix:** Use Redis, Upstash, or Vercel KV for distributed rate limiting. Or at minimum, add cleanup:
```typescript
// Add periodic cleanup
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}, 60_000);
```

---

### 9. **Massive File: integrations/page.tsx (2,641 lines)**
**File:** `src/app/dashboard/integrations/page.tsx`

**Description:** Single file contains 10+ modal components and integration logic. Should be split into:
- `components/integrations/QuickBooksModal.tsx`
- `components/integrations/XeroModal.tsx`
- `components/integrations/SlackModal.tsx`
- `components/integrations/GoogleSheetsModal.tsx`
- `components/integrations/IntegrationCard.tsx`
- etc.

---

### 10. **Demo Mode Logic Mixed with Production**
**Files:** Multiple pages and components

**Description:** Demo data is imported directly in production pages:
```typescript
import { DEMO_PROPERTIES } from "@/lib/types";
import { DEMO_EXPENSES } from "@/lib/demo-expenses";
```

**Fix:** Use a data layer that switches between demo and real data based on auth state:
```typescript
// lib/data/expenses.ts
export async function getExpenses(userId: string) {
  if (userId === 'demo' || !supabase) return DEMO_EXPENSES;
  return await supabase.from('expenses').select('*');
}
```

---

### 11. **No Input Validation on CSV Import**
**Files:**
- `src/app/api/expenses/import/route.ts`
- `src/app/api/revenue/import/route.ts`

**Description:** While basic field validation exists, there's no:
- Maximum array length check (could cause DoS)
- String length limits on description, vendor, notes
- Sanitization of input strings

**Fix:**
```typescript
if (expenses.length > 10000) {
  return NextResponse.json({ error: 'Too many expenses (max 10,000)' }, { status: 400 });
}
// Sanitize and limit string lengths
const sanitizeString = (s: string, max: number) => s?.slice(0, max).trim() || '';
```

---

### 12. **Missing Error Boundaries**
**File:** `src/app/dashboard/error.tsx` exists but...

**Description:** Only one error boundary exists at dashboard level. Individual pages with complex client components (charts, modals) don't have error boundaries.

**Fix:** Add error boundaries to:
- `src/app/dashboard/analytics/error.tsx`
- `src/app/dashboard/integrations/error.tsx`
- `src/app/dashboard/reports/error.tsx`

---

### 13. **Recharts Warning During SSR**
**Build Output:**
```
The width(-1) and height(-1) of chart should be greater than 0
```

**Description:** Charts render with invalid dimensions during static generation.

**Fix:** Use dynamic import with ssr: false for chart components:
```typescript
const MonthlySpendChart = dynamic(
  () => import('@/components/analytics-charts').then(m => m.MonthlySpendChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
```

---

### 14. **Supabase Client Returns Null Without Error**
**Files:**
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`

**Description:** Functions return `null` if env vars are missing. Callers must check for null every time.

**Fix:** Either throw an error or use a NullObject pattern that clearly indicates demo mode.

---

### 15. **Missing Loading States**
**Files:** Most dashboard pages

**Description:** Pages render with demo data immediately. No skeleton states or suspense boundaries for when real data is loading.

**Fix:** Add loading.tsx files and Suspense boundaries:
```typescript
// src/app/dashboard/expenses/loading.tsx
export default function Loading() {
  return <ExpensesSkeleton />;
}
```

---

### 16. **No CSRF Protection**
**Files:** All POST API routes

**Description:** While using cookies for auth (via Supabase), there's no explicit CSRF token validation.

**Mitigation:** Supabase's auth cookies have SameSite attribute, but consider adding explicit CSRF protection for high-security operations.

---

### 17. **Hardcoded API Version**
**File:** `src/lib/stripe.ts` (line 5)

**Current:**
```typescript
apiVersion: '2026-01-28.clover',
```

**Fix:** Move to env or constant file to track API version changes.

---

## 🟡 Minor Issues (Nice to Have)

### 18. **ESLint Disables**
**Files:**
- `src/components/receipt-upload.tsx` (lines 185, 289) - `@next/next/no-img-element`
- `src/components/analytics-charts.tsx` (line 174) - `@typescript-eslint/no-explicit-any`

**Description:** The `no-img-element` disables are justified (using base64 data URLs). The `any` type in analytics-charts is a known Recharts typing issue.

---

### 19. **Missing useMemo/useCallback in Some Components**
**File:** `src/components/onboarding.tsx`

**Description:** The `saveStep` function recreates on every render. Already uses `useCallback` but dependencies could be optimized.

---

### 20. **Inconsistent Button Styles**
**Files:** Various components

**Description:** Some buttons use inline styles, some use Tailwind classes. Consider extracting to shared Button component with variants.

---

### 21. **Limited Accessibility Coverage**
**Files:** Various

**Found aria-labels:** 14 instances (mostly in filters and settings)

**Missing:**
- Form field descriptions for screen readers
- Focus management in modals
- Keyboard navigation for data tables
- Skip links for main content

---

### 22. **No Touch Target Size Enforcement**
**Files:** Various

**Description:** Most buttons use `min-h-[40px]` or `min-h-[44px]` but not all. Touch targets should be at least 44x44px.

**Examples of undersized targets:**
- Some icon-only buttons in tables
- Collapse/expand toggles

---

### 23. **Fixed Widths Could Break Mobile**
**File:** `src/app/dashboard/integrations/page.tsx`

**Example:** Modal widths like `max-w-lg` work but some inner content has fixed widths.

---

### 24. **No Image Optimization for User Uploads**
**File:** `src/components/receipt-upload.tsx`

**Description:** Uses `<img>` element for receipt previews (justified for base64), but uploaded images aren't processed/optimized.

---

### 25. **Duplicate Rate Limiter Code**
**Files:** 5 API routes

**Description:** Same rate limiting logic copied across routes. Should be extracted to a utility.

**Fix:**
```typescript
// lib/rate-limit.ts
export function createRateLimiter(maxRequests: number, windowMs: number) {
  const map = new Map<string, { count: number; resetAt: number }>();
  return (ip: string) => { /* ... */ };
}
```

---

### 26. **Missing TypeScript Strict Mode Checks**
**File:** `tsconfig.json`

**Description:** Good - strict mode is enabled. No issues found.

---

### 27. **No Dead Code Found**
**Description:** Grep for unused exports would be useful but not critical.

---

### 28. **Hardcoded Demo User ID**
**Files:**
- `src/app/api/expenses/import/route.ts` (line 85): `user_id: 'demo'`
- `src/app/api/revenue/import/route.ts` (line 70): `user_id: entry.user_id || 'demo'`

**Description:** Demo user ID hardcoded in import routes.

---

### 29. **Missing useEffect Cleanup**
**Files:** Various

**Description:** Most useEffects are properly handled. The `useInView` in `page.tsx` correctly disconnects observer.

**Potential issue:** `src/components/sidebar.tsx` useEffect on line 55 - externalOpen sync could be improved.

---

### 30. **Bundle Size - Large Dependencies**
**Dependencies:**
- `recharts` - ~500KB (could lazy load)
- `@anthropic-ai/sdk` - Only used server-side ✓
- `stripe` - Only used server-side ✓

**Fix:** Lazy load Recharts components.

---

### 31. **No Robots.txt or Sitemap**
**Missing Files:**
- `public/robots.txt`
- `public/sitemap.xml`

---

### 32. **Missing Meta Tags**
**File:** `src/app/layout.tsx`

**Description:** Basic metadata present but could add more:
- Open Graph tags
- Twitter card
- Canonical URL

---

### 33. **Middleware Deprecation Warning**
**Build Output:**
```
The "middleware" file convention is deprecated. Please use "proxy" instead.
```

**File:** `src/middleware.ts`

**Description:** Next.js 16 warning about middleware convention.

---

### 34. **Static Pages Marked Correctly**
**Build Output:**
```
○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

**Description:** All pages correctly identified. API routes are dynamic. ✓

---

### 35. **No Tests**
**Description:** No test files found. Consider adding:
- Unit tests for utility functions (`lib/*.ts`)
- Integration tests for API routes
- E2E tests for critical flows

---

## Security Checklist Summary

| Check | Status |
|-------|--------|
| API Authentication | ❌ Multiple unauthenticated routes |
| Rate Limiting | ⚠️ Present but in-memory only |
| Input Validation | ⚠️ Basic validation, needs limits |
| XSS Prevention | ✅ No dangerouslySetInnerHTML |
| CSRF Protection | ⚠️ Relies on SameSite cookies |
| Secrets Handling | ⚠️ Some fallback to placeholders |
| RLS Policies | ✅ Properly configured |
| Webhook Verification | ✅ Stripe signature verified |
| Environment Variables | ⚠️ Missing from example file |

---

## Recommended Priority Order

1. **Immediate:** Fix critical security issues (#1-5)
2. **This Week:** Important issues (#6-17)
3. **Before Launch:** Add tests, fix accessibility issues
4. **Post-Launch:** Minor optimizations and polish

---

## Files to Split

| File | Lines | Recommendation |
|------|-------|----------------|
| `src/app/dashboard/integrations/page.tsx` | 2,641 | Split into 10+ component files |
| `src/app/dashboard/revenue/page.tsx` | 615 | Extract modals and forms |
| `src/components/onboarding.tsx` | 526 | Extract step components |
| `src/app/dashboard/billing/page.tsx` | 493 | Extract pricing cards |
| `src/app/dashboard/tax/page.tsx` | 442 | Extract schedule E components |

---

*Report generated by OpenClaw audit subagent*
