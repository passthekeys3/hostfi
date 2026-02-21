import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { createRateLimiter } from '@/lib/rate-limit';
import { decryptPlaidToken } from '@/lib/integrations/plaid-crypto';
import {
  fetchAllTransactions,
  mapPlaidCategory,
  isPlaidConfigured,
  PlaidTransaction,
} from '@/lib/integrations/plaid';
import {
  processTransaction,
  ProcessingContext,
  Expense,
  RecurringRule,
  detectRevenue,
} from '@/lib/integrations/plaid-matching';
import { getServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';

const rateLimiter = createRateLimiter('plaid-sync', 5, 60_000);

interface SyncResult {
  added: number;
  matched: number;
  skipped: number;
  revenue: number;
  errors: string[];
  needsReview: number;
}

/**
 * POST /api/integrations/plaid/sync
 * Sync transactions from Plaid with intelligent matching and deduplication
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (rateLimiter(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    if (!isPlaidConfigured()) {
      return NextResponse.json({ error: 'Plaid not configured' }, { status: 503 });
    }

    // Get user's Plaid items
    const { data: plaidItems, error: itemsError } = await supabase
      .from('plaid_items')
      .select('*')
      .eq('user_id', auth.userId)
      .eq('status', 'active');

    if (itemsError || !plaidItems?.length) {
      // Fallback to integration_connections for backwards compatibility
      return handleLegacySync(auth.userId, supabase);
    }

    // Load context data
    const [expensesRes, ignoredRes, rulesRes, mappingsRes, propsRes] = await Promise.all([
      supabase
        .from('expenses')
        .select('id, user_id, property_id, category, description, vendor, amount, date, plaid_transaction_id, verification_status, source')
        .eq('user_id', auth.userId)
        .gte('date', getDateAgo(90)) // Last 90 days
        .order('date', { ascending: false }),
      supabase
        .from('plaid_ignored_merchants')
        .select('merchant_name')
        .eq('user_id', auth.userId),
      supabase
        .from('plaid_recurring_rules')
        .select('*')
        .eq('user_id', auth.userId),
      supabase
        .from('plaid_account_mappings')
        .select('plaid_account_id, property_id')
        .eq('user_id', auth.userId),
      supabase
        .from('properties')
        .select('id')
        .eq('user_id', auth.userId)
        .limit(1),
    ]);

    const existingExpenses = (expensesRes.data || []) as Expense[];
    const ignoredMerchants = (ignoredRes.data || []).map(i => i.merchant_name);
    const recurringRules = (rulesRes.data || []) as RecurringRule[];
    const accountMappings: Record<string, string> = {};
    for (const m of mappingsRes.data || []) {
      if (m.property_id) accountMappings[m.plaid_account_id] = m.property_id;
    }
    const defaultPropertyId = propsRes.data?.[0]?.id;

    const results: SyncResult = {
      added: 0,
      matched: 0,
      skipped: 0,
      revenue: 0,
      errors: [],
      needsReview: 0,
    };

    // Process each Plaid item
    for (const item of plaidItems) {
      try {
        const { added, modified, removed, nextCursor, accounts } = await fetchAllTransactions(
          decryptPlaidToken(item.access_token),
          item.sync_cursor || undefined
        );

        // Save account info if we don't have mappings yet
        await saveAccountMappings(supabase, auth.userId, accounts, accountMappings);

        // Process all transactions
        const allTransactions = [...added, ...modified];
        
        const context: ProcessingContext = {
          userId: auth.userId,
          existingExpenses,
          ignoredMerchants,
          recurringRules,
          accountMappings,
          defaultPropertyId,
        };

        for (const txn of allTransactions) {
          const result = processTransaction(txn, context);

          switch (result.action) {
            case 'skip_ignored':
            case 'skip_duplicate':
              results.skipped++;
              break;

            case 'matched':
              if (result.expense_id) {
                await supabase
                  .from('expenses')
                  .update({
                    plaid_transaction_id: txn.transaction_id,
                    verification_status: 'verified',
                  })
                  .eq('id', result.expense_id);
                results.matched++;
                if (result.needs_review) results.needsReview++;
              }
              break;

            case 'pending_update':
              if (result.expense_id) {
                await supabase
                  .from('expenses')
                  .update({
                    plaid_transaction_id: txn.transaction_id,
                    amount: Math.abs(txn.amount),
                    date: txn.date,
                  })
                  .eq('id', result.expense_id);
                results.matched++;
              }
              break;

            case 'revenue':
              await createRevenue(supabase, auth.userId, txn, result.property_id || defaultPropertyId);
              results.revenue++;
              break;

            case 'created':
              if (txn.amount > 0 && (result.property_id || defaultPropertyId)) {
                await createExpense(
                  supabase,
                  auth.userId,
                  txn,
                  result.property_id || defaultPropertyId!,
                  result.category
                );
                results.added++;
              }
              break;
          }
        }

        // Handle removed transactions
        if (removed.length > 0) {
          const removedIds = removed.map(r => r.transaction_id);
          await supabase
            .from('expenses')
            .update({ plaid_transaction_id: null, verification_status: 'unverified' })
            .eq('user_id', auth.userId)
            .in('plaid_transaction_id', removedIds);
        }

        // Update cursor
        await supabase
          .from('plaid_items')
          .update({
            sync_cursor: nextCursor,
            last_synced_at: new Date().toISOString(),
          })
          .eq('id', item.id);

      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`${item.institution_name || item.item_id}: ${msg}`);
        console.error(`Plaid sync error for item ${item.item_id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error(error);
    console.error('Plaid sync error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ──────────────────────────────────────────────
// Helper Functions
// ──────────────────────────────────────────────

function getDateAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

async function saveAccountMappings(
  supabase: ReturnType<typeof getServiceClient>,
  userId: string,
  accounts: Array<{ account_id: string; name: string; mask: string | null }>,
  existingMappings: Record<string, string>
) {
  if (!supabase) return;
  
  for (const acc of accounts) {
    if (!existingMappings[acc.account_id]) {
      await supabase
        .from('plaid_account_mappings')
        .upsert({
          user_id: userId,
          plaid_account_id: acc.account_id,
          account_name: acc.name,
          account_mask: acc.mask,
        }, { onConflict: 'user_id,plaid_account_id' });
    }
  }
}

async function createExpense(
  supabase: ReturnType<typeof getServiceClient>,
  userId: string,
  txn: PlaidTransaction,
  propertyId: string,
  category?: string
) {
  if (!supabase) return;
  
  await supabase.from('expenses').insert({
    user_id: userId,
    property_id: propertyId,
    category: category || mapPlaidCategory(txn),
    description: txn.name || txn.merchant_name || 'Bank transaction',
    vendor: txn.merchant_name || txn.name || null,
    amount: Math.abs(txn.amount),
    date: txn.date,
    source: 'plaid',
    status: 'paid',
    plaid_transaction_id: txn.transaction_id,
    verification_status: 'no_receipt',
    notes: txn.pending ? 'Pending transaction' : null,
  });
}

async function createRevenue(
  supabase: ReturnType<typeof getServiceClient>,
  userId: string,
  txn: PlaidTransaction,
  propertyId?: string
) {
  if (!supabase || !propertyId) return;
  
  // Deduplicate by transaction_id in notes (exact match on formatted string)
  const expectedNote = `Imported from Plaid (${txn.transaction_id})`;
  const { count } = await supabase
    .from('revenue')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('notes', expectedNote);
  if ((count ?? 0) > 0) return; // Already imported

  const revenueResult = detectRevenue(txn);
  
  await supabase.from('revenue').insert({
    user_id: userId,
    property_id: propertyId,
    platform: revenueResult.platform || 'other',
    description: txn.name || txn.merchant_name || 'Bank deposit',
    amount: Math.abs(txn.amount),
    date: txn.date,
    source: 'api_sync',
    notes: `Imported from Plaid (${txn.transaction_id})`,
  });
}

async function handleLegacySync(userId: string, supabase: ReturnType<typeof getServiceClient>) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  // Check for legacy connection
  const { data: connection } = await supabase
    .from('integration_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'plaid')
    .eq('active', true)
    .single();

  if (!connection) {
    return NextResponse.json({
      error: 'No Plaid connection found. Connect your bank first.',
    }, { status: 404 });
  }

  // Migrate to plaid_items table
  const metadata = connection.metadata as Record<string, unknown>;
  await supabase.from('plaid_items').upsert({
    user_id: userId,
    item_id: metadata.item_id as string,
    access_token: decryptPlaidToken(connection.access_token),
    institution_name: metadata.institution_name as string,
    institution_id: metadata.institution_id as string,
    sync_cursor: metadata.sync_cursor as string || null,
    status: 'active',
  }, { onConflict: 'user_id,item_id' });

  // Retry with the new item
  const userSupabase = await createClient();
  if (!userSupabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  // Return success and prompt another sync
  return NextResponse.json({
    success: true,
    migrated: true,
    message: 'Migrated to new Plaid system. Please sync again.',
  });
}
