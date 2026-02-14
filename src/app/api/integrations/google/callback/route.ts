import { NextRequest, NextResponse } from 'next/server';
import { exchangeGoogleCode, createSpreadsheet, appendRows } from '@/lib/integrations/google';

/**
 * GET /api/integrations/google/callback — Google OAuth callback
 * Receives auth code, exchanges for tokens, creates default spreadsheet, stores in Supabase
 */
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');
    const state = request.nextUrl.searchParams.get('state');
    const error = request.nextUrl.searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        new URL(`/dashboard/integrations?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=missing_params', request.url)
      );
    }

    // Decode state
    let stateData: { userId: string; nonce: string };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
    } catch {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=invalid_state', request.url)
      );
    }

    // Exchange code for tokens
    const tokens = await exchangeGoogleCode(code);

    // Create default HostFi spreadsheet
    const spreadsheet = await createSpreadsheet(tokens.access_token, 'HostFi Expenses');

    // Add header row
    await appendRows(tokens.access_token, spreadsheet.spreadsheetId, 'Expenses', [
      ['Date', 'Property', 'Category', 'Amount', 'Vendor', 'Notes', 'Receipt'],
    ]);
    await appendRows(tokens.access_token, spreadsheet.spreadsheetId, 'Revenue', [
      ['Date', 'Property', 'Source', 'Amount', 'Booking ID', 'Notes'],
    ]);

    // Store tokens + spreadsheet ID in Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceKey) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, serviceKey);

      await supabase.from('integration_connections').upsert({
        user_id: stateData.userId,
        provider: 'google_sheets',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        metadata: {
          spreadsheet_id: spreadsheet.spreadsheetId,
          spreadsheet_url: spreadsheet.spreadsheetUrl,
          expires_at: Date.now() + (tokens.expires_in * 1000),
        },
      }, { onConflict: 'user_id,provider' });
    }

    return NextResponse.redirect(
      new URL('/dashboard/integrations?connected=google_sheets', request.url)
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Google OAuth callback error:', message);
    return NextResponse.redirect(
      new URL(`/dashboard/integrations?error=${encodeURIComponent(message)}`, request.url)
    );
  }
}
