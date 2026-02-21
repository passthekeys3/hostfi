import { decryptPlaidToken } from "@/lib/integrations/plaid-crypto";
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { createRateLimiter } from '@/lib/rate-limit';
import {
  fetchAllTransactions,
  mapPlaidCategory,
  isPlaidConfigured,
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

    if (!isPlaidConfigured()) {
      return NextResponse.json({ error: 'Plaid not configured' }, { status: 503 });
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
    const result = await fetchAllTransactions(decryptPlaidToken(connection.access_token), cursor);

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

    // Split transactions: positive = expenses (money out), negative = revenue (money in)
    if (addedWithCategories.length > 0 && defaultPropertyId) {
      const expenses = addedWithCategories.filter(t => (t.amount || 0) > 0);
      const income = addedWithCategories.filter(t => (t.amount || 0) < 0);

      // Save expenses
      if (expenses.length > 0) {
        const expenseRows = expenses.map(t => ({
          user_id: auth.userId,
          property_id: defaultPropertyId,
          category: t.hostfi_category || 'other',
          description: t.name || t.merchant_name || 'Bank transaction',
          vendor: t.merchant_name || t.name || null,
          amount: Math.abs(t.amount),
          date: t.date,
          source: 'plaid' as const,
          status: 'paid' as const,
          notes: `Imported from Plaid (${t.transaction_id})`,
        }));
        await supabase.from('expenses').insert(expenseRows);
      }

      // Save revenue (negative amounts = incoming money)
      if (income.length > 0) {
        const revenueRows = income.map(t => ({
          user_id: auth.userId,
          property_id: defaultPropertyId,
          platform: 'other' as const,
          description: t.name || t.merchant_name || 'Bank deposit',
          amount: Math.abs(t.amount),
          date: t.date,
          source: 'plaid' as const,
          notes: `Imported from Plaid (${t.transaction_id})`,
        }));
        await supabase.from('revenue').insert(revenueRows);
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
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
