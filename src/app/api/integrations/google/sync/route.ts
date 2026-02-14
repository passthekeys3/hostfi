import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { createRateLimiter } from '@/lib/rate-limit';
import { appendRows, refreshGoogleToken } from '@/lib/integrations/google';

const isRateLimited = createRateLimiter('google-sync', 10, 60_000);

/**
 * POST /api/integrations/google/sync — Sync expenses to Google Sheets
 * Reads tokens from Supabase, refreshes if needed, appends rows
 * Body: { expenses: Array<{ date, property, category, amount, vendor, notes? }> }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const body = await request.json();
    const { expenses } = body as {
      expenses: Array<{
        date: string;
        property: string;
        category: string;
        amount: number;
        vendor: string;
        notes?: string;
      }>;
    };

    if (!Array.isArray(expenses) || expenses.length === 0) {
      return NextResponse.json({ error: 'expenses must be a non-empty array' }, { status: 400 });
    }

    if (expenses.length > 1000) {
      return NextResponse.json({ error: 'Maximum 1000 expenses per sync' }, { status: 400 });
    }

    // Get stored connection from Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Google Sheets not configured' }, { status: 400 });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: connection } = await supabase
      .from('integration_connections')
      .select('*')
      .eq('user_id', auth.userId)
      .eq('provider', 'google_sheets')
      .single();

    if (!connection) {
      return NextResponse.json({ error: 'Google Sheets not connected. Go to Integrations to connect.' }, { status: 400 });
    }

    let accessToken = connection.access_token;
    const metadata = connection.metadata as { spreadsheet_id: string; expires_at: number };

    // Refresh token if expired
    if (metadata.expires_at && Date.now() > metadata.expires_at - 60_000) {
      try {
        const refreshed = await refreshGoogleToken(connection.refresh_token);
        accessToken = refreshed.access_token;

        // Update stored token
        await supabase
          .from('integration_connections')
          .update({
            access_token: refreshed.access_token,
            metadata: {
              ...metadata,
              expires_at: Date.now() + (refreshed.expires_in * 1000),
            },
          })
          .eq('user_id', auth.userId)
          .eq('provider', 'google_sheets');
      } catch {
        return NextResponse.json({ error: 'Google token expired. Please reconnect in Integrations.' }, { status: 401 });
      }
    }

    // Convert expenses to rows
    const rows = expenses.map(e => [
      e.date,
      e.property,
      e.category,
      `$${Number(e.amount).toFixed(2)}`,
      e.vendor,
      e.notes || '',
    ]);

    const result = await appendRows(accessToken, metadata.spreadsheet_id, 'Expenses', rows);

    return NextResponse.json({
      success: true,
      synced_rows: result.updatedRows,
      spreadsheet_url: `https://docs.google.com/spreadsheets/d/${metadata.spreadsheet_id}`,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
