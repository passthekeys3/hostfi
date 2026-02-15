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
      const mapped = demoTxns.map(t => ({
        ...t,
        hostfi_category: mapPlaidCategory(t),
      }));

      // Save demo transactions to expenses
      const supabaseDemo = await createClient();
      if (supabaseDemo) {
        const { data: props } = await supabaseDemo
          .from('properties')
          .select('id')
          .eq('user_id', auth.userId)
          .limit(1);

        if (props?.[0]?.id) {
          const rows = mapped
            .filter(t => (t.amount || 0) > 0)
            .map(t => ({
              user_id: auth.userId,
              property_id: props[0].id,
              category: t.hostfi_category || 'other',
              description: t.name || t.merchant_name || 'Bank transaction',
              vendor: t.merchant_name || t.name || null,
              amount: Math.abs(t.amount),
              date: t.date,
              source: 'csv_import' as const,
              status: 'paid' as const,
              notes: `Imported from Plaid (demo)`,
            }));
          if (rows.length > 0) {
            await supabaseDemo.from('expenses').insert(rows);
          }
        }
      }

      return NextResponse.json({
        demo: true,
        added: mapped,
        modified: [],
        removed: [],
        accounts: [
          { account_id: 'acc_1', name: 'Business Checking', type: 'depository', mask: '4521' },
        ],
        imported: mapped.filter(t => (t.amount || 0) > 0).length,
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

    // Get user's first property as default assignment
    const { data: properties } = await supabase
      .from('properties')
      .select('id')
      .eq('user_id', auth.userId)
      .limit(1);

    const defaultPropertyId = properties?.[0]?.id;

    // Save new transactions to expenses table
    if (addedWithCategories.length > 0 && defaultPropertyId) {
      const expenseRows = addedWithCategories
        .filter(t => (t.amount || 0) > 0) // Only expenses (positive amounts in Plaid = money out)
        .map(t => ({
          user_id: auth.userId,
          property_id: defaultPropertyId,
          category: t.hostfi_category || 'other',
          description: t.name || t.merchant_name || 'Bank transaction',
          vendor: t.merchant_name || t.name || null,
          amount: Math.abs(t.amount),
          date: t.date,
          source: 'csv_import' as const, // Using csv_import since plaid_import not in constraint
          status: 'paid' as const,
          notes: `Imported from Plaid (${t.transaction_id})`,
        }));

      if (expenseRows.length > 0) {
        await supabase.from('expenses').insert(expenseRows);
      }
    }

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
      imported: addedWithCategories.filter(t => (t.amount || 0) > 0).length,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
