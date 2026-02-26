import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase/service';
import { removeItem } from '@/lib/integrations/plaid';
import { decryptPlaidToken } from '@/lib/integrations/plaid-crypto';
import { createRateLimiter } from '@/lib/rate-limit';

const rateLimiter = createRateLimiter('plaid-disconnect', 5, 60_000);

/**
 * POST /api/integrations/plaid/disconnect
 * Disconnect a Plaid Item (bank connection)
 * Body: { item_id: string }
 * 
 * POST (no body) disconnects ALL Plaid items for the user
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (rateLimiter(ip)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    const supabase = getServiceClient();
    if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 500 });

    const body = await request.json().catch(() => ({}));
    const targetItemId = body.item_id;

    // Get items to disconnect
    const query = supabase
      .from('plaid_items')
      .select('id, item_id, access_token, status')
      .eq('user_id', auth.userId);

    if (targetItemId) {
      query.eq('item_id', targetItemId);
    }

    const { data: items, error } = await query;
    if (error || !items?.length) {
      return NextResponse.json({ error: 'No Plaid connections found' }, { status: 404 });
    }

    for (const item of items) {
      // Try to remove from Plaid (best effort -- may fail if token already invalid)
      try {
        const accessToken = item.access_token ? decryptPlaidToken(item.access_token) : null;
        if (accessToken) {
          await removeItem(accessToken);
        }
      } catch (err) {
        // Plaid removal failed -- continue with local cleanup
        console.warn(`Failed to remove Plaid item ${item.item_id}:`, err);
      }

      // Mark as disconnected locally
      await supabase
        .from('plaid_items')
        .update({ status: 'disconnected', access_token: null })
        .eq('id', item.id);

      // Clean up account mappings for this item's accounts
      // Since plaid_account_mappings doesn't have plaid_item_id,
      // we delete all mappings when disconnecting (they'll be recreated on reconnect)
      if (!targetItemId || items.length === 1) {
        await supabase
          .from('plaid_account_mappings')
          .delete()
          .eq('user_id', auth.userId);
      }
    }

    // Also clean up legacy integration_connections
    await supabase
      .from('integration_connections')
      .update({ status: 'disconnected', credentials: null, active: false })
      .eq('user_id', auth.userId)
      .eq('provider', 'plaid');

    return NextResponse.json({ success: true, disconnected: items.length });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('Plaid disconnect error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
