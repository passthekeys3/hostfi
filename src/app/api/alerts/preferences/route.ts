import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * GET /api/alerts/preferences
 * Get the current user's alert preferences
 */
export async function GET() {
  try {
    const auth = await authenticateRequest();
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 400 });
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    const { data, error } = await supabase
      .from('alert_preferences')
      .select('*')
      .eq('user_id', auth.userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is fine
      console.error('Error fetching alert preferences:', error);
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
    }

    return NextResponse.json({ preferences: data || null });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('GET alert preferences error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * POST /api/alerts/preferences
 * Save/update alert preferences (upsert)
 * Body: { recipients: string[], alert_types: object }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest();
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 400 });
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { recipients, alert_types, active } = body as {
      recipients: string[];
      alert_types: Record<string, unknown>;
      active?: boolean;
    };

    if (!recipients || !Array.isArray(recipients)) {
      return NextResponse.json({ error: 'recipients must be an array' }, { status: 400 });
    }

    if (!alert_types || typeof alert_types !== 'object' || Array.isArray(alert_types)) {
      return NextResponse.json({ error: 'alert_types must be an object' }, { status: 400 });
    }

    // Only allow known alert type keys with boolean values
    const VALID_ALERT_TYPES = ['overdue', 'due_soon', 'missing_bill', 'anomaly', 'new_parsed', 'weekly_digest', 'monthly_report'];
    const sanitizedAlertTypes: Record<string, boolean> = {};
    for (const key of VALID_ALERT_TYPES) {
      if (key in alert_types) {
        sanitizedAlertTypes[key] = Boolean(alert_types[key as keyof typeof alert_types]);
      }
    }

    // Validate email formats
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validRecipients = recipients.filter(r => emailRegex.test(r));
    if (validRecipients.length === 0 && recipients.length > 0) {
      return NextResponse.json({ error: 'No valid email addresses provided' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('alert_preferences')
      .upsert({
        user_id: auth.userId,
        recipients: validRecipients,
        alert_types: sanitizedAlertTypes,
        active: active ?? true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving alert preferences:', error);
      return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
    }

    return NextResponse.json({ success: true, preferences: data });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('POST alert preferences error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/alerts/preferences
 * Disable/deactivate alert preferences
 */
export async function DELETE() {
  try {
    const auth = await authenticateRequest();
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 400 });
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    const { error } = await supabase
      .from('alert_preferences')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('user_id', auth.userId);

    if (error) {
      console.error('Error disabling alert preferences:', error);
      return NextResponse.json({ error: 'Failed to disable preferences' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('DELETE alert preferences error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
