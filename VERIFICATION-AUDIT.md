# HostFi Verification Audit Report

**Date:** 2026-02-18  
**Auditor:** Friday (AI Co-Founder)

---

## Part 1: Fix Verification

### Fix #1: Hostaway revenue mapping
**Status:** ✅ VERIFIED  
**File:** `lib/integrations/hostaway.ts:88-102`  
**Evidence:**
```ts
return {
  property_id: propertyId,
  platform,
  source: 'api_sync',
  guest_name: reservation.guestName || 'Guest',
  amount: reservation.totalPrice || 0,
  platform_fee: reservation.channelCommissionAmount || 0,
  date: reservation.arrivalDate?.split('T')[0] || '',
  ...
  nights: reservation.nights || null,
  ...
};
```
All required fields present: `date`, `nights`, `platform`, `source`.

---

### Fix #2: Guesty revenue mapping
**Status:** ✅ VERIFIED  
**File:** `lib/integrations/guesty.ts:97-112`  
**Evidence:**
```ts
return {
  property_id: propertyId,
  platform: mapSource(reservation.source),
  source: 'api_sync',
  ...
  date: reservation.checkIn?.split('T')[0] || '',
  ...
  nights: reservation.nightsCount || null,
  ...
};
```
All required fields present: `date`, `nights`, `platform`, `source`.

---

### Fix #3: Email route consolidation
**Status:** ✅ VERIFIED  
**File:** `app/api/parse-email/route.ts`  
**Evidence:**
```ts
// Re-export the handler from the canonical route
export { POST } from '@/app/api/email/inbound/route';
```
Properly re-exports from the canonical route.

---

### Fix #4: Google Drive upload endpoint
**Status:** ✅ VERIFIED  
**File:** `app/api/integrations/google/upload-receipt/route.ts`  
**Evidence:**
```ts
const auth = await authenticateRequest();
```
Endpoint exists and uses `authenticateRequest()` for auth.

---

### Fix #5: PMS auto-sync cron
**Status:** ✅ VERIFIED  
**Route:** `app/api/integrations/pms-sync/route.ts` exists  
**vercel.json:**
```json
{
  "path": "/api/integrations/pms-sync",
  "schedule": "0 */6 * * *"
}
```
Runs every 6 hours.

---

### Fix #6: Inbox Google Sheets sync
**Status:** ✅ VERIFIED  
**File:** `app/dashboard/inbox/page.tsx:424-433`  
**Evidence:**
```ts
// Fire-and-forget: sync to Google Sheets
const prop = allProperties.find(p => p.id === propId);
fetch("/api/integrations/google/sync-expense", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    expense: {
      date: item.parsed.due_date || new Date().toISOString().split("T")[0],
      property_name: prop?.name || "Unknown",
      ...
    },
  }),
}).catch(() => {});
```
Fires sync-expense after bill confirmation.

---

### Fix #7: Revenue page column names
**Status:** ✅ VERIFIED  
**File:** `app/dashboard/revenue/page.tsx:303-307`  
**Evidence:**
```ts
const { error } = await supabase.from("revenue").insert({
  user_id: user.id,
  property_id: form.property_id,
  platform: form.source,
  source: 'manual',
  date: checkIn,
  ...
});
```
Uses `platform` for booking platform and `source: 'manual'` for entry source.

---

### Fix #8: Revenue CSV parser
**Status:** ✅ VERIFIED  
**File:** `lib/revenue-csv-parser.ts:75-77`  
**Evidence:**
```ts
return {
  ...
  platform: platform,
  ...
  source: 'csv_import' as const,
};
```
Uses `platform` field (not `source` for platform), sets `source: 'csv_import'`. Platform detection includes `booking_com` (line 15).

---

### Fix #9: Revenue import route
**Status:** ✅ VERIFIED  
**File:** `app/api/revenue/import/route.ts:80-85`  
**Evidence:**
```ts
const newEntry: RevenueEntry = {
  ...
  platform: (['airbnb', 'vrbo', 'booking_com', 'direct', 'other'].includes(entry.source || '') ? entry.source : 'other') as ...,
  source: 'csv_import' as const,
  ...
};
```
Uses correct column names.

---

### Fix #10: No demo user IDs
**Status:** ✅ VERIFIED (with context)  
**Evidence:** 60 instances found — ALL are in demo data files:
- `lib/demo-expenses.ts`
- `lib/demo-revenue.ts`
- `lib/data/demo-data.ts`

These are intentional demo mode fixtures, not production code. No real API routes or database operations use `user_id: 'demo'`.

---

### Fix #11: No `demo_abc123`
**Status:** ✅ VERIFIED  
**Evidence:** `grep -r "demo_abc123"` returns 0 matches.

---

### Fix #12: No `demo_user@in.hostfi.ai`
**Status:** ✅ VERIFIED  
**Evidence:** `grep -r "demo_user"` returns 0 matches.

---

### Fix #13: Account deletion
**Status:** ✅ VERIFIED  
**File:** `app/api/account/delete/route.ts:37-54`  
**Evidence:**
```ts
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
All user-data tables included for GDPR compliance.

---

### Fix #14: Silent catch blocks
**Status:** ⚠️ PARTIAL — Needs cleanup  
**Evidence:** Found ~15 empty catch blocks (without console.error):
- `app/auth/callback/route.ts:18` — `} catch {`
- `app/unsubscribe/page.tsx:23` — `} catch {`
- `app/dashboard/ask/page.tsx:63` — `} catch {`
- `app/dashboard/expenses/new/page.tsx:117` — `} catch {`
- `app/dashboard/billing/page.tsx:180, 211` — `} catch {`
- `app/dashboard/reports/page.tsx:95` — `} catch {`
- Multiple API routes with empty catches

**Note:** Many catch blocks DO have `console.error(...)`, but ~15-20 are silent.

---

### Fix #15: Localhost fallbacks
**Status:** ✅ VERIFIED  
**Evidence:** `localhost:3000` only appears in:
- `app/api/__tests__/revenue-import.test.ts` (test file)
- `app/api/__tests__/expenses-import.test.ts` (test file)
- `lib/alerts/trigger.ts` (comment only, no fallback)

No production code falls back to localhost.

---

### Fix #16: Stripe price validation
**Status:** ✅ VERIFIED  
**File:** `lib/stripe.ts:54-73`  
**Evidence:**
```ts
export function isStripePriceConfigured(priceId: string | null): boolean {
  if (!priceId) return false;
  // Placeholder patterns from defaults
  return !priceId.startsWith('price_pro_') && !priceId.startsWith('price_business_');
}

export function getValidPriceId(plan: 'pro' | 'business', annual: boolean): string {
  ...
  if (!priceId || !isStripePriceConfigured(priceId)) {
    throw new Error(`Stripe price not configured for ${plan} plan...`);
  }
  return priceId;
}
```

---

### Fix #17: Revenue edit/delete error handling
**Status:** ✅ VERIFIED  
**File:** `app/dashboard/revenue/page.tsx:104-111, 122-130`  
**Evidence:**
```ts
// Edit handler
} catch (error) {
  console.error('Failed to save revenue edit:', error);
  alert('Failed to save changes. Please try again.');
}

// Delete handler
} catch (error) {
  console.error('Failed to delete revenue entry:', error);
  alert('Failed to delete. Please try again.');
}
```
Shows user feedback on failure via `alert()`.

---

### Fix #18: Onboarding billing email
**Status:** ✅ VERIFIED  
**File:** `components/onboarding.tsx:53-67`  
**Evidence:**
```ts
useEffect(() => {
  (async () => {
    try {
      const res = await fetch("/api/email/setup");
      const data = await res.json();
      if (data.email) {
        setBillingEmail(data.email);
      } else {
        const genRes = await fetch("/api/email/setup", { method: "POST" });
        ...
      }
    } catch { ... }
  })();
}, []);
```
Fetches from `/api/email/setup` (GET to check, POST to generate).

---

### Fix #19: Settings billing email
**Status:** ✅ VERIFIED  
**File:** `app/dashboard/settings/page.tsx:35-42`  
**Evidence:**
```ts
fetch("/api/email/setup")
  .then(r => r.json())
  .then(data => {
    if (data.email) {
      setBillingEmail(data.email);
    } else {
      setBillingEmail("");
    }
  })
```
Uses `/api/email/setup` — not hardcoded.

---

### Fix #20: Pricing redirect
**Status:** ✅ VERIFIED  
**File:** `app/pricing/page.tsx`  
**Evidence:**
```ts
import { redirect } from "next/navigation";

export default function PricingPage() {
  redirect("/#pricing");
}
```
Correctly redirects to homepage pricing section.

---

## Part 2: Expenses Page Audit

### Data Loading
**Status:** ✅ WORKING  
**File:** `app/dashboard/expenses/page.tsx:12-13`  
**Evidence:**
```ts
const { properties, expenses, loading, refresh } = useDashboardData();
```
Uses `useDashboardData()` hook correctly. Fetches expenses from Supabase (or demo data).

---

### Empty State
**Severity:** 🟢 Good  
**File:** `app/dashboard/expenses/page.tsx:54-60`  
**Evidence:**
```tsx
<div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
  <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
  <p className="text-gray-500 text-sm">No expenses yet</p>
  <Link href="/dashboard/expenses/new" ...>Add Your First Expense</Link>
</div>
```
Good empty state with icon, message, and clear CTA.

---

### Add Expense Flow
**Severity:** 🟢 Good  
**File:** `app/dashboard/expenses/new/page.tsx`  
**Analysis:**
- ✅ Category selection with visual picker
- ✅ Property dropdown (required)
- ✅ Amount validation (number, step=0.01)
- ✅ Date validation (type="date", required)
- ✅ Vendor/description field
- ✅ Recurring toggle with frequency selection
- ✅ Tags input (comma-separated)
- ✅ Optional notes expansion
- ✅ Receipt scanner integration
- ✅ Proper error handling with user feedback
- ✅ Fires Google Sheets sync after save
- ✅ Fires anomaly check after save

**Column names used:** `category`, `description`, `vendor`, `amount`, `date`, `status: 'paid'` — all correct.

---

### Edit Expense
**Severity:** 🟢 Good  
**File:** `app/dashboard/expenses/page.tsx:16-47`  
**Analysis:**
- ✅ Click row → opens modal
- ✅ Modal with all editable fields
- ✅ Vendor, description, category, property, amount, date, status
- ✅ `saveEdit()` calls Supabase update
- ✅ Error handling with `alert()` on failure
- ✅ Calls `refresh()` after save

---

### Delete Expense
**Severity:** 🟢 Good  
**File:** `app/dashboard/expenses/page.tsx:80-98`  
**Analysis:**
- ✅ Confirmation dialog: `confirm('Delete this expense? This cannot be undone.')`
- ✅ Actually deletes via Supabase
- ✅ Error handling with `console.error`
- ✅ Calls `refresh()` after delete

---

### Category Filtering
**Severity:** 🟢 Good  
**File:** `app/dashboard/expenses/page.tsx:38-42, 100-104`  
**Analysis:**
```ts
const filteredExpenses = useMemo(() => {
  return expenses.filter((exp) => {
    if (selectedCategory !== "all" && exp.category !== selectedCategory) return false;
    ...
  });
}, [expenses, selectedCategory, selectedProperty, selectedStatus]);
```
Filter works correctly with `useMemo` for performance.

---

### Property Filtering
**Severity:** 🟢 Good  
**Evidence:** Same `filteredExpenses` memo includes:
```ts
if (selectedProperty !== "all" && exp.property_id !== selectedProperty) return false;
```

---

### Search
**Severity:** 🟡 Missing  
**File:** `app/dashboard/expenses/page.tsx`  
**Issue:** No search functionality implemented. Users cannot search by vendor name, description, or amount.  
**Fix:** Add a search input that filters by `vendor`, `description`, or `amount`.

---

### CSV Import
**Severity:** 🟢 Good  
**File:** `app/api/expenses/import/route.ts`  
**Analysis:**
- ✅ Validates required fields (date, amount, description, property)
- ✅ Date format validation (`YYYY-MM-DD`)
- ✅ Amount validation (number, > 0, < 10M)
- ✅ Duplicate detection
- ✅ Uses `source: 'csv_import'`
- ✅ Rate limiting
- ✅ Authentication

**Note:** No UI for CSV import on expenses page — exists on `/dashboard/import` instead.

---

### Recurring Expenses Page
**Severity:** 🟢 Good  
**File:** `app/dashboard/expenses/recurring/page.tsx`  
**Analysis:**
- ✅ Displays recurring expenses as cards
- ✅ Click card → opens edit modal
- ✅ Edit: vendor, description, category, property, amount, frequency, next_due_date
- ✅ Pause/Resume toggle
- ✅ Delete with confirmation
- ✅ Total monthly estimate shown
- ✅ Empty state with CTA

---

### Receipt Attachment
**Severity:** 🟢 Good (on new expense page)  
**File:** `app/dashboard/expenses/new/page.tsx`  
**Evidence:**
- Receipt scanner section with `<ReceiptUpload>` component
- Auto-fills amount, vendor, date, category from scanned receipt
- No explicit Drive upload on expenses page, but exists globally

**Note:** Cannot attach receipt to existing expenses (only on creation).

---

### Google Sheets Sync
**Severity:** 🟢 Good  
**File:** `app/dashboard/expenses/new/page.tsx:89-102`  
**Evidence:**
```ts
fetch("/api/integrations/google/sync-expense", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ expense: {...} }),
}).catch(() => {}); // Fire-and-forget
```
Triggers sync after adding expense.

---

### Feature Gating
**Severity:** 🟢 Good  
**File:** `lib/feature-gates.ts`  
**Analysis:** Expense features are NOT gated behind Pro/Business:
- Adding expenses: Free
- CSV import: Free
- Receipt scanning: Free (limited to 5/mo)

Only advanced features like PDF export, AI features, benchmarking are gated.

---

### Mobile Responsiveness
**Severity:** 🟢 Good  
**File:** `app/dashboard/expenses/page.tsx`  
**Evidence:**
- Desktop: Full table with columns
- Mobile: Card layout with `lg:hidden` and `hidden lg:block` classes
- Modal: `rounded-t-2xl sm:rounded-2xl` (bottom sheet on mobile)
- Safe area handling: `safe-area-bottom`

---

### Sorting
**Severity:** 🟡 Missing  
**File:** `app/dashboard/expenses/page.tsx`  
**Issue:** No column sorting implemented. Cannot sort by date, amount, or category.  
**Fix:** Add sortable headers that toggle ascending/descending order.

---

### Pagination
**Severity:** 🟡 Missing  
**File:** `app/dashboard/expenses/page.tsx`  
**Issue:** No pagination. With 100+ expenses, all render at once.  
**Current:** `useDashboardData()` fetches all expenses from Supabase without limit.  
**Fix:** Implement client-side or server-side pagination (e.g., 25 per page).

---

### Currency Formatting
**Severity:** 🟢 Good  
**Evidence:** Uses `formatCurrency()` from `lib/utils`:
```ts
import { formatCurrency, formatDate, cn, getStatusColor } from "@/lib/utils";
...
{formatCurrency(expense.amount)}
```

---

### Date Formatting
**Severity:** 🟢 Good  
**Evidence:** Uses `formatDate()` from `lib/utils`:
```ts
<td className="px-5 py-3 text-sm text-muted-foreground">{formatDate(expense.date)}</td>
```
Consistent throughout.

---

### Error States
**Severity:** 🟢 Good  
**Evidence:**
- Save errors show `alert('Failed to save. Please try again.')`
- Delete errors logged with `console.error`
- Loading state shows skeleton UI
- Demo mode shows warning banner

---

### Loading States
**Severity:** 🟢 Good  
**File:** `app/dashboard/expenses/page.tsx:106-112`  
**Evidence:**
```tsx
if (loading) {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded-lg" />
      <div className="h-64 bg-gray-100 rounded-2xl" />
    </div>
  );
}
```
Proper skeleton loader while data loads.

---

### Hardcoded Values
**Severity:** 🟢 None Found  
No hardcoded demo data shown to real users. Demo mode is properly gated via `isDemoMode()`.

---

### TODO/FIXME Comments
**Severity:** 🟢 None Found  
No TODO or FIXME comments in expenses-related files.

---

### TypeScript `any` Types
**Severity:** 🟢 Good  
All critical paths use proper types:
- `EditState` interface defined
- `ExpenseCategory`, `ExpenseFrequency` types used
- No visible `any` types in critical paths

---

### useEffect Dependency Arrays
**Severity:** 🟢 Good  
`useDashboardData()` hook has proper deps:
```ts
useEffect(() => {...}, [refreshKey, refresh]);
```

Page-level effects also have correct dependencies.

---

### Stale Closures
**Severity:** 🟢 Good  
Callbacks use `useCallback` with proper dependencies:
```ts
const saveEdit = useCallback(async () => {
  ...
}, [editState, editingId, demo, refresh]);
```

---

## Summary

### Part 1: Fix Verification
| # | Fix | Status |
|---|-----|--------|
| 1 | Hostaway revenue mapping | ✅ VERIFIED |
| 2 | Guesty revenue mapping | ✅ VERIFIED |
| 3 | Email route consolidation | ✅ VERIFIED |
| 4 | Google Drive upload | ✅ VERIFIED |
| 5 | PMS auto-sync cron | ✅ VERIFIED |
| 6 | Inbox Sheets sync | ✅ VERIFIED |
| 7 | Revenue column names | ✅ VERIFIED |
| 8 | Revenue CSV parser | ✅ VERIFIED |
| 9 | Revenue import route | ✅ VERIFIED |
| 10 | No demo user IDs | ✅ VERIFIED |
| 11 | No demo_abc123 | ✅ VERIFIED |
| 12 | No demo_user email | ✅ VERIFIED |
| 13 | Account deletion | ✅ VERIFIED |
| 14 | Silent catch blocks | ⚠️ ~15 need fixing |
| 15 | Localhost fallbacks | ✅ VERIFIED |
| 16 | Stripe price validation | ✅ VERIFIED |
| 17 | Revenue error handling | ✅ VERIFIED |
| 18 | Onboarding billing email | ✅ VERIFIED |
| 19 | Settings billing email | ✅ VERIFIED |
| 20 | Pricing redirect | ✅ VERIFIED |

**Result:** 19/20 verified, 1 needs cleanup

### Part 2: Expenses Page Issues

| Severity | Issue | Location |
|----------|-------|----------|
| 🟡 Medium | No search functionality | `expenses/page.tsx` |
| 🟡 Medium | No column sorting | `expenses/page.tsx` |
| 🟡 Medium | No pagination | `expenses/page.tsx` |
| 🟢 Minor | Cannot attach receipt to existing expense | Edit modal |

### Overall Assessment

**Core functionality:** ✅ Solid  
**Edge cases:** ✅ Handled well  
**Code quality:** ✅ Good TypeScript, proper hooks  
**UX:** 🟢 Good (mobile responsive, loading states, error feedback)  
**Improvements needed:** Search, sort, pagination

---

*Generated by Friday | HostFi AI Co-Founder*
