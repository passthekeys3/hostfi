import { NextRequest, NextResponse } from 'next/server';
import { exchangeGoogleCode, createSpreadsheet } from '@/lib/integrations/google';

/**
 * GET /api/integrations/google/callback — Google OAuth callback
 * Receives auth code, exchanges for tokens, creates default spreadsheet
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
    const { appendRows } = await import('@/lib/integrations/google');
    await appendRows(tokens.access_token, spreadsheet.spreadsheetId, 'Expenses', [
      ['Date', 'Property', 'Category', 'Amount', 'Vendor', 'Notes', 'Receipt'],
    ]);

    // TODO: Store tokens + spreadsheet ID in Supabase integration_connections table
    // For now, store in a cookie/session for demo purposes
    console.log('Google OAuth complete for user:', stateData.userId);

    return NextResponse.redirect(
      new URL(
        `/dashboard/integrations?connected=google_sheets&spreadsheet=${spreadsheet.spreadsheetId}`,
        request.url
      )
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Google OAuth callback error:', message);
    return NextResponse.redirect(
      new URL(`/dashboard/integrations?error=${encodeURIComponent(message)}`, request.url)
    );
  }
}
