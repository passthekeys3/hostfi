import { NextRequest, NextResponse } from 'next/server';
import { exchangeGoogleCode, createSpreadsheet, appendRows } from '@/lib/integrations/google';
import { encryptCredentials } from '@/lib/crypto';

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
    } catch (error) {
      console.error('Invalid Google OAuth state:', error);
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

      const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000)).toISOString();

      // Save both Google Sheets and Google Drive connections (same OAuth grant covers both)
      const encryptedCreds = process.env.CREDENTIALS_ENCRYPTION_KEY
        ? encryptCredentials({ access_token: tokens.access_token, refresh_token: tokens.refresh_token })
        : null;

      await Promise.all([
        supabase.from('integration_connections').upsert({
          user_id: stateData.userId,
          provider: 'google_sheets',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          credentials: encryptedCreds || { access_token: tokens.access_token, refresh_token: tokens.refresh_token },
          token_expires_at: expiresAt,
          metadata: {
            spreadsheet_id: spreadsheet.spreadsheetId,
            spreadsheet_url: spreadsheet.spreadsheetUrl,
          },
          active: true,
        }, { onConflict: 'user_id,provider' }),
        supabase.from('integration_connections').upsert({
          user_id: stateData.userId,
          provider: 'google_drive',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          credentials: encryptedCreds || { access_token: tokens.access_token, refresh_token: tokens.refresh_token },
          token_expires_at: expiresAt,
          metadata: {},
          active: true,
        }, { onConflict: 'user_id,provider' }),
      ]);
    }

    return NextResponse.redirect(
      new URL('/dashboard/integrations?connected=google_sheets&connected=google_drive', request.url)
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Google OAuth callback error:', message);
    return NextResponse.redirect(
      new URL(`/dashboard/integrations?error=${encodeURIComponent(message)}`, request.url)
    );
  }
}
