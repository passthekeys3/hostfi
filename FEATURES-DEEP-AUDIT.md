# PropFlow Features Deep Audit

**Date:** February 18, 2026  
**Auditor:** Friday (AI Co-founder)  
**Scope:** Anomaly Detection & Benchmarking Features

---

## Executive Summary

Both features had **working detection engines** but were **disconnected from real user data**. The UI was displaying demo data for all users, and detected anomalies weren't being stored in the database.

### Status After Fixes
- ✅ Anomaly detection now stores results in `anomaly_logs` table
- ✅ Alerts page fetches real anomalies from Supabase
- ✅ Status updates (acknowledge/resolve/dismiss) persist to database
- ✅ Benchmarking calculates real metrics from user expenses
- ✅ Email/Slack alerts continue to work with real data

---

## Part 1: Anomaly Detection

### Detection Engine (`lib/anomaly-detection.ts`) — ✅ SOLID

The detection logic is **well-implemented**:

| Anomaly Type | Detection Method | Threshold |
|-------------|------------------|-----------|
| **Spike** | Current > rolling avg + threshold | 30% default |
| **Possible Leak** | Water-only, high deviation | 50% above avg |
| **Unusual Pattern** | Standard deviation check | 2 std devs |
| **New High** | Exceeds historical max | +15% min |
| **Rate Increase** | (Not automatically detected, manual flag) | - |

**Seasonal Awareness:**
- Uses hardcoded monthly factors (acceptable for v1)
- Summer: Higher electric expected (AC)
- Winter: Higher gas expected (heating)
- Automatically adjusts severity based on seasonal context

### Issue 1: Anomalies Not Stored in Database — ✅ FIXED

**Before:** `/api/alerts/check-expense` detected anomalies but only triggered email/Slack alerts—never stored in `anomaly_logs` table.

**Fix Applied:** Now inserts into `anomaly_logs` with:
- User ID, expense ID, property ID
- Anomaly type, severity, deviation %
- Current/expected amounts
- Message and recommendation
- Status = 'new'

### Issue 2: Dashboard Hook Returned Empty Array — ✅ FIXED

**Before:** `useDashboardData()` returned `anomalies: []` for real users.

**Fix Applied:** Now queries `anomaly_logs` table and transforms to `AnomalyResult` format with property names resolved.

### Issue 3: Alerts Page Used Demo Data — ✅ FIXED

**Before:** 
```typescript
const [anomalies, setAnomalies] = useState(demo ? DEMO_ANOMALIES : []);
// Real users got empty array!
```

**Fix Applied:** Now uses `useDashboardData()` hook which fetches from Supabase.

### Issue 4: Status Updates Not Persisted — ✅ FIXED

**Before:** `updateAnomalyStatus()` and `dismissAnomaly()` only updated local React state.

**Fix Applied:** Now calls Supabase to update `anomaly_logs.status` and `resolved_at` timestamp.

### Alert Delivery — ✅ WORKING

| Channel | Implementation | Status |
|---------|---------------|--------|
| **Email** | Postmark API via `/api/alerts/send` | ✅ Real data |
| **Slack** | User's configured channel via `sendSlackAlert` | ✅ Real data |
| **Preferences** | Respects `alert_preferences` table | ✅ Working |

---

## Part 2: Benchmarking

### Calculation Engine (`lib/benchmarking.ts`) — ✅ SOLID

The benchmarking logic is **well-implemented**:

| Calculation | Method |
|-------------|--------|
| **Property Benchmarks** | Monthly avg per utility type |
| **Trending** | Compare last 3 months vs first 3 months |
| **Portfolio Avg** | Mean across all properties |
| **Efficiency Rank** | Sort by cost (1 = lowest = best) |
| **Insights** | AI-generated from outliers, savings opportunities, trends |

### Issue 5: Benchmarking Showed Empty State for Real Users — ✅ FIXED

**Before:**
```typescript
if (!demo) {
  return <div>Add at least 2 properties...</div>;
}
// ALL real users saw empty state!
const summary = DEMO_PORTFOLIO_SUMMARY; // Always demo data
```

**Fix Applied:** 
- Now uses `useDashboardData()` to fetch real expenses
- Transforms expenses to `MonthlyBill` format
- Calls `calculateBenchmarks()` with real data
- Shows appropriate empty states only when data is truly missing

### Data Transformation

Real expenses are converted to `MonthlyBill` format:
```typescript
// Group by month + property + category
expenses → {
  month: "2026-02",
  monthLabel: "Feb 26",
  property_id: "uuid",
  property_name: "Venice Beach Unit",
  utility_type: "electric",
  amount: 142.50
}
```

### Visualizations — ✅ WORKING WITH REAL DATA

All 7 chart types now render real computed data:
1. ✅ **Bar Chart** — Monthly avg by utility type
2. ✅ **Radar Chart** — Efficiency comparison
3. ✅ **Heatmap Table** — Cost matrix with color coding
4. ✅ **Cost per Bedroom** — Normalized efficiency
5. ✅ **Line Chart** — Monthly spend trends
6. ✅ **Insights Panel** — AI-generated from real data
7. ✅ **Portfolio Summary Cards** — Most/least efficient

### Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| 0 properties | Shows "Add properties" message |
| 1 property | Shows "Add at least 2 properties" message |
| 0 expenses | Shows "Add expenses" message |
| Loading | Shows spinner |

---

## Database Schema Verification

### `anomaly_logs` Table — ✅ EXISTS

```sql
CREATE TABLE public.anomaly_logs (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),
  expense_id uuid REFERENCES expenses(id),
  property_id uuid REFERENCES properties(id),
  anomaly_type text NOT NULL,  -- spike, unusual_pattern, possible_leak, rate_increase, new_high
  severity text NOT NULL,      -- low, medium, high, critical
  utility_type text,
  current_amount decimal(10,2),
  expected_amount decimal(10,2),
  deviation_percent decimal(5,2),
  message text NOT NULL,
  recommendation text,
  seasonal_context text,
  status text DEFAULT 'new',   -- new, acknowledged, resolved, dismissed
  created_at timestamptz,
  resolved_at timestamptz
);
```

### RLS Policies — ✅ CONFIGURED

- Users can SELECT their own anomaly logs
- Users can INSERT their own anomaly logs
- Users can UPDATE their own anomaly logs

---

## Files Modified

1. `/src/app/api/alerts/check-expense/route.ts` — Store anomalies in DB
2. `/src/hooks/useDashboardData.ts` — Fetch anomalies from Supabase
3. `/src/app/dashboard/alerts/page.tsx` — Use real data, persist status changes
4. `/src/components/benchmarking-content.tsx` — Calculate from real expenses

---

## Remaining Considerations

### Not Issues (By Design)
- **Seasonal factors are hardcoded** — Acceptable for v1, learning-based can come later
- **Industry benchmarks not implemented** — Currently compares against user's own portfolio
- **Rate increase detection** — Requires tracking provider rates, not automated

### Future Enhancements
- Add scheduled cron job to detect anomalies in historical data
- Implement cross-user anonymized benchmarks (with consent)
- Add ML-based anomaly detection for irregular patterns
- Push notifications (currently email/Slack only)

---

## Verification

```bash
✓ Build passes: npx next build
✓ TypeScript compiles without errors
✓ All API routes functional
```
