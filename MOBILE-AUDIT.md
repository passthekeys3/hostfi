# HostFi Mobile Responsiveness Audit

**Date:** February 18, 2026  
**Auditor:** Friday (AI Co-founder)  
**Device Target:** 375px (iPhone SE) minimum

---

## Executive Summary

Overall, HostFi has **solid mobile foundations**. The codebase demonstrates good use of Tailwind responsive classes, mobile-first patterns, and proper touch target sizing. However, there are specific issues that would frustrate users trying to check expenses on the go.

**Overall Grade: B+**

- 🔴 CRITICAL Issues: 3
- 🟡 HIGH Issues: 12
- 🟢 MEDIUM Issues: 9

---

## 🔴 CRITICAL — Broken on Mobile, Unusable

### 🔴 Compare Pages: Feature Comparison Table Overflows
**File:** `app/compare/stessa/page.tsx:79-100` (and other compare pages)  
**Issue:** Feature comparison table uses 3-column grid (`grid-cols-3`) with no mobile alternative. On 375px, columns are ~125px each, causing text truncation and poor readability. The "Feature" column especially gets crushed.  
**Fix:**
```tsx
// Change from:
<div className="grid grid-cols-3 bg-gray-50 border-b border-gray-200">

// To:
<div className="hidden sm:grid grid-cols-3 bg-gray-50 border-b border-gray-200">

// Add mobile card layout:
<div className="sm:hidden space-y-4">
  {features.map((f) => (
    <div className="p-4 border rounded-xl">
      <p className="font-medium text-sm mb-2">{f.feature}</p>
      <div className="flex justify-between text-xs">
        <span>HostFi: {f.hostfi}</span>
        <span>Competitor: {f.competitor}</span>
      </div>
    </div>
  ))}
</div>
```

---

### 🔴 Revenue Page: P&L Table Horizontal Overflow
**File:** `app/dashboard/revenue/page.tsx:350-400`  
**Issue:** P&L by Property table has 7 columns (Property, Gross Revenue, Platform Fees, Net Payouts, Expenses, Profit, Margin). Even with `hidden sm:table-cell` on some columns, the visible columns still cause horizontal scroll on mobile. Users can't see their P&L at a glance.  
**Fix:**
```tsx
// Add mobile card view before the table:
<div className="sm:hidden space-y-3">
  {propertyPnL.map(row => (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="font-medium text-sm">{row.property.name}</p>
        <span className={cn("text-sm font-bold", row.profit >= 0 ? "text-teal-600" : "text-rose-600")}>
          {formatCurrency(row.profit)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
        <div>Revenue: {formatCurrency(row.net)}</div>
        <div>Expenses: {formatCurrency(row.expenses)}</div>
      </div>
    </div>
  ))}
</div>
```

---

### 🔴 Onboarding: Address Form Grid Breaks Layout
**File:** `components/onboarding.tsx:265-275`  
**Issue:** Address fields use `grid-cols-4` which on mobile creates 4 tiny ~70px columns. City input gets crushed, State/Zip are unusable.  
**Fix:**
```tsx
// Change from:
<div className="grid grid-cols-4 gap-3">

// To:
<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
  <div className="col-span-2 sm:col-span-2">
    {/* City - full width on mobile */}
  </div>
  <div className="col-span-1">
    {/* State */}
  </div>
  <div className="col-span-1">
    {/* Zip */}
  </div>
</div>
```

---

## 🟡 HIGH — Bad UX on Mobile, Users Will Struggle

### 🟡 Inbox Page: Edit Form Grid Too Cramped
**File:** `app/dashboard/inbox/page.tsx:135-160`  
**Issue:** InboxCard edit form uses `grid-cols-2 gap-3` without mobile breakpoint. On 375px, each input is ~165px wide. Amount field with $ prefix gets cramped.  
**Fix:**
```tsx
// Change from:
<div className="grid grid-cols-2 gap-3">

// To:
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
```

---

### 🟡 Expenses Page: Filter Row Horizontal Overflow
**File:** `app/dashboard/expenses/page.tsx:175-195`  
**Issue:** Filter row with search + 3 dropdowns uses `flex flex-wrap gap-3`. On mobile, dropdowns don't have `w-full` and sit awkwardly in a partial row. Search is good with `flex-1 min-w-[200px]` but dropdowns are fixed width.  
**Fix:**
```tsx
// Add to each select:
<select className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm w-full sm:w-auto">
```

---

### 🟡 Revenue Page: Filter Row Same Issue
**File:** `app/dashboard/revenue/page.tsx:480-500`  
**Issue:** Same filter row issue as expenses page.  
**Fix:** Same as above - add `w-full sm:w-auto` to select elements.

---

### 🟡 Landing Page: Stats Bar Numbers Cramped
**File:** `app/page.tsx:430-450`  
**Issue:** Stats bar uses `grid-cols-2 md:grid-cols-4`. The `< 30s` and `100%` stats work, but the longer text labels like "Average bill parse time" may wrap awkwardly on small screens.  
**Fix:**
```tsx
// Consider reducing stat label font size on mobile:
<p className="text-xs sm:text-sm text-gray-400 mt-1">{s.label}</p>
```

---

### 🟡 Landing Page: Pricing Cards Vertical Overflow
**File:** `app/page.tsx:180-220`  
**Issue:** Pricing cards in `grid md:grid-cols-3` collapse to single column on mobile (correct), but each card is quite tall (~600px). Users have to scroll extensively. Features list could be collapsed.  
**Fix:**
```tsx
// Consider collapsible features on mobile:
<ul className="space-y-3 mb-8 flex-1">
  {tier.features.slice(0, 4).map(...)}
  <button className="sm:hidden text-xs text-gray-500">
    + {tier.features.length - 4} more features
  </button>
  {/* Show all on larger screens */}
  <span className="hidden sm:block">
    {tier.features.slice(4).map(...)}
  </span>
</ul>
```

---

### 🟡 Tax Page: Export Buttons Row Overflow
**File:** `app/dashboard/tax/page.tsx:95-115`  
**Issue:** Export actions row has 4 buttons (PDF, CSV, TurboTax, Share). Uses `grid grid-cols-2 sm:flex` which works, but button text is hidden on mobile with `hidden sm:inline`. The short labels like "PDF" and "CSV" work, but touch targets stack in 2x2 grid that's usable but cramped.  
**Fix:**
```tsx
// Reduce gap on mobile:
<div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
```

---

### 🟡 Settings Page: Billing Email Box Overflow
**File:** `app/dashboard/settings/page.tsx:90-100`  
**Issue:** Billing email display uses `font-mono` which doesn't wrap well. Email like `bills-abc123xyz@inbound.hostfi.ai` (40+ chars) may overflow the container on 375px.  
**Fix:**
```tsx
// Change from:
<div className="flex-1 px-4 py-3.5 bg-gray-50 ... text-sm font-mono text-center">

// To:
<div className="flex-1 px-2 sm:px-4 py-3 sm:py-3.5 bg-gray-50 ... text-[11px] sm:text-sm font-mono text-center break-all">
```
*Note: Already partially fixed with `break-all`, but font size reduction helps.*

---

### 🟡 Settings Page: Provider Quick Links Grid
**File:** `app/dashboard/settings/page.tsx:165-180`  
**Issue:** Provider quick links use `grid-cols-2 sm:grid-cols-3`. On 375px, each button is ~165px. Works, but "SoCalGas" and "Spectrum" buttons are at the edge of usability.  
**Fix:** Acceptable, but could add `text-[11px] sm:text-xs` to button text for better fit.

---

### 🟡 Billing Page: Plan Cards Description Text
**File:** `app/dashboard/billing/page.tsx:200-280`  
**Issue:** Plan cards in `grid-cols-1 md:grid-cols-3` work well on mobile (single column). However, the feature lists are long and payment fees section takes significant space. Total card height exceeds viewport.  
**Fix:**
```tsx
// Reduce padding on mobile:
<div className="bg-white rounded-xl border p-4 sm:p-6 ...">
```

---

### 🟡 Ask AI Page: Chat Height Calculation
**File:** `app/dashboard/ask/page.tsx:60-70`  
**Issue:** Uses `h-[calc(100vh-8rem)] lg:h-[calc(100vh-5rem)]`. On mobile with bottom nav and browser chrome, this may not account for iOS Safari's dynamic toolbar. Messages area may be cramped.  
**Fix:**
```tsx
// Use dvh units for dynamic viewport height:
<div className="flex flex-col h-[calc(100dvh-8rem)] lg:h-[calc(100dvh-5rem)]">
```

---

### 🟡 Property Detail: Stats Grid Cramped Labels
**File:** `app/dashboard/properties/[id]/page.tsx:100-120`  
**Issue:** Stats row uses `grid-cols-2 sm:grid-cols-4`. Labels like "Net Profit" work, but the 10px font size (`text-[10px]`) combined with uppercase tracking may be hard to read on mobile.  
**Fix:**
```tsx
// Increase readability:
<p className="text-[11px] sm:text-xs font-medium uppercase tracking-wide text-muted-foreground">
```

---

### 🟡 Partners Page: Partner Cards CTA Position
**File:** `app/dashboard/partners/page.tsx:80-100`  
**Issue:** Partner cards are good on mobile (single column in `grid-cols-1 lg:grid-cols-2`), but the "Coming Soon" badge and CTA button may overlap with the icon on very narrow screens when text wraps.  
**Fix:**
```tsx
// Ensure flex-wrap on header:
<div className="flex items-center gap-2 flex-wrap">
```

---

## 🟢 MEDIUM — Minor Visual Issues, Still Usable

### 🟢 Landing Page: Hero Headline Line Length
**File:** `app/page.tsx:290`  
**Issue:** Hero headline "Know Exactly Where Your Money Goes." is ~350px wide. At 375px with 20px padding, it fits but is tight. The typing animation cursor position may cause slight layout shift.  
**Fix:** Already acceptable. Optional: Add `max-w-[calc(100vw-2.5rem)]` to constrain.

---

### 🟢 Landing Page: Feature Cards Icon Size
**File:** `app/page.tsx:520-560`  
**Issue:** Feature cards use `w-10 h-10` for icon containers. On mobile grid, cards are narrower and icons take proportionally more space. Not broken, just slightly unbalanced.  
**Fix:**
```tsx
<div className="w-8 sm:w-10 h-8 sm:h-10 rounded-lg ...">
```

---

### 🟢 Dashboard: Stat Card Trend Text
**File:** `app/dashboard/page.tsx:80-100`  
**Issue:** StatCard trend text like "12% from last month" may wrap awkwardly on the 2-column mobile grid.  
**Fix:**
```tsx
// Add whitespace control:
<span className="text-xs whitespace-nowrap truncate">
```

---

### 🟢 Expenses/Revenue: Pagination Mobile Display
**File:** `app/dashboard/expenses/page.tsx:300-330`  
**Issue:** Mobile pagination shows "Page X of Y" text which is good, but previous/next buttons are 36px (p-2 + w-4 icon). Could be slightly larger for easier tapping.  
**Fix:**
```tsx
// Increase touch target:
<button className="p-2.5 sm:p-2 rounded-lg border ...">
```

---

### 🟢 Blog Page: Article Cards Padding
**File:** `app/blog/page.tsx:50-70`  
**Issue:** Article cards use `p-6` padding uniformly. On mobile, this creates generous whitespace which is fine but slightly spacious.  
**Fix:**
```tsx
<article className="p-4 sm:p-6 bg-white rounded-xl ...">
```

---

### 🟢 Security Page: Section Icon Alignment
**File:** `app/security/page.tsx`  
**Issue:** Section icons use `pl-[30px]` for content indentation. On mobile, this wastes ~8% of screen width on indent.  
**Fix:**
```tsx
<div className="text-gray-600 leading-relaxed pl-0 sm:pl-[30px]">
```

---

### 🟢 Login Page: Form Width
**File:** `app/login/page.tsx:60-80`  
**Issue:** Login form uses `max-w-sm` (384px) which exceeds 375px screen. With page padding, it works but form is constrained. Not broken.  
**Fix:** Already acceptable due to responsive padding.

---

### 🟢 Recurring Expenses: Card Grid Gap
**File:** `app/dashboard/expenses/recurring/page.tsx:150-180`  
**Issue:** Card grid uses `gap-3 sm:gap-5`. The 12px mobile gap is adequate but cards feel dense.  
**Fix:** Acceptable as-is.

---

### 🟢 Modals: Close Button Touch Target
**File:** Multiple modal files  
**Issue:** Modal close buttons use `p-2` (8px padding) around `w-4 h-4` icon = 24px touch target. Below 44px recommendation but workable since button is in corner.  
**Fix:**
```tsx
<button className="p-2.5 hover:bg-gray-100 rounded-lg ...">
```

---

## Summary Table: All Pages Mobile Status

| Page | Status | Primary Issue |
|------|--------|---------------|
| **Public Pages** | | |
| Landing Page | ⚠️ Issues | Stats bar cramped, pricing cards tall |
| Blog Index | ✅ Good | Minor padding |
| Blog Posts | ✅ Good | Readable |
| Compare/Stessa | ❌ Broken | Feature table overflow |
| Compare/Topkey | ❌ Broken | Feature table overflow |
| Compare/Landlord Studio | ❌ Broken | Feature table overflow |
| Security | ✅ Good | Minor indent waste |
| Privacy | ✅ Good | Readable |
| Terms | ✅ Good | Readable |
| Login | ✅ Good | Works well |
| **Dashboard Pages** | | |
| Dashboard Overview | ✅ Good | Stats grid works |
| Expenses | ⚠️ Issues | Filter row overflow |
| Add Expense | ✅ Good | Form works |
| Recurring Expenses | ✅ Good | Cards work |
| Revenue | ❌ Broken | P&L table overflow |
| Properties | ✅ Good | Cards work |
| Property Detail | ⚠️ Issues | Stats labels small |
| Add Property | ✅ Good | Form works |
| Inbox | ⚠️ Issues | Edit form cramped |
| Ask AI | ⚠️ Issues | Height calc, dvh needed |
| Tax | ⚠️ Issues | Export buttons cramped |
| Reports | ✅ Good | Works well |
| Integrations | ✅ Good | Cards work |
| Partners | ✅ Good | Single column works |
| Settings | ⚠️ Issues | Email overflow |
| Billing | ⚠️ Issues | Cards tall |
| **Components** | | |
| Sidebar | ✅ Good | Mobile menu works |
| Onboarding | ❌ Broken | Address grid breaks |
| Edit Expense Modal | ✅ Good | Bottom sheet style |
| Edit Revenue Modal | ✅ Good | Bottom sheet style |
| PMS Modal | ✅ Good | Scrollable |
| Plaid Modal | ✅ Good | Multi-step works |
| Slack Modal | ✅ Good | Works well |

---

## Top 15 Mobile Fixes (Prioritized)

1. **🔴 Compare pages feature table** - Add mobile card alternative
2. **🔴 Revenue P&L table** - Add mobile card alternative  
3. **🔴 Onboarding address grid** - Change to `grid-cols-2 sm:grid-cols-4`
4. **🟡 Inbox edit form grid** - Add `grid-cols-1 sm:grid-cols-2`
5. **🟡 Expenses filter dropdowns** - Add `w-full sm:w-auto`
6. **🟡 Revenue filter dropdowns** - Add `w-full sm:w-auto`
7. **🟡 Settings billing email** - Reduce font size, ensure break-all
8. **🟡 Tax export buttons** - Reduce gap on mobile
9. **🟡 Ask AI height** - Use dvh units
10. **🟡 Landing pricing cards** - Consider collapsible features
11. **🟡 Billing plan cards** - Reduce padding on mobile
12. **🟢 Property detail stats** - Increase label font size
13. **🟢 All modals** - Increase close button touch target
14. **🟢 Pagination buttons** - Slightly larger touch targets
15. **🟢 Blog article cards** - Reduce mobile padding

---

## What's Already Done Well ✅

- **Sidebar**: Proper hamburger menu with overlay and close-on-route-change
- **Tables**: Desktop table / mobile cards pattern throughout
- **Modals**: Bottom-sheet style (`items-end sm:items-center`)
- **Touch targets**: Most buttons have `min-h-[44px]`
- **Typography**: Base font sizes readable (14px minimum)
- **Grids**: Most use `grid-cols-1 sm:grid-cols-2` pattern
- **Buttons**: Text shown/hidden appropriately (`hidden sm:inline`)
- **Forms**: Full-width inputs on mobile
- **Safe areas**: Modals use `safe-area-bottom` for iPhone notch

---

## Testing Recommendations

1. Test on real iPhone SE (375px) - simulator misses some browser chrome issues
2. Test with iOS Safari toolbar in expanded state
3. Test with keyboard open for form fields
4. Check landscape orientation on phones
5. Test with large text accessibility settings enabled

---

*Generated by Friday | February 18, 2026*
