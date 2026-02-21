import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function PUT(request: NextRequest) {
  try {
    const session = await authenticateRequest();
    if (!session.authenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const supabase = getServiceClient();
    if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 500 });

    const body = await request.json();
    const { id, ...rawUpdates } = body;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    // Only allow specific fields to be updated (prevent user_id/id tampering)
    const allowedFields = ['amount', 'platform', 'guest_name', 'description', 'notes', 'check_in', 'check_out', 'nights', 'payout_amount', 'platform_fee', 'confirmation_code', 'property_id', 'date', 'payout_date', 'status'];
    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in rawUpdates) {
        updates[key] = rawUpdates[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Validate numeric fields
    const numericFields = ['amount', 'payout_amount', 'platform_fee', 'nights'];
    for (const field of numericFields) {
      if (field in updates) {
        const val = Number(updates[field]);
        if (!Number.isFinite(val)) {
          return NextResponse.json({ error: `Invalid value for ${field}` }, { status: 400 });
        }
        if (field === 'amount' && (val <= 0 || val > 10_000_000)) {
          return NextResponse.json({ error: 'Amount must be between 0 and 10,000,000' }, { status: 400 });
        }
        if (field === 'nights' && (val < 0 || val > 3650)) {
          return NextResponse.json({ error: 'Nights must be between 0 and 3650' }, { status: 400 });
        }
        updates[field] = val;
      }
    }

    // Only update rows belonging to this user
    const { error } = await supabase
      .from('revenue')
      .update(updates)
      .eq('id', id)
      .eq('user_id', session.userId);

    if (error) {
      console.error('Revenue update error:', error);
      return NextResponse.json({ error: 'Failed to update revenue' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Revenue update error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await authenticateRequest();
    if (!session.authenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const supabase = getServiceClient();
    if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 500 });

    const body = await request.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    // Only delete rows belonging to this user
    const { error } = await supabase
      .from('revenue')
      .delete()
      .eq('id', id)
      .eq('user_id', session.userId);

    if (error) {
      console.error('Revenue delete error:', error);
      return NextResponse.json({ error: 'Failed to delete revenue' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Revenue delete error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
