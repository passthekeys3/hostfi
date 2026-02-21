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

    // Only update rows belonging to this user
    const { error } = await supabase
      .from('revenue')
      .update(updates)
      .eq('id', id)
      .eq('user_id', session.userId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
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

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
