# 🔍 HostFi Deep Bug Audit Report

**Date:** February 18, 2026  
**Auditor:** Friday (AI Co-founder)  
**Scope:** `/src/` codebase - Next.js, TypeScript, Supabase, Stripe

---

## Executive Summary

Found **17 bugs** across 8 categories:
- 🔴 **CRITICAL:** 4 (breaks core functionality)
- 🟡 **HIGH:** 8 (bad UX or data issues)  
- 🟢 **MEDIUM:** 5 (cosmetic or edge case)

The most severe issue is the **revenue table column mismatch** - manual revenue entries will fail to save because the code uses wrong column names.

---

## 🔴 CRITICAL Issues

### 🔴 Revenue Insert Column Mismatch - BREAKS ALL MANUAL REVENUE ENTRIES
**File:** `app/dashboard/revenue/page.tsx`  
**Line:** ~304  
**Issue:** Code inserts `source: form.source` but the database column is `platform`. Also inserts `import_source: 'manual'` but that column doesn't exist - it should be `source: 'manual'`. Missing required `date` column entirely.

**Schema expects:**
```sql
platform text not null check (platform in ('airbnb', 'vrbo', 'direct', 'booking_com', 'other'))
source text default 'manual' check (source in ('manual', 'csv_import', 'api_sync'))
date date not null
```

**Code sends:**
```typescript
source: form.source,        // WRONG: should be "platform"
import_source: 'manual',    // WRONG: column is "source", not "import_source"
// MISSING: date column (required)
```

**Impact:** Every manual revenue entry fails silently. Users think they added revenue but nothing saves. Core feature completely broken.

**Fix:**
```typescript
// In the insert call around line 301-316:
await supabase.from("revenue").insert({
  user_id: user.id,
  property_id: form.property_id,
  platform: form.source,  // Fixed: form.source contains airbnb/vrbo/etc
  source: 'manual',       // Fixed: correct column name
  date: form.check_in,    // Fixed: add required date field
  // ... rest of fields
});
```

---

### 🔴 Revenue Schema Missing Columns Used by Code
**File:** `supabase/migrations/000_full_schema.sql` vs `lib/demo-revenue.ts`  
**Issue:** The code uses columns that don't exist in the database schema:
- `nights` - not in schema
- `payout_date` - not in schema  
- `confirmation_code` - not in schema

**Impact:** Revenue inserts from manual entry, CSV import, and PMS sync will fail or lose data.

**Fix:** Add migration:
```sql
ALTER TABLE public.revenue ADD COLUMN IF NOT EXISTS nights integer;
ALTER TABLE public.revenue ADD COLUMN IF NOT EXISTS payout_date date;
ALTER TABLE public.revenue ADD COLUMN IF NOT EXISTS confirmation_code text;
```

---

### 🔴 Revenue Import Route Uses Wrong Column Names
**File:** `app/api/revenue/import/route.ts`  
**Line:** ~112  
**Issue:** Same column name mismatch as manual entry:
```typescript
source: entry.source || 'other',  // Should be: platform
import_source: 'csv_import',      // Should be: source: 'csv_import'
```

**Impact:** CSV revenue imports fail. Users upload data and nothing saves.

**Fix:** Same as manual entry fix - map to correct column names.

---

### 🔴 Hardcoded Demo User ID in Production Code
**File:** `app/dashboard/revenue/page.tsx`  
**Line:** ~277  
**Issue:** 
```typescript
const entry: RevenueEntry = {
  id: `manual-${Date.now()}`,
  user_id: 'demo',  // HARDCODED! This is used BEFORE checking if demo mode
  ...
```

The object is created with `user_id: 'demo'` before the `if (!demo)` check, so if there's ever a code path where this object gets used directly, it would have wrong ownership.

**Impact:** Potential data ownership issue. If entry object is used before proper DB insert, it has wrong user_id.

**Fix:** Move entry creation inside the conditional or get user.id first:
```typescript
if (!demo) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  
  const entry = {
    user_id: user.id,  // Now using actual user ID
    ...
  };
```

---

## 🟡 HIGH Issues

### 🟡 Silent Catch Blocks Swallow Errors (37 instances)
**Files:** Multiple files across the codebase  
**Issue:** Empty `catch {}` blocks hide errors from users and logs. Examples:
- `app/dashboard/settings/page.tsx` (4 instances)
- `app/dashboard/inbox/page.tsx` (3 instances)
- `app/dashboard/revenue/page.tsx` (3 instances)
- `components/integrations/*.tsx` (10+ instances)

**Impact:** Users experience failures with no feedback. Debugging is impossible. Silent data loss.

**Fix:** At minimum, log errors:
```typescript
} catch (error) {
  console.error('Operation failed:', error);
  // Optionally show user feedback
}
```

---

### 🟡 Localhost Fallback in Production Alert Trigger
**File:** `lib/alerts/trigger.ts`  
**Line:** ~33  
**Issue:**
```typescript
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                'http://localhost:3000';
```
If both env vars are missing in production, alerts will try to call localhost.

**Impact:** Alerts fail silently in production if env vars are misconfigured.

**Fix:** Throw error instead of falling back:
```typescript
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

if (!baseUrl) {
  console.error('[triggerAlert] No base URL configured');
  return;
}
```

---

### 🟡 Localhost Fallback in Integration OAuth Callbacks
**Files:** 
- `lib/integrations/slack.ts` (lines 21, 48)
- `lib/integrations/google.ts` (lines 16, 46)

**Issue:** OAuth redirect URIs fall back to `http://localhost:3000` if `NEXT_PUBLIC_APP_URL` is missing.

**Impact:** OAuth callbacks will fail in production. Users can't connect integrations.

**Fix:** Validate env vars at startup or throw meaningful errors.

---

### 🟡 Revenue Source Value Mismatch
**File:** `lib/demo-revenue.ts` vs schema  
**Issue:** Code uses `'booking'` but schema expects `'booking_com'`:
```typescript
// demo-revenue.ts
export type RevenueSource = 'airbnb' | 'vrbo' | 'booking' | 'direct' | 'other';

// Schema
check (platform in ('airbnb', 'vrbo', 'direct', 'booking_com', 'other'))
```

**Impact:** Revenue entries with `source: 'booking'` fail schema validation.

**Fix:** Use `'booking_com'` consistently or add `'booking'` to schema constraint.

---

### 🟡 Account Delete Missing Some Tables
**File:** `app/api/account/delete/route.ts`  
**Line:** ~43  
**Issue:** Delete cascade misses several tables:
- `inbound_emails` (raw email storage)
- `receipts`
- `anomaly_logs`
- `alert_preferences`
- `plaid_items`, `plaid_account_mappings`, `plaid_ignored_merchants`, `plaid_recurring_rules`
- `expense_splits`

**Impact:** Orphaned data remains after account deletion. GDPR compliance issue.

**Fix:** Add all user-data tables to the deletion list:
```typescript
const tables = [
  'expense_splits',
  'plaid_recurring_rules',
  'plaid_ignored_merchants', 
  'plaid_account_mappings',
  'plaid_items',
  'alert_preferences',
  'anomaly_logs',
  'receipts',
  'inbound_emails',
  'parsed_emails',
  'integration_connections', 
  'revenue',
  'recurring_expenses',
  'expenses',
  'properties',
  'profiles',
];
```

---

### 🟡 Two Email Tables - Inconsistent Usage
**Files:** 
- `app/api/parse-email/route.ts` uses `inbound_emails`
- `app/api/email/inbound/route.ts` uses `parsed_emails`
- `app/dashboard/inbox/page.tsx` uses `parsed_emails`

**Issue:** Two separate tables exist for email processing (`inbound_emails` and `parsed_emails`) and code uses them inconsistently.

**Impact:** Emails may be stored in wrong table. Inbox UI may show incomplete data.

**Fix:** Clarify data flow:
1. `inbound_emails` = raw email storage
2. `parsed_emails` = processed/AI-parsed bills for inbox review
3. Ensure `parse-email/route.ts` creates entries in BOTH tables or updates the parsed_emails entry.

---

### 🟡 Dashboard Data Hook Missing Recurring Expenses
**File:** `hooks/useDashboardData.ts`  
**Line:** ~78  
**Issue:** The hook fetches properties, expenses, and revenue but NOT recurring expenses for real users:
```typescript
const [propertiesRes, expensesRes, revenueRes] = await Promise.all([
  supabase.from("properties").select("*")...
  supabase.from("expenses").select("*")...
  supabase.from("revenue").select("*")...
  // Missing: recurring_expenses
]);
```

**Impact:** Real users see empty recurring expenses list even if they have data.

**Fix:** Add recurring expenses query:
```typescript
const [propertiesRes, expensesRes, revenueRes, recurringRes] = await Promise.all([
  ...
  supabase.from("recurring_expenses").select("*").order("created_at", { ascending: false }),
]);
```

---

### 🟡 Stripe Price IDs Default to Placeholder Strings
**File:** `lib/stripe.ts`  
**Lines:** ~32-34, ~43-45  
**Issue:**
```typescript
priceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_pro_monthly',
```
If env vars are missing, checkout uses fake price IDs that will fail at Stripe.

**Impact:** Checkout fails with cryptic Stripe error instead of clear "not configured" message.

**Fix:** Return proper error in checkout route if prices aren't configured:
```typescript
if (priceId.startsWith('price_pro_') || priceId.startsWith('price_business_')) {
  return NextResponse.json({ 
    error: 'Stripe prices not configured',
    demo: true 
  });
}
```

---

## 🟢 MEDIUM Issues

### 🟢 Email Cron CRON_SECRET or Service Key Auth
**File:** `app/api/email/cron/route.ts`  
**Line:** ~43  
**Issue:**
```typescript
const cronSecret = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
```
Falling back to service role key for auth is unconventional and could leak if someone guesses the endpoint.

**Impact:** Security weakness - service key exposed as auth token.

**Fix:** Use only CRON_SECRET and fail if not set in production.

---

### 🟢 Property Detail Page Uses `new Date()` in Variable Initialization
**File:** `app/dashboard/properties/[id]/page.tsx`  
**Line:** ~45  
**Issue:**
```typescript
const now = new Date();
```
Called during render, not in useEffect. Could cause hydration mismatch between server and client.

**Impact:** Possible React hydration warning (React error #418 pattern).

**Fix:** Move to useEffect or use a stable reference:
```typescript
const [now, setNow] = useState<Date | null>(null);
useEffect(() => { setNow(new Date()); }, []);
```

---

### 🟢 Revenue Page Uses `new Date()` Multiple Times in Render
**File:** `app/dashboard/revenue/page.tsx`  
**Lines:** ~181, ~199, ~244  
**Issue:** Multiple `new Date()` calls in render body. Line 199 is in an HTML template string.

**Impact:** Hydration mismatch, inconsistent dates within same render.

**Fix:** Calculate once in useEffect and use state.

---

### 🟢 Data Import Paths Inconsistent
**Files:** Multiple  
**Issue:** Some files import from `@/lib/data`, others from `@/lib/types`, others from `@/lib/demo-expenses` directly:
```typescript
// Some files:
import { DEMO_PROPERTIES } from "@/lib/data";
// Other files:
import { DEMO_PROPERTIES } from "@/lib/types";
// Other files:
import { DEMO_EXPENSES } from "./demo-expenses";
```

**Impact:** Potential for type mismatches if exports diverge. Maintenance headache.

**Fix:** Standardize all imports through `@/lib/data` barrel export.

---

### 🟢 Missing Error Toast/Feedback After Silent Failures
**Files:** Multiple dashboard pages  
**Issue:** When API calls fail in empty catch blocks, users get no feedback.

**Impact:** Confusion - users don't know if action succeeded or failed.

**Fix:** Add toast notifications for failures:
```typescript
} catch (error) {
  console.error('Failed to save:', error);
  toast.error('Failed to save. Please try again.');
}
```

---

## Recommendations

### Immediate Actions (Before Launch)
1. **Fix revenue column mismatch** - This is blocking core functionality
2. **Run database migration** for missing columns (nights, payout_date, confirmation_code)
3. **Add error logging** to all empty catch blocks
4. **Verify all env vars** are set in production

### Short-term (This Week)
1. Standardize data imports through single barrel export
2. Fix account deletion to include all tables
3. Add proper error toasts for user feedback

### Testing Recommendations
1. **End-to-end test**: Sign up → Add property → Add manual revenue entry → Verify it saves
2. **Test CSV import**: Upload sample revenue CSV → Verify data appears
3. **Test integrations**: Connect Airbnb/VRBO → Sync → Verify revenue shows
4. **Delete account**: Delete test account → Verify all data is gone

---

*This audit was conducted by reading the actual source code. Findings are based on code analysis, not guesswork.*
