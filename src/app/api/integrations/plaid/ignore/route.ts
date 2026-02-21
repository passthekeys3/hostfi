import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase/service';
import { DEFAULT_IGNORED_MERCHANTS } from '@/lib/integrations/plaid-matching';

/**
 * GET /api/integrations/plaid/ignore
 * Return user's ignored merchants list
 */
export async function GET() {
  try {
    const auth = await authenticateRequest();
    const supabase = getServiceClient();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { data, error } = await supabase
      .from('plaid_ignored_merchants')
      .select('id, merchant_name, created_at')
      .eq('user_id', auth.userId)
      .order('merchant_name', { ascending: true });

    if (error) {
      console.error('Error fetching ignored merchants:', error);
      return NextResponse.json({ error: 'Failed to fetch ignored merchants' }, { status: 500 });
    }

    return NextResponse.json({
      ignored: data || [],
      defaults: DEFAULT_IGNORED_MERCHANTS,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * POST /api/integrations/plaid/ignore
 * Add a merchant to the ignored list
 * Body: { merchant_name: string }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest();
    const supabase = getServiceClient();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { merchant_name } = body as { merchant_name: string };

    if (!merchant_name || typeof merchant_name !== 'string') {
      return NextResponse.json({ error: 'merchant_name is required' }, { status: 400 });
    }

    const trimmed = merchant_name.trim();
    if (trimmed.length < 2 || trimmed.length > 100) {
      return NextResponse.json({ error: 'Invalid merchant name length' }, { status: 400 });
    }

    const { error } = await supabase
      .from('plaid_ignored_merchants')
      .upsert({
        user_id: auth.userId,
        merchant_name: trimmed,
      }, { onConflict: 'user_id,merchant_name' });

    if (error) {
      console.error('Error adding ignored merchant:', error);
      return NextResponse.json({ error: 'Failed to add ignored merchant' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/integrations/plaid/ignore
 * Remove a merchant from the ignored list
 * Body: { merchant_name: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateRequest();
    const supabase = getServiceClient();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { merchant_name } = body as { merchant_name: string };

    if (!merchant_name || typeof merchant_name !== 'string') {
      return NextResponse.json({ error: 'merchant_name is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('plaid_ignored_merchants')
      .delete()
      .eq('user_id', auth.userId)
      .eq('merchant_name', merchant_name.trim());

    if (error) {
      console.error('Error removing ignored merchant:', error);
      return NextResponse.json({ error: 'Failed to remove ignored merchant' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
