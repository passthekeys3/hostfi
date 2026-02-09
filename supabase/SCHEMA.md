# HostFi Database Schema

## Migration History

| Migration | File | Description |
|-----------|------|-------------|
| 001 | `001_initial_schema.sql` | Profiles, properties, utility accounts, bills, bill mappings |
| 002 | `002_expenses_and_features.sql` | Expenses, recurring expenses, receipts, anomaly logs, alert preferences, profile extensions |

## Tables

### profiles
User profiles extending Supabase Auth. Primary identity table.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | References `auth.users` |
| email | text | |
| full_name | text | |
| billing_email | text (unique) | For email bill parsing |
| onboarding_completed | boolean | Default false |
| onboarding_step | integer | Default 0 |
| plan | text | 'free', 'pro', 'business' |
| properties_limit | integer | Default 3 |
| created_at, updated_at | timestamptz | |

### properties
Rental properties managed by the user.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| user_id | uuid (FK → profiles) | Cascade delete |
| name, address fields | text | |
| property_type | text | 'str', 'ltr', 'primary' |
| status | text | 'active', 'inactive' |

### utility_accounts
Utility provider accounts linked to properties.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| property_id | uuid (FK → properties) | Cascade delete |
| user_id | uuid (FK → profiles) | Cascade delete |
| provider_name | text | |
| utility_type | text | electric, gas, water, internet, etc. |
| autopay | boolean | |

### expenses ⭐ (new in 002)
Central expense tracking table. Extends/replaces the bills concept.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| user_id | uuid (FK → profiles) | Cascade delete |
| property_id | uuid (FK → properties) | Cascade delete |
| category | text | 11 categories (utility, cleaning, insurance, etc.) |
| amount | decimal(10,2) | |
| date | date | |
| frequency | text | one-time, per-turnover, weekly, monthly, quarterly, semi-annual, annual |
| is_recurring | boolean | |
| recurring_expense_id | uuid (FK → recurring_expenses) | Set null on delete |
| source | text | manual, email_parse, recurring_auto, receipt_scan |
| status | text | pending, paid, overdue, scheduled |
| utility_account_id | uuid (FK → utility_accounts) | For email-parsed utility bills |
| billing_period_start/end | date | |
| due_date | date | |
| confidence_score | decimal(3,2) | For AI-parsed entries |

### recurring_expenses ⭐ (new in 002)
Templates for auto-generated recurring expenses.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| user_id | uuid (FK → profiles) | Cascade delete |
| property_id | uuid (FK → properties) | Cascade delete |
| category, description, vendor | text | |
| amount | decimal(10,2) | |
| frequency | text | Not 'one-time' |
| is_active | boolean | |
| next_due_date | date | |
| last_generated_date | date | |

### receipts ⭐ (new in 002)
Uploaded receipt images with AI-parsed data.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| expense_id | uuid (FK → expenses) | Cascade delete |
| user_id | uuid (FK → profiles) | Cascade delete |
| file_url, file_name, file_type | text | |
| parsed_* fields | various | AI-extracted vendor, amount, date, category, items, tax |
| confidence | decimal(3,2) | |

### anomaly_logs ⭐ (new in 002)
Detected cost anomalies for alerting users.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| user_id | uuid (FK → profiles) | Cascade delete |
| expense_id | uuid (FK → expenses) | |
| property_id | uuid (FK → properties) | |
| anomaly_type | text | spike, unusual_pattern, possible_leak, rate_increase, new_high |
| severity | text | low, medium, high, critical |
| status | text | new, acknowledged, resolved, dismissed |

### alert_preferences ⭐ (new in 002)
Per-user notification settings. One row per user (unique constraint on user_id).

| Column | Type | Notes |
|--------|------|-------|
| user_id | uuid (FK → profiles, unique) | Cascade delete |
| due_soon_enabled/days | bool/int | |
| overdue_enabled | boolean | |
| unusual_amount_enabled/threshold | bool/int | Threshold as percentage |
| missing_bill_enabled | boolean | |
| new_parsed_enabled | boolean | |
| email/push_notifications | boolean | |

### bills (legacy)
Original parsed bills table. Kept for backward compatibility; new features use `expenses`.

### bill_mappings (legacy)
Sender-to-property mapping rules for email parsing.

## Relationships (ERD)

```
profiles (1) ──< properties (many)
profiles (1) ──< utility_accounts (many)
profiles (1) ──< expenses (many)
profiles (1) ──< recurring_expenses (many)
profiles (1) ──< receipts (many)
profiles (1) ──< anomaly_logs (many)
profiles (1) ──1 alert_preferences

properties (1) ──< utility_accounts (many)
properties (1) ──< expenses (many)
properties (1) ──< recurring_expenses (many)
properties (1) ──< anomaly_logs (many)

recurring_expenses (1) ──< expenses (many, via recurring_expense_id)
expenses (1) ──< receipts (many)
expenses (1) ──< anomaly_logs (many)
utility_accounts (1) ──< expenses (many, for utility-type expenses)
```

## RLS Policy Summary

All tables have RLS enabled. Every table with a `user_id` column enforces:
- **SELECT**: `auth.uid() = user_id`
- **INSERT**: `auth.uid() = user_id` (WITH CHECK)
- **UPDATE**: `auth.uid() = user_id`
- **DELETE**: `auth.uid() = user_id` (except alert_preferences and anomaly_logs which don't need delete)

`profiles` uses `auth.uid() = id` (since id = auth user id).

## Index Strategy

- **Foreign keys**: All `user_id` and `property_id` columns indexed for fast joins
- **Query patterns**: `expenses.date`, `expenses.category`, `expenses.status` indexed for filtering
- **Partial index**: `recurring_expenses.next_due_date WHERE is_active = true` for scheduled job queries
- **Anomaly dashboard**: `anomaly_logs.status` indexed for filtering active anomalies

## Triggers

`update_updated_at()` trigger on: expenses, recurring_expenses, profiles, properties, alert_preferences.
Automatically sets `updated_at = now()` on any UPDATE.
