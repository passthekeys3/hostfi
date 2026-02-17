import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase/service';

/**
 * POST /api/integrations/plaid/accounts/map
 * Map a Plaid account to a property
 * Body: { plaid_account_id: string, property_id: string | null }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest();
    const supabase = getServiceClient();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { plaid_account_id, property_id } = body as {
      plaid_account_id: string;
      property_id: string | null;
    };

    if (!plaid_account_id || typeof plaid_account_id !== 'string') {
      return NextResponse.json({ error: 'plaid_account_id is required' }, { status: 400 });
    }

    // Verify property belongs to user (if provided)
    if (property_id) {
      const { data: property, error: propError } = await supabase
        .from('properties')
        .select('id')
        .eq('id', property_id)
        .eq('user_id', auth.userId)
        .single();

      if (propError || !property) {
        return NextResponse.json({ error: 'Property not found' }, { status: 404 });
      }
    }

    // Upsert the mapping
    const { error } = await supabase
      .from('plaid_account_mappings')
      .upsert({
        user_id: auth.userId,
        plaid_account_id,
        property_id: property_id || null,
      }, { onConflict: 'user_id,plaid_account_id' });

    if (error) {
      console.error('Error mapping account:', error);
      return NextResponse.json({ error: 'Failed to map account' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
