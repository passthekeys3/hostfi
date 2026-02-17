import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase/service';

/**
 * GET /api/integrations/plaid/accounts
 * Return user's connected Plaid accounts with property mappings
 */
export async function GET() {
  try {
    const auth = await authenticateRequest();
    const supabase = getServiceClient();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Get all account mappings with property info
    const { data: mappings, error } = await supabase
      .from('plaid_account_mappings')
      .select(`
        id,
        plaid_account_id,
        account_name,
        account_mask,
        property_id,
        created_at,
        properties:property_id (
          id,
          name
        )
      `)
      .eq('user_id', auth.userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching account mappings:', error);
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
    }

    // Get Plaid items to show connection status
    const { data: items } = await supabase
      .from('plaid_items')
      .select('item_id, institution_name, status, last_synced_at')
      .eq('user_id', auth.userId);

    return NextResponse.json({
      accounts: mappings || [],
      items: items || [],
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
