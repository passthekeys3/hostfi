# HostFi + OwnerRez Integration

[HostFi](https://hostfi.ai) is an AI-powered expense management platform built specifically for short-term rental operators. HostFi automatically tracks, categorizes, and analyzes property expenses, generates tax-ready reports (Schedule E), and provides real-time financial insights across your entire portfolio.

By connecting OwnerRez, your properties and booking revenue sync automatically into HostFi, giving you a complete financial picture -- revenue alongside expenses -- without manual data entry.

## Steps for Integration

### Option A: OAuth (Recommended)

1. Log in to your HostFi account at [hostfi.ai](https://hostfi.ai).
2. Navigate to **Dashboard > Integrations**.
3. Find **OwnerRez** and click **Connect**.
4. You'll be redirected to OwnerRez to authorize HostFi.
5. After authorization, your properties and bookings sync automatically.

### Option B: API Key (Legacy)

1. Log in to your HostFi account at [hostfi.ai](https://hostfi.ai).
2. Navigate to **Dashboard > Integrations**.
3. Find **OwnerRez** and click **Connect**.
4. Enter your OwnerRez account email and API token (found under OwnerRez > Settings > API Access).
5. Click **Connect** -- HostFi will verify your credentials and begin syncing.

After connecting, you'll be prompted to select which OwnerRez properties to track in HostFi.

**Note:** HostFi's integration features require a Pro plan ($15/month) or higher.

## What Data is Synced

### From OwnerRez to HostFi

| Data Type | Details |
|-----------|---------|
| **Properties** | Name, address, bedrooms, bathrooms, active status |
| **Bookings (as Revenue)** | Total amount, check-in/check-out dates, guest name, booking channel (Airbnb, VRBO, Booking.com, Direct, etc.), confirmation code |

### Sync Behavior

- **Initial sync**: All properties and bookings from the past 2 years are imported.
- **Ongoing sync**: Daily automatic sync via scheduled job (runs at 12:00 PM UTC).
- **Real-time sync**: Webhooks provide instant updates when bookings or properties are created, updated, or deleted in OwnerRez.

### How Revenue is Mapped

- Booking channel is auto-detected (Airbnb, VRBO, Booking.com, Direct, Other).
- Check-in date is used as the revenue date.
- Guest name and confirmation code are preserved for reference.
- Duplicate bookings are detected and deduplicated by OwnerRez booking ID.

### How Properties are Mapped

- Property name, full address, bedroom/bathroom count, and active status are synced.
- Properties deleted in OwnerRez are marked inactive in HostFi (not deleted), preserving historical data.
- New properties from OwnerRez respect the user's plan property limit.

## Webhooks

HostFi uses webhooks for real-time sync. The webhook endpoint is:

```
https://hostfi.ai/api/integrations/ownerrez/webhook
```

**Authentication:** HTTP Basic Auth

**Events handled:**

| Event | Action |
|-------|--------|
| `entity_create` + `booking` | Creates a new revenue entry |
| `entity_update` + `booking` | Updates the existing revenue entry |
| `entity_delete` + `booking` | Removes the revenue entry |
| `entity_create` + `property` | Adds the property (if within plan limits) |
| `entity_update` + `property` | Updates property details |
| `entity_delete` + `property` | Marks property as inactive |
| `application_authorization_revoked` | Disconnects the integration |
| `webhook_test` | Returns success acknowledgment |

## Disconnecting

Users can disconnect OwnerRez from **Dashboard > Integrations > OwnerRez > Disconnect**. Disconnecting:
- Clears stored credentials
- Marks the connection as inactive
- **Preserves all synced properties and revenue data** (nothing is deleted)

Users can reconnect at any time, and HostFi will resume syncing.

## Test Credentials

**HostFi Test Account:**
- URL: https://hostfi.ai
- Email: `ownerrez-testing@hostfi.ai`
- Password: `OwnerRez-Test-2026!`

**Webhook Configuration:**
- Endpoint: `https://hostfi.ai/api/integrations/ownerrez/webhook`
- Auth Type: HTTP Basic
- Username: `hostfi`
- Password: `ece95a32d874a3b33ce86713ba0b2856`

## Support

For any questions about the integration, contact us at kevin@hostfi.ai.
