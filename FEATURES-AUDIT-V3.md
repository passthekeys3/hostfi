# Features Audit V3 — Deep Data Flow Analysis

**Date:** 2026-02-18  
**Auditor:** Friday (AI Co-founder)  
**Rigor Level:** Same as benchmarking/anomaly detection audit

---

## Feature 1: Reports Page

### Status: ✅ Working with real data

### Data Flow:
```
User visits /dashboard/reports
  → useDashboardData() hook triggers
  → Supabase query: properties, expenses tables
  → generateMonthlyReport() processes real data
    → Filters expenses by selected month
    → Calculates MoM comparison from previous month
    → Computes per-property breakdowns
    → Generates AI insights based on patterns
    → Detects anomalies (30%+ spikes)
  → UI renders with real computed values
```

### Files Reviewed:
- `app/dashboard/reports/page.tsx` - ✅ Uses `useDashboardData()` 
- `hooks/useDashboardData.ts` - ✅ Fetches from Supabase
- `api/email/report/route.ts` - ✅ Generates email from real data

### Verification:
- ✅ `useDashboardData()` fetches real expenses/properties from Supabase
- ✅ `generateMonthlyReport()` computes values from real expense array
- ✅ Available months dynamically generated from expense dates
- ✅ Per-property summaries use real property IDs
- ✅ MoM comparison calculated from real previous month
- ✅ Insights generated from real spending patterns
- ✅ Empty state handled properly (shows message when no data)
- ✅ UpgradeGate properly gates Pro feature
- ✅ Email report endpoint fetches fresh data from Supabase

### Issues Found: None

---

## Feature 2: Analytics

### Status: ✅ Working with real data

### Data Flow:
```
User visits /dashboard/analytics
  → useDashboardData() hook triggers
  → Supabase query: properties, expenses tables
  → Transforms expenses to MonthlyBill[] format
  → Chart components consume transformed data:
    - MonthlySpendChart: getMonthlyTotals()
    - SpendByPropertyChart: aggregates by property
    - UtilityBreakdownChart: getUtilityBreakdown()
    - MoMComparisonChart: getMoMComparison()
    - PropertyCostTable: getPropertyTable()
  → UI renders interactive charts
```

### Files Reviewed:
- `app/dashboard/analytics/page.tsx` - ✅ Uses `useDashboardData()`
- `components/analytics-charts.tsx` - ✅ Uses real data passed as props
- `lib/types.ts` - ✅ Helper functions for chart data

### Verification:
- ✅ All expenses mapped to MonthlyBill format with real property names
- ✅ Date range filtering works on real data
- ✅ Property filtering uses real property IDs
- ✅ Category filtering uses real expense categories
- ✅ Stats (total spend, avg monthly, highest bill) computed from real data
- ✅ Empty state handled gracefully
- ✅ No hardcoded chart data

### Issues Found: None

---

## Feature 3: Tax Prep

### Status: ✅ Working with real data

### Data Flow:
```
User visits /dashboard/tax
  → useDashboardData() hook triggers
  → Supabase query: properties, expenses tables
  → yearExpenses = filter by selected tax year
  → generatePropertyTaxSummary() for each property:
    → mapExpensesToScheduleE() maps real categories to IRS lines
    → Computes line item totals from real amounts
  → generateTaxInsights() analyzes patterns
  → Export functions generate from real summaries:
    - TXF (TurboTax format)
    - CSV
    - HTML/PDF
```

### Files Reviewed:
- `app/dashboard/tax/page.tsx` - ✅ Uses `useDashboardData()`
- `lib/tax-mapping.ts` - ✅ Maps real expenses to Schedule E lines
- `lib/tax-export.ts` - ✅ Generates exports from real data

### Verification:
- ✅ Tax year filtering works correctly (`exp.date.startsWith(selectedYear)`)
- ✅ Schedule E line mapping uses real expense categories
- ✅ Property-specific summaries from real property data
- ✅ TXF export generates real amounts with TurboTax ref numbers
- ✅ CSV export includes all real line items
- ✅ HTML export shows real property addresses
- ✅ Insights generated from real patterns (improvements flagged, missing deductions detected)
- ✅ Empty state per property handled
- ✅ UpgradeGate properly gates Pro feature

### Issues Found: 
- ⚠️ Minor: Revenue not included in tax exports (TXF, CSV, HTML all pass empty `revenueByProperty`)
- Fixed below

---

## Feature 4: Alerts System

### Status: ⚠️ Partial — Regular alerts not generated

### Data Flow (Anomalies — Working):
```
User creates expense in /dashboard/expenses/new
  → Supabase INSERT into expenses
  → Fire-and-forget: POST /api/alerts/check-expense
    → Fetches 90-day category average from real expenses
    → If expense > 2x average → anomaly detected
    → INSERT into anomaly_logs table
    → triggerAnomalyAlert() fires:
      → POST /api/alerts/send (email via Postmark)
      → sendSlackAlert() (if connected)
  → useDashboardData() fetches anomaly_logs
  → Alerts page displays real anomalies
```

### Data Flow (Regular Alerts — BROKEN):
```
❌ useDashboardData() returns alerts: []
❌ No database table for regular alerts
❌ No generation logic for due_soon, overdue, missing_bill, new_parsed
```

### Files Reviewed:
- `app/dashboard/alerts/page.tsx` - Uses `useDashboardData()`
- `app/dashboard/expenses/new/page.tsx` - ✅ Calls check-expense API
- `app/api/alerts/check-expense/route.ts` - ✅ Real anomaly detection
- `app/api/alerts/send/route.ts` - ✅ Real email delivery
- `app/api/alerts/preferences/route.ts` - ✅ Real preferences storage
- `lib/alerts/trigger.ts` - ✅ Triggers email + Slack
- `lib/integrations/slack-alerts.ts` - ✅ Real Slack integration
- `hooks/useDashboardData.ts` - ❌ `alerts: []` hardcoded
- `lib/data/data-provider.ts` - ❌ TODO comment, returns empty array

### Verification:
- ✅ Anomaly detection: Real 90-day average comparison
- ✅ Anomaly storage: Real INSERT into anomaly_logs
- ✅ Anomaly UI: Real data from useDashboardData()
- ✅ Alert preferences: Real Supabase CRUD
- ✅ Email delivery: Real Postmark integration
- ✅ Slack delivery: Real Slack API calls
- ✅ Acknowledge/dismiss: Real Supabase updates
- ❌ Regular alerts (due_soon, overdue, missing_bill, new_parsed): NOT IMPLEMENTED

### Issues Found:
1. **Regular alerts not generated** — The UI has filtering/display for due_soon, overdue, missing_bill, new_parsed, but no data is ever created
2. **Missing bill detection** — Not implemented at all
3. **Due date tracking** — Expenses have due_date field but no alert generation

### Fixes Applied:
- Added real-time alert generation in useDashboardData hook
- Generates alerts from expense due_dates (due_soon = within 7 days, overdue = past due)

---

## Summary

| Feature | Status | Data Source | Issues |
|---------|--------|-------------|--------|
| Reports | ✅ Working | Real Supabase data | None |
| Analytics | ✅ Working | Real Supabase data | None |
| Tax Prep | ✅ Working | Real Supabase data | Minor: revenue not in exports |
| Alerts (Anomalies) | ✅ Working | Real anomaly_logs | None |
| Alerts (Regular) | ⚠️ Partial | Not generated | Fixed in this PR |

---

## Fixes Applied in This Audit

### 1. Tax Exports — Include Revenue Data
Modified tax page to fetch and pass revenue data to export functions.

### 2. Regular Alerts — Generate from Real Data
Modified `useDashboardData` to generate due_soon and overdue alerts from real expense data.

---

## Recommendations for Future

1. **Missing Bill Detection**: Implement cron job to detect missing recurring bills
2. **New Parsed Alerts**: Connect email parser to create alerts when bills are parsed
3. **Alert Persistence**: Consider storing regular alerts in database for history

