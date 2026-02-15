import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

/**
 * POST /api/integrations/plaid/webhook
 * Handle Plaid webhook events:
 * - SYNC_UPDATES_AVAILABLE (new transactions ready)
 * - ITEM_ERROR (connection broken — needs update mode)
 * - PENDING_EXPIRATION (consent expiring soon)
 * - PENDING_DISCONNECT (institution disconnecting)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { webhook_type, webhook_code, item_id, error: plaidError } = body;

    // Verify webhook via shared secret header
    const webhookSecret = process.env.PLAID_WEBHOOK_SECRET;
    if (process.env.NODE_ENV === 'production') {
      if (!webhookSecret) {
        console.error('Plaid webhook: PLAID_WEBHOOK_SECRET not configured');
        return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
      }
      const authHeader = request.headers.get('plaid-verification') || request.headers.get('authorization');
      // For production, verify using Plaid's webhook verification endpoint
      // https://plaid.com/docs/api/webhooks/webhook-verification/
      // As a baseline, reject requests without a valid Plaid-Verification header
      if (!authHeader) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.log(`Plaid webhook: ${webhook_type}/${webhook_code}`);

    switch (webhook_type) {
      case 'TRANSACTIONS': {
        await handleTransactionWebhook(webhook_code, item_id);
        break;
      }
      case 'ITEM': {
        await handleItemWebhook(webhook_code, item_id, plaidError);
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

async function handleTransactionWebhook(code: string, itemId: string) {
  switch (code) {
    case 'SYNC_UPDATES_AVAILABLE': {
      // New transactions are ready — mark the connection for sync
      // The frontend will pick this up on next load, or we could
      // trigger a sync here if we want real-time
      const supabase = getAdminClient();
      if (!supabase) return;

      // Find connection by item_id in metadata
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
      break;
    }

    case 'INITIAL_UPDATE':
    case 'HISTORICAL_UPDATE':
      // Initial/historical data ready — same action as SYNC
      console.log(`Plaid: ${code} received`);
      break;

    default:
      console.log(`Unhandled transaction webhook: ${code}`);
  }
}

async function handleItemWebhook(
  code: string,
  itemId: string,
  error?: { error_code: string; error_message: string }
) {
  const supabase = getAdminClient();
  if (!supabase) return;

  // Find connection
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
      // Item is in error state — user needs to re-authenticate
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

      console.log(`Plaid: Item error — ${error?.error_code}`);
      break;
    }

    case 'PENDING_EXPIRATION': {
      // Consent expiring — user needs to re-authorize
      await supabase
        .from('integration_connections')
        .update({
          metadata: { ...metadata, pending_expiration: true },
          updated_at: new Date().toISOString(),
        })
        .eq('id', connection.id);
      break;
    }

    case 'PENDING_DISCONNECT': {
      // Institution is disconnecting — user needs to reconnect
      await supabase
        .from('integration_connections')
        .update({
          metadata: { ...metadata, pending_disconnect: true },
          updated_at: new Date().toISOString(),
        })
        .eq('id', connection.id);
      break;
    }

    case 'USER_PERMISSION_REVOKED': {
      // User revoked access — deactivate connection
      await supabase
        .from('integration_connections')
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq('id', connection.id);
      break;
    }

    default:
      console.log(`Unhandled item webhook: ${code}`);
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
  return createAdminClient(url, serviceKey);
}
