import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { importJWK, jwtVerify } from 'jose';

/**
 * POST /api/integrations/plaid/webhook
 * Handle Plaid webhook events:
 * - TRANSACTIONS.SYNC_UPDATES_AVAILABLE
 * - TRANSACTIONS.DEFAULT_UPDATE / INITIAL_UPDATE / HISTORICAL_UPDATE
 * - ITEM.ERROR / PENDING_EXPIRATION / PENDING_DISCONNECT / USER_PERMISSION_REVOKED
 */
export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();
    const body = JSON.parse(bodyText);
    const { webhook_type, webhook_code, item_id, error: plaidError } = body;

    // Verify webhook signature in production
    if (process.env.PLAID_ENV === 'production') {
      const isValid = await verifyWebhook(request, bodyText);
      if (!isValid) {
        console.error('Plaid webhook: Invalid signature');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.info(`Plaid webhook: ${webhook_type}/${webhook_code} for item ${item_id}`);

    const supabase = getAdminClient();
    if (!supabase) {
      console.error('Plaid webhook: Database not configured');
      return NextResponse.json({ received: true });
    }

    switch (webhook_type) {
      case 'TRANSACTIONS': {
        await handleTransactionWebhook(supabase, webhook_code, item_id);
        break;
      }
      case 'ITEM': {
        await handleItemWebhook(supabase, webhook_code, item_id, plaidError);
        break;
      }
      default:
        console.info(`Unhandled Plaid webhook type: ${webhook_type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Plaid webhook error:', error);
    return NextResponse.json({ received: true });
  }
}

/**
 * Verify Plaid webhook using their JWT verification flow:
 * 1. Extract kid from JWT header
 * 2. Fetch the verification key from Plaid API using client credentials
 * 3. Verify JWT signature
 * 4. Compare body SHA-256 hash to claim
 * https://plaid.com/docs/api/webhooks/webhook-verification/
 */

// Cache verification keys by kid (they rotate infrequently)
const keyCache = new Map<string, { key: any; fetchedAt: number }>();
const KEY_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

async function fetchVerificationKey(kid: string) {
  const cached = keyCache.get(kid);
  if (cached && Date.now() - cached.fetchedAt < KEY_CACHE_TTL) {
    return cached.key;
  }

  const env = process.env.PLAID_ENV || 'sandbox';
  const baseUrl = env === 'production'
    ? 'https://production.plaid.com'
    : env === 'development'
      ? 'https://development.plaid.com'
      : 'https://sandbox.plaid.com';

  const res = await fetch(`${baseUrl}/webhook_verification_key/get`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.PLAID_CLIENT_ID,
      secret: process.env.PLAID_SECRET,
      key_id: kid,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Plaid verification key: ${res.status}`);
  }

  const data = await res.json();
  const jwk = data.key;

  keyCache.set(kid, { key: jwk, fetchedAt: Date.now() });
  return jwk;
}

async function verifyWebhook(request: NextRequest, bodyText: string): Promise<boolean> {
  const plaidVerification = request.headers.get('plaid-verification');
  if (!plaidVerification) return false;

  try {
    // 1. Decode JWT header to get kid
    const [headerB64] = plaidVerification.split('.');
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());
    const kid = header.kid;
    if (!kid) return false;

    // 2. Fetch the verification key from Plaid
    const jwk = await fetchVerificationKey(kid);
    const key = await importJWK(jwk);

    // 3. Verify JWT signature and expiry
    const { payload } = await jwtVerify(plaidVerification, key, {
      maxTokenAge: '5 minutes',
    });

    // 4. Compare body hash
    const bodyHash = crypto.createHash('sha256').update(bodyText).digest('hex');
    if (payload.request_body_sha256 !== bodyHash) {
      console.error('Plaid webhook: body hash mismatch');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Plaid webhook verification error:', error);
    return false;
  }
}

async function handleTransactionWebhook(
  supabase: NonNullable<ReturnType<typeof getAdminClient>>,
  code: string,
  itemId: string
) {
  switch (code) {
    case 'SYNC_UPDATES_AVAILABLE':
    case 'DEFAULT_UPDATE':
    case 'INITIAL_UPDATE':
    case 'HISTORICAL_UPDATE': {
      // Mark item as having pending updates
      const { data: item } = await supabase
        .from('plaid_items')
        .select('id, user_id')
        .eq('item_id', itemId)
        .single();

      if (item) {
        await supabase
          .from('plaid_items')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', item.id);
      } else {
        // Fallback: check integration_connections
        const { data: connections } = await supabase
          .from('integration_connections')
          .select('id, metadata')
          .eq('provider', 'plaid')
          .eq('active', true);

        const connection = connections?.find(c => {
          const meta = c.metadata as Record<string, unknown>;
          return meta.item_id === itemId;
        });

        if (connection) {
          const metadata = connection.metadata as Record<string, unknown>;
          await supabase
            .from('integration_connections')
            .update({
              metadata: { ...metadata, pending_sync: true },
              updated_at: new Date().toISOString(),
            })
            .eq('id', connection.id);
        }
      }
      break;
    }

    case 'TRANSACTIONS_REMOVED':
      // Rare -- Plaid removed transactions. Handled during next sync.
      break;

    default:
      break;
  }
}

async function handleItemWebhook(
  supabase: NonNullable<ReturnType<typeof getAdminClient>>,
  code: string,
  itemId: string,
  error?: { error_code: string; error_message: string }
) {
  // Try plaid_items table first
  const { data: item } = await supabase
    .from('plaid_items')
    .select('id, user_id')
    .eq('item_id', itemId)
    .single();

  if (item) {
    switch (code) {
      case 'ERROR':
        await supabase.from('plaid_items').update({
          status: 'error',
          error_code: error?.error_code || 'UNKNOWN',
          error_message: error?.error_message || 'Connection error',
        }).eq('id', item.id);
        break;

      case 'PENDING_EXPIRATION':
        await supabase.from('plaid_items').update({
          status: 'pending_expiration',
        }).eq('id', item.id);
        break;

      case 'USER_PERMISSION_REVOKED':
      case 'PENDING_DISCONNECT':
        await supabase.from('plaid_items').update({
          status: 'disconnected',
        }).eq('id', item.id);
        break;
    }
    return;
  }

  // Fallback: integration_connections
  const { data: connections } = await supabase
    .from('integration_connections')
    .select('id, user_id, metadata')
    .eq('provider', 'plaid')
    .eq('active', true);

  const connection = connections?.find(c => {
    const meta = c.metadata as Record<string, unknown>;
    return meta.item_id === itemId;
  });

  if (!connection) return;
  const metadata = connection.metadata as Record<string, unknown>;

  switch (code) {
    case 'ERROR':
      await supabase.from('integration_connections').update({
        metadata: { ...metadata, error: error || { error_code: 'UNKNOWN', error_message: 'Connection error' }, needs_update: true },
        updated_at: new Date().toISOString(),
      }).eq('id', connection.id);
      break;

    case 'PENDING_EXPIRATION':
      await supabase.from('integration_connections').update({
        metadata: { ...metadata, pending_expiration: true },
        updated_at: new Date().toISOString(),
      }).eq('id', connection.id);
      break;

    case 'USER_PERMISSION_REVOKED':
    case 'PENDING_DISCONNECT':
      await supabase.from('integration_connections').update({
        active: false,
        updated_at: new Date().toISOString(),
      }).eq('id', connection.id);
      break;
  }
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createAdminClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
