import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';

/**
 * POST /api/integrations/plaid/webhook
 * Handle Plaid webhook events:
 * - TRANSACTIONS.SYNC_UPDATES_AVAILABLE (new transactions ready)
 * - TRANSACTIONS.DEFAULT_UPDATE (new transactions ready - legacy)
 * - ITEM.ERROR (connection broken — needs update mode)
 * - ITEM.PENDING_EXPIRATION (consent expiring soon)
 * - ITEM.PENDING_DISCONNECT (institution disconnecting)
 * - ITEM.USER_PERMISSION_REVOKED (user revoked access)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { webhook_type, webhook_code, item_id, error: plaidError } = body;

    // Verify webhook signature in production
    if (process.env.NODE_ENV === 'production') {
      const isValid = await verifyWebhook(request, body);
      if (!isValid) {
        console.error('Plaid webhook: Invalid signature');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.log(`Plaid webhook: ${webhook_type}/${webhook_code} for item ${item_id}`);

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
        console.log(`Unhandled Plaid webhook type: ${webhook_type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Plaid webhook error:', error);
    // Always return 200 to prevent Plaid from retrying
    return NextResponse.json({ received: true });
  }
}

/**
 * Verify Plaid webhook signature
 * https://plaid.com/docs/api/webhooks/webhook-verification/
 */
// Plaid JWKS endpoint for webhook signature verification
const PLAID_JWKS = createRemoteJWKSet(
  new URL('https://production.plaid.com/webhook_verification_key/get')
);

// Cache JWKS for sandbox/development environments
const PLAID_SANDBOX_JWKS = createRemoteJWKSet(
  new URL('https://sandbox.plaid.com/webhook_verification_key/get')
);

function getJWKS() {
  const env = process.env.PLAID_ENV || 'sandbox';
  return env === 'production' ? PLAID_JWKS : PLAID_SANDBOX_JWKS;
}

async function verifyWebhook(request: NextRequest, body: unknown): Promise<boolean> {
  const plaidVerification = request.headers.get('plaid-verification');
  if (!plaidVerification) return false;

  try {
    // 1. Verify JWT signature using Plaid's public keys (JWKS)
    const { payload } = await jwtVerify(plaidVerification, getJWKS(), {
      maxTokenAge: '5 minutes',
    });

    // 2. Verify request body hash matches the claim
    const bodyStr = JSON.stringify(body);
    const bodyHash = crypto.createHash('sha256').update(bodyStr).digest('hex');

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
  supabase: ReturnType<typeof getAdminClient>,
  code: string,
  itemId: string
) {
  if (!supabase) return;

  switch (code) {
    case 'SYNC_UPDATES_AVAILABLE':
    case 'DEFAULT_UPDATE':
    case 'INITIAL_UPDATE':
    case 'HISTORICAL_UPDATE': {
      // Mark item for sync
      const { data: item } = await supabase
        .from('plaid_items')
        .select('id, user_id')
        .eq('item_id', itemId)
        .single();

      if (item) {
        // Could trigger auto-sync here or just mark for next poll
        console.log(`Plaid: ${code} received for item ${itemId}`);
        
        // Optionally: trigger sync by calling internal API
        // await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/plaid/sync`, {
        //   method: 'POST',
        //   headers: { 'X-Internal-Webhook': 'true', 'X-User-Id': item.user_id },
        // });
      } else {
        // Check legacy integration_connections table
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

    case 'TRANSACTIONS_REMOVED': {
      // Transactions were removed by Plaid (rare)
      console.log(`Plaid: Transactions removed for item ${itemId}`);
      break;
    }

    default:
      console.log(`Unhandled transaction webhook: ${code}`);
  }
}

async function handleItemWebhook(
  supabase: ReturnType<typeof getAdminClient>,
  code: string,
  itemId: string,
  error?: { error_code: string; error_message: string }
) {
  if (!supabase) return;

  // Find item in plaid_items table
  const { data: item } = await supabase
    .from('plaid_items')
    .select('id, user_id')
    .eq('item_id', itemId)
    .single();

  if (item) {
    switch (code) {
      case 'ERROR': {
        await supabase
          .from('plaid_items')
          .update({
            status: 'error',
            error_code: error?.error_code || 'UNKNOWN',
            error_message: error?.error_message || 'Connection error',
          })
          .eq('id', item.id);
        console.log(`Plaid: Item error — ${error?.error_code}`);
        break;
      }

      case 'PENDING_EXPIRATION': {
        await supabase
          .from('plaid_items')
          .update({ status: 'pending_expiration' })
          .eq('id', item.id);
        console.log(`Plaid: Item pending expiration — ${itemId}`);
        break;
      }

      case 'USER_PERMISSION_REVOKED':
      case 'PENDING_DISCONNECT': {
        await supabase
          .from('plaid_items')
          .update({ status: 'disconnected' })
          .eq('id', item.id);
        console.log(`Plaid: Item disconnected — ${itemId}`);
        break;
      }

      default:
        console.log(`Unhandled item webhook: ${code}`);
    }
    return;
  }

  // Fallback: check legacy integration_connections table
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
    case 'ERROR': {
      await supabase
        .from('integration_connections')
        .update({
          metadata: {
            ...metadata,
            error: error || { error_code: 'UNKNOWN', error_message: 'Connection error' },
            needs_update: true,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', connection.id);
      console.log(`Plaid: Item error (legacy) — ${error?.error_code}`);
      break;
    }

    case 'PENDING_EXPIRATION': {
      await supabase
        .from('integration_connections')
        .update({
          metadata: { ...metadata, pending_expiration: true },
          updated_at: new Date().toISOString(),
        })
        .eq('id', connection.id);
      break;
    }

    case 'USER_PERMISSION_REVOKED':
    case 'PENDING_DISCONNECT': {
      await supabase
        .from('integration_connections')
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq('id', connection.id);
      break;
    }

    default:
      console.log(`Unhandled item webhook (legacy): ${code}`);
  }
}

/**
 * Get a Supabase admin client (uses service role key for webhook handling)
 * Webhooks don't have user auth context, so we need admin access
 */
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createAdminClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
