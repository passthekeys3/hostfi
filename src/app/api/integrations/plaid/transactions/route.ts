import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { createRateLimiter } from '@/lib/rate-limit';
import {
  fetchAllTransactions,
  mapPlaidCategory,
  isPlaidConfigured,
  getDemoTransactions,
} from '@/lib/integrations/plaid';
import { createClient } from '@/lib/supabase/server';

const rateLimiter = createRateLimiter('plaid-txns', 10, 60_000);

/**
 * POST /api/integrations/plaid/transactions
 * Sync transactions from Plaid and return new/modified/removed
 * Automatically updates the sync cursor in Supabase
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (rateLimiter(ip)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    // Demo mode
    if (!isPlaidConfigured()) {
      const demoTxns = getDemoTransactions();
      return NextResponse.json({
        demo: true,
        added: demoTxns.map(t => ({
          ...t,
          hostfi_category: mapPlaidCategory(t),
        })),
        modified: [],
        removed: [],
        accounts: [
          { account_id: 'acc_1', name: 'Business Checking', type: 'depository', mask: '4521' },
        ],
      });
    }

    // Get Plaid connection from Supabase
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { data: connection, error: connError } = await supabase
      .from('integration_connections')
      .select('*')
      .eq('user_id', auth.userId)
      .eq('provider', 'plaid')
      .eq('active', true)
      .single();

    if (connError || !connection) {
      return NextResponse.json({ error: 'No Plaid connection found. Connect your bank first.' }, { status: 404 });
    }

    const metadata = connection.metadata as Record<string, unknown>;
    const cursor = (metadata.sync_cursor as string) || undefined;

    // Fetch all new transactions
    const result = await fetchAllTransactions(connection.access_token, cursor);

    // Map categories
    const addedWithCategories = result.added.map(t => ({
      ...t,
      hostfi_category: mapPlaidCategory(t),
    }));

    const modifiedWithCategories = result.modified.map(t => ({
      ...t,
      hostfi_category: mapPlaidCategory(t),
    }));

    // Update cursor in Supabase
    await supabase
      .from('integration_connections')
      .update({
        metadata: { ...metadata, sync_cursor: result.nextCursor },
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id);

    return NextResponse.json({
      added: addedWithCategories,
      modified: modifiedWithCategories,
      removed: result.removed,
      accounts: result.accounts,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
