# HostFi — Deployment Guide

## Quick Start (Demo Mode)

The app works out of the box in demo mode — no env vars needed. Just deploy to Vercel and go.

---

## Full Setup (Production)

### 1. Supabase

1. Go to [supabase.com](https://supabase.com) → New Project
2. Pick a name (e.g. `hostfi-prod`), set a database password, choose region
3. Once created, go to **SQL Editor → New Query**
4. Paste the contents of `supabase/migrations/000_full_schema.sql` and run it
5. Go to **Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Go to **Authentication → Providers** and enable:
   - **Email** (enabled by default)
   - **Apple** (requires Apple Developer account — see [Supabase docs](https://supabase.com/docs/guides/auth/social-login/auth-apple))

### 2. Stripe

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Create two products:
   - **HostFi Pro** — $15/month, $144/year
   - **HostFi Business** — $49/month, $468/year
3. For each product, create monthly + annual prices
4. Copy the 4 price IDs:
   - `STRIPE_PRO_MONTHLY_PRICE_ID`
   - `STRIPE_PRO_ANNUAL_PRICE_ID`
   - `STRIPE_BUSINESS_MONTHLY_PRICE_ID`
   - `STRIPE_BUSINESS_ANNUAL_PRICE_ID`
5. Go to **Developers → API Keys** → copy **Secret key** → `STRIPE_SECRET_KEY`
6. Go to **Developers → Webhooks** → Add endpoint:
   - URL: `https://hostfi.ai/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
   - Copy signing secret → `STRIPE_WEBHOOK_SECRET`

### 3. Anthropic (AI Features)

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an API key → `ANTHROPIC_API_KEY`
3. This powers: Ask AI, receipt scanning, bill parsing

### 4. Webhook Secret

Generate a random string for `WEBHOOK_SECRET`:

```bash
openssl rand -hex 32
```

This secures the inbound email parsing webhook.

### 5. Vercel Environment Variables

Go to your Vercel project → **Settings → Environment Variables** and add:

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | From Supabase Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | From Supabase Settings → API |
| `ANTHROPIC_API_KEY` | For AI features | Falls back to demo mode without it |
| `WEBHOOK_SECRET` | For email parsing | Required when `NODE_ENV=production` |
| `STRIPE_SECRET_KEY` | For billing | Falls back to demo mode without it |
| `STRIPE_WEBHOOK_SECRET` | For billing | Required for webhook verification |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | For billing | Stripe price ID |
| `STRIPE_PRO_ANNUAL_PRICE_ID` | For billing | Stripe price ID |
| `STRIPE_BUSINESS_MONTHLY_PRICE_ID` | For billing | Stripe price ID |
| `STRIPE_BUSINESS_ANNUAL_PRICE_ID` | For billing | Stripe price ID |

### 6. Custom Domain (hostfi.ai)

1. In Vercel → **Settings → Domains** → Add `hostfi.ai`
2. Vercel will show you DNS records to add at your registrar
3. Typically: `A` record → `76.76.21.21` and `CNAME` for `www` → `cname.vercel-dns.com`
4. SSL is automatic

---

## Architecture Notes

- **Demo mode**: When `NEXT_PUBLIC_SUPABASE_URL` is not set, the app uses `src/lib/data/demo-data.ts`
- **Auth**: All API routes use `src/lib/auth.ts` → `authenticateRequest()`. Returns demo user when Supabase is not configured
- **Rate limiting**: In-memory (`src/lib/rate-limit.ts`). Swap to Upstash Redis for production scale
- **Email parsing**: Needs SendGrid Inbound Parse or Postmark webhook pointing to `/api/parse-email`

---

## Useful Commands

```bash
npm run dev          # Local dev server
npm run build        # Production build
npm run test         # Run test suite (42 tests)
npm run test:watch   # Watch mode
```
