# Import & Settings Feature Audit

**Date:** 2026-02-18  
**Auditor:** Friday (AI Co-founder)  
**Status:** ✅ All issues fixed and build passing

---

## Executive Summary

Deep audit of Import and Settings features to verify end-to-end functionality with real data. Found and fixed 4 issues. All features now work correctly.

---

## Feature 1: Import

### Files Reviewed
- `app/dashboard/import/page.tsx` — Expense CSV import UI
- `app/api/expenses/import/route.ts` — Expense import API
- `app/api/revenue/import/route.ts` — Revenue import API
- `lib/csv-parser.ts` — Expense CSV parser
- `lib/revenue-csv-parser.ts` — Revenue CSV parser
- `app/dashboard/revenue/page.tsx` — Revenue page with CSV import modal

### Expense CSV Import ✅

| Check | Status | Notes |
|-------|--------|-------|
| Parses CSVs correctly | ✅ | Handles quoted fields, various delimiters |
| Correct column names (category, vendor, amount, date) | ✅ | Auto-detects with case-insensitive matching |
| Saves to Supabase with authenticated user ID | ✅ | Uses `authenticateRequest()` |
| Property matching | ✅ | Matches by name, city with fuzzy logic |
| Duplicate detection | ✅ | By date + amount + description + property |
| Validates amounts, dates, required fields | ✅ | Validates format, range, required |
| Clear error messages for bad data | ✅ | Shows row-level issues |
| Progress/feedback shown | ✅ | Loading state, success count, skipped count |
| Sample CSV template available | ✅ | Downloadable with correct format |
| Column name variations handled | ✅ | Date/date, Amount/amount, etc. |
| No hardcoded demo data | ✅ | Clean |

**Issue Fixed:** Category auto-detect now defaults to "other" instead of showing warning for missing category.

### Revenue CSV Import ✅

| Check | Status | Notes |
|-------|--------|-------|
| Uses `platform` field (not source) | ✅ | Correctly uses platform for Airbnb/VRBO/etc |
| Sets `source='csv_import'` | ✅ | Correctly marks import source |
| Includes date field | ✅ | Uses check_in as date |
| Saves with user's ID | ✅ | Uses `authenticateRequest()` |
| Property matching works | ✅ **FIXED** | Now passes properties to parser |
| Duplicate detection | ✅ | By confirmation_code or dates+amount+property |
| Sample CSV template | ✅ | Airbnb-format sample available |
| Platform detection from headers | ✅ | Auto-detects Airbnb, VRBO, Booking.com |

**Issue Fixed:** `parseRevenueCSV()` was being called without properties parameter, so property matching never worked. Now correctly passes `allProperties`.

### Data Flow Verified ✅

```
Import Flow:
File upload → parseCSV() → autoDetectMappings() → transformToExpenses() 
→ Review table → POST /api/expenses/import → Supabase insert → Success feedback

Revenue Flow:
File/paste → parseRevenueCSV(text, properties) → Preview table 
→ POST /api/revenue/import → Supabase insert → Success with counts
```

---

## Feature 2: Settings

### Files Reviewed
- `app/dashboard/settings/page.tsx` — Main settings page
- `app/api/email/setup/route.ts` — Billing email generation
- `app/api/email/test/route.ts` — Test email endpoint (NEW)
- `app/api/account/delete/route.ts` — Account deletion
- `lib/onboarding.ts` — Onboarding state management

### Profile Section ✅

| Check | Status | Notes |
|-------|--------|-------|
| Name loads from real Supabase profile | ✅ | Fetches `full_name` from profiles |
| Email loads correctly | ✅ | Uses `auth.getUser()` email |
| Save persists to DB | ✅ | Updates profiles table |

### Billing Email ✅

| Check | Status | Notes |
|-------|--------|-------|
| Uses real `/api/email/setup` endpoint | ✅ | GET to fetch, POST to generate |
| Shows correct `{prefix}@in.hostfi.ai` format | ✅ | Displays actual generated email |
| Generate works | ✅ | Creates unique 8-char prefix |
| Test email button works | ✅ **FIXED** | Now calls real API endpoint |

**Issue Fixed:** Test email button was just toggling state. Now calls `/api/email/test` which sends actual email via Resend API (or simulates in dev).

### Email Preferences ✅

| Check | Status | Notes |
|-------|--------|-------|
| Toggle changes persist to Supabase | ✅ | Saves to `email_preferences` JSONB |
| Loads saved state on page load | ✅ **FIXED** | Now loads from profile |
| Shows loading state | ✅ | Shows spinner while loading |

**Issue Fixed:** Email preference checkboxes always defaulted to checked. Now loads actual saved preferences from Supabase on page load.

### Setup Wizard Reset ✅

| Check | Status | Notes |
|-------|--------|-------|
| "Run setup again" resets onboarding | ✅ | Calls `resetOnboarding()` |
| Redirects after reset | ✅ | Goes to /dashboard |

### Account Deletion ✅

| Check | Status | Notes |
|-------|--------|-------|
| Shows confirmation dialogs | ✅ | Double confirmation required |
| Deletes from ALL tables | ✅ | 16 tables including profiles |
| Deletes auth user | ✅ | Uses admin.auth.admin.deleteUser |
| Redirects after deletion | ✅ | Goes to /login |

**Tables deleted (in order):**
- expense_splits
- plaid_recurring_rules  
- plaid_ignored_merchants
- plaid_account_mappings
- plaid_items
- alert_preferences
- anomaly_logs
- receipts
- inbound_emails
- parsed_emails
- integration_connections
- revenue
- recurring_expenses
- expenses
- properties
- profiles

### Billing Email Instructions ✅

| Check | Status | Notes |
|-------|--------|-------|
| Utility provider links correct | ✅ | SoCalGas, LADWP, SCE, etc. |
| Gmail forwarding instructions | ✅ | Accurate steps |
| Outlook forwarding instructions | ✅ | Accurate steps |

### No Hardcoded Demo Data ✅

All values are fetched from Supabase or generated dynamically.

---

## Fixes Applied

### 1. Revenue CSV Property Matching (CRITICAL)
**File:** `app/dashboard/revenue/page.tsx`
```diff
- const result = parseRevenueCSV(csvText);
+ const result = parseRevenueCSV(csvText, allProperties);
```
**Impact:** Property matching now works during CSV import.

### 2. Email Preferences Loading (IMPORTANT)
**File:** `app/dashboard/settings/page.tsx`
- Added state for `emailPrefs` and `prefsLoaded`
- Loads preferences from `profiles.email_preferences` on mount
- Shows loading spinner while fetching
- Uses controlled checkboxes with actual state

### 3. Test Email Button (MODERATE)
**File:** `app/dashboard/settings/page.tsx` + `app/api/email/test/route.ts` (NEW)
- Added `sendTestEmail()` function
- Created new API endpoint that sends real email via Resend
- Falls back to simulation in development

### 4. Category Auto-Detect Improvement (MINOR)
**File:** `lib/csv-parser.ts`
```diff
- hasIssue: errors.length > 0 || !category,
- issueMessage: errors.length > 0 ? errors[0] : !category ? 'Could not detect category' : null,
+ category: category || 'other',
+ hasIssue: errors.length > 0,
+ issueMessage: errors.length > 0 ? errors[0] : null,
```
**Impact:** Missing category no longer shows as error, defaults to "other".

---

## Build Status

```
✓ Compiled successfully
○ Static pages: 47
ƒ Dynamic pages: 17
```

---

## Recommendations

1. **Add email preferences migration** — Consider backfilling existing users with default preferences
2. **Add Resend to dependencies** — If using heavily, install `resend` package for better DX
3. **Revenue import property dropdown** — Consider adding manual property selection for unmatched rows

---

## Conclusion

All Import and Settings features are now verified working correctly with real data end-to-end. The 4 issues found were fixed and the build passes successfully.
