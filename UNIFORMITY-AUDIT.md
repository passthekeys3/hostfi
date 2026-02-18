# HostFi Dashboard Uniformity Audit

**Generated:** 2026-02-17  
**Scope:** `/src/app/dashboard/` and related components

---

## Executive Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 2 |
| 🟠 High | 6 |
| 🟡 Medium | 8 |
| 🔵 Low | 5 |

---

## 1. React Hooks Ordering Issues

React hooks must be called unconditionally before any early returns. Hooks called after conditionals cause the "Rendered fewer/more hooks" error (#310/#418).

### 🔴 CRITICAL

| File | Issue | Suggested Fix |
|------|-------|---------------|
| `/dashboard/inbox/page.tsx` (line ~113) | Uses `useState(() => { if (demo) return; (async () => {...})() })` — This is an incorrect pattern. `useState` with a function initializer is for setting initial state, NOT for side effects. This code may not execute at all or execute unpredictably. | Replace with `useEffect(() => { ... }, [demo, allProperties])` |

### ✅ All Other Pages Pass

- `dashboard/page.tsx` — Hooks before loading check ✓
- `dashboard/revenue/page.tsx` — Hooks before showEmptyState check ✓
- `dashboard/expenses/page.tsx` — Hooks before loading check ✓
- `dashboard/properties/page.tsx` — Hooks before loading check ✓
- `dashboard/tax/page.tsx` — Hooks before render ✓
- `dashboard/settings/page.tsx` — Hooks at top ✓
- `dashboard/integrations/page.tsx` — Hooks at top ✓
- `dashboard/billing/page.tsx` — Hooks at top ✓
- `dashboard/alerts/page.tsx` — Uses Suspense wrapper correctly ✓
- `dashboard/ask/page.tsx` — Hooks at top ✓

---

## 2. Edit/Delete UI Pattern

**Standard Pattern:** Click row → opens modal (used by Revenue and Expenses)

### 🟠 HIGH — Inconsistent Patterns

| File | Current Pattern | Issue | Suggested Fix |
|------|-----------------|-------|---------------|
| `/dashboard/expenses/recurring/page.tsx` | Inline Pause/Pencil buttons | Uses hover buttons instead of click-row modal | Implement click-row → modal pattern matching Expenses page. Add edit modal with same styling. |

### ✅ Consistent Pages

| Page | Pattern | Notes |
|------|---------|-------|
| Revenue | Click row → Edit Modal | ✓ Correct |
| Expenses | Click row → Edit Modal | ✓ Correct |
| Properties | Click card → Detail page | ✓ Acceptable (different flow) |
| Inbox | Inline Confirm/Edit/Reject | ✓ Acceptable (review queue UX) |
| Alerts | Inline Dismiss/Acknowledge | ✓ Acceptable (notification UX) |
| Tax | Expandable rows | ✓ Acceptable (read-only) |

---

## 3. Date Handling During Render

`new Date()` called during render causes hydration mismatches between server and client.

### ✅ All Pages Pass

All pages correctly use `useEffect` to compute date-based values:

| File | Pattern |
|------|---------|
| `dashboard/page.tsx` | `useEffect(() => setCurrentMonthStr(...)` ✓ |
| `dashboard/revenue/page.tsx` | `useEffect(() => setMonthlyData(...)` ✓ |
| `dashboard/properties/page.tsx` | `useEffect(() => setCmStr(...)` ✓ |
| `dashboard/alerts/page.tsx` | `timeAgo()` called inside render but uses passed date, not `new Date()` ✓ |

---

## 4. Data Fetching Pattern

**Standard:** Use `useDashboardData()` hook for shared data (properties, expenses, revenue)

### 🟠 HIGH — Custom Fetch Instead of Shared Hook

| File | Issue | Severity | Suggested Fix |
|------|-------|----------|---------------|
| `/dashboard/inbox/page.tsx` | Uses inline fetch inside broken `useState()` instead of hook | 🔴 Critical | 1) Fix useState→useEffect bug 2) Consider adding inbox data to useDashboardData or create `useInboxData()` hook |

### ✅ Acceptable Custom Fetches

These pages fetch data specific to their domain (not shared dashboard data):

| File | What It Fetches | Why It's OK |
|------|-----------------|-------------|
| `settings/page.tsx` | User profile, billing email | User-specific settings |
| `integrations/page.tsx` | Integration connections | Integration-specific |
| `billing/page.tsx` | Subscription status | Billing-specific |
| `ask/page.tsx` | AI query responses | Request-response pattern |

---

## 5. Empty States

### 🟡 MEDIUM — Missing or Inconsistent Empty States

| File | Issue | Suggested Fix |
|------|-------|---------------|
| `/dashboard/tax/page.tsx` | Empty state exists but only shows when `propertySummaries.length === 0`. If user has properties but no expenses, they see empty tables instead of helpful guidance. | Add inline guidance when property has 0 expenses: "No expenses recorded for [Property] in [Year]" |
| `/dashboard/alerts/page.tsx` | Empty state exists ✓ | — |
| `/dashboard/benchmarking/page.tsx` | Uses dynamic import loading state | Add proper empty state in `BenchmarkingContent` component |

### ✅ Pages with Proper Empty States

- `dashboard/page.tsx` — Recent expenses empty state ✓
- `dashboard/revenue/page.tsx` — Full empty state with CTA ✓
- `dashboard/expenses/page.tsx` — Full empty state with CTA ✓
- `dashboard/properties/page.tsx` — Full empty state with CTA ✓
- `dashboard/expenses/recurring/page.tsx` — Full empty state with CTA ✓
- `dashboard/inbox/page.tsx` — "All caught up" state ✓
- `dashboard/ask/page.tsx` — Example questions as empty state ✓

---

## 6. Formatting Consistency

### 🟠 HIGH — Inconsistent Currency Formatting

| File | Current | Issue | Suggested Fix |
|------|---------|-------|---------------|
| `/dashboard/revenue/page.tsx` | Custom `fmt()` function: `$${fmt(amount)}` | Doesn't use shared `formatCurrency()`. Inline template literal adds `$` manually. | Replace all `$${fmt(x)}` with `formatCurrency(x)` |
| `/dashboard/tax/page.tsx` | Local `formatCurrency()` defined in file | Duplicates utility function | Import from `@/lib/utils` instead |

**Standard pattern from `@/lib/utils`:**
```typescript
export function formatCurrency(amount: number | null | undefined): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount ?? 0);
}
```

### 🟡 MEDIUM — Date Formatting

Most pages use `formatDate()` from utils, which is consistent. A few places use inline formatting:

| File | Line | Current | Suggested |
|------|------|---------|-----------|
| `revenue/page.tsx` | Multiple | `toLocaleDateString('en-US', { month: 'short', day: 'numeric' })` | Consider using `formatDate()` for consistency, or document that short format is intentional for tables |

---

## 7. Table Styling

### ✅ Generally Consistent

All main data tables use consistent styling:

**Header Pattern:**
```tsx
<th className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-6 py-4 bg-gray-50/80">
```

**Row Hover:**
```tsx
<tr className="hover:bg-gray-50/60 transition-colors">
```

### 🟡 MEDIUM — Minor Inconsistencies

| File | Issue | Suggested Fix |
|------|-------|---------------|
| `/dashboard/tax/page.tsx` | Uses `px-4 py-3` instead of `px-6 py-4` | Align with other tables OR keep as intentional compact style for Schedule E |
| `/dashboard/revenue/page.tsx` | Property P&L table uses `px-5 py-3` | Minor — could align to `px-6 py-4` standard |

---

## 8. Modal Styling

### ✅ Highly Consistent

All modals follow the same pattern:

**Backdrop:**
```tsx
<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm">
```

**Container:**
```tsx
<div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto safe-area-bottom">
```

**Header:**
```tsx
<div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
```

**Footer:**
```tsx
<div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
```

### 🔵 LOW — Width Variations (Acceptable)

| Modal | Width | Reason |
|-------|-------|--------|
| Revenue Add/Edit | `sm:max-w-lg` | Standard form |
| Expenses Edit | `sm:max-w-lg` | Standard form |
| CSV Import | `sm:max-w-2xl` | Needs table preview |
| Tax CPA Share | `max-w-md` | Simple form |

---

## 9. Loading States

### 🟠 HIGH — Missing Loading Skeletons

| File | Issue | Suggested Fix |
|------|-------|---------------|
| `/dashboard/revenue/page.tsx` | No loading skeleton. Uses `dashLoading` from hook but doesn't render skeleton UI. | Add skeleton matching other pages |
| `/dashboard/tax/page.tsx` | No loading skeleton. Calls `useDashboardData()` but doesn't check `loading`. | Add `if (loading) return <Skeleton />` |
| `/dashboard/alerts/page.tsx` | No loading skeleton | Add skeleton or loading indicator |
| `/dashboard/inbox/page.tsx` | No loading state for async fetch | Add loading state for `loadingParsedEmails` |

### ✅ Pages with Proper Loading Skeletons

| Page | Pattern |
|------|---------|
| `dashboard/page.tsx` | Skeleton with stat cards ✓ |
| `dashboard/expenses/page.tsx` | Skeleton ✓ |
| `dashboard/properties/page.tsx` | Skeleton with property cards ✓ |
| `dashboard/expenses/recurring/page.tsx` | Skeleton ✓ |
| `dashboard/properties/[id]/page.tsx` | Skeleton ✓ |
| `dashboard/billing/page.tsx` | Uses `loading` state ✓ |
| `dashboard/benchmarking/page.tsx` | Dynamic import loading ✓ |

**Standard Skeleton Pattern:**
```tsx
if (loading) {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded-lg" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-100 rounded-2xl" />)}
      </div>
      <div className="h-64 bg-gray-100 rounded-2xl" />
    </div>
  );
}
```

---

## 10. Unused Imports

### 🔵 LOW — Cleanup Opportunities

| File | Potentially Unused Import | Notes |
|------|---------------------------|-------|
| `/dashboard/expenses/page.tsx` | `Pencil, Trash2` | Used in modal, but could verify |
| `/dashboard/inbox/page.tsx` | `Circle` imported from lucide | Not found in JSX |
| `/dashboard/tax/page.tsx` | `type Property` | Imported but type is inferred from summary |
| `/dashboard/partners/page.tsx` | `Link` from next/link | Imported but not used (all links are external `<a>`) |

### How to Verify

Run ESLint with unused imports rule or use:
```bash
npx eslint src/app/dashboard --rule 'no-unused-vars: warn'
```

---

## Summary of Required Fixes

### Critical (Fix Immediately)

1. **`inbox/page.tsx`** — Fix broken `useState` pattern → `useEffect`

### High Priority

2. **`inbox/page.tsx`** — Add proper loading state
3. **`revenue/page.tsx`** — Add loading skeleton
4. **`revenue/page.tsx`** — Replace custom `fmt()` with `formatCurrency()`
5. **`tax/page.tsx`** — Import `formatCurrency` from utils
6. **`tax/page.tsx`** — Add loading skeleton
7. **`alerts/page.tsx`** — Add loading skeleton
8. **`expenses/recurring/page.tsx`** — Consider click-row modal pattern

### Medium Priority

9. Standardize table padding across all pages
10. Add inline empty state guidance for Tax page per-property
11. Document intentional date format variations
12. Review benchmarking empty state

### Low Priority (Cleanup)

13. Remove unused imports across dashboard pages
14. Minor modal width standardization

---

## Recommended Testing

After fixes, verify:

1. **Hydration:** No console errors about "Text content did not match"
2. **Hooks:** No "Rendered fewer hooks" errors during navigation
3. **Loading:** All pages show skeleton before data loads
4. **Modals:** Test edit/delete flows on Revenue, Expenses
5. **Empty states:** Test each page with zero data

---

## Files Audited

```
/src/app/dashboard/
├── page.tsx ✓
├── layout.tsx
├── error.tsx
├── revenue/page.tsx ⚠️
├── expenses/page.tsx ✓
├── expenses/new/page.tsx ✓
├── expenses/recurring/page.tsx ⚠️
├── properties/page.tsx ✓
├── properties/new/page.tsx ✓
├── properties/[id]/page.tsx ✓
├── tax/page.tsx ⚠️
├── settings/page.tsx ✓
├── integrations/page.tsx ✓
├── billing/page.tsx ✓
├── partners/page.tsx ✓
├── alerts/page.tsx ⚠️
├── inbox/page.tsx 🔴
├── ask/page.tsx ✓
├── benchmarking/page.tsx ✓
├── import/page.tsx ✓
└── empty-demo/page.tsx ✓
```

Legend: ✓ Pass | ⚠️ Minor Issues | 🔴 Critical Issues
