/**
 * GET /api/integrations/hospitable-connect/callback - OAuth callback after user connects OTA
 * 
 * This is where Hospitable redirects after the user connects their Airbnb/VRBO.
 * The redirect URL we provide to Hospitable includes query params we can use.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createClientBrowser } from '@/lib/supabase/server';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hostfi.ai';

  try {
    // Get current user from session
    const supabaseBrowser = await createClientBrowser();
    if (!supabaseBrowser) {
      // Redirect with error if Supabase not configured
      return NextResponse.redirect(`${appUrl}/dashboard/integrations?hospitable_connect=error&reason=not_configured`);
    }

    const { data: { user } } = await supabaseBrowser.auth.getUser();
    if (!user) {
      // User not logged in — redirect to login with return URL
      return NextResponse.redirect(`${appUrl}/login?returnTo=/dashboard/integrations?hospitable_connect=connected`);
    }

    // Get service client for DB updates
    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.redirect(`${appUrl}/dashboard/integrations?hospitable_connect=error&reason=db_error`);
    }

    // Hospitable may include these params (from their docs)
    const customerId = searchParams.get('customer_id');
    const channelId = searchParams.get('channel_id');
    const error = searchParams.get('error');

    // Check for error from Hospitable
    if (error) {
      console.error('Hospitable Connect callback error:', error);
      return NextResponse.redirect(`${appUrl}/dashboard/integrations?hospitable_connect=error&reason=${encodeURIComponent(error)}`);
    }

    // Mark connection as connected
    const { error: updateError } = await supabase
      .from('integration_connections')
      .update({
        status: 'connected',
        active: true,
        metadata: {
          hospitable_connect_customer_id: customerId || user.id,
          ...(channelId && { last_channel_id: channelId }),
          connected_at: new Date().toISOString(),
        },
      })
      .eq('user_id', user.id)
      .eq('provider', 'hospitable_connect');

    if (updateError) {
      console.error('Failed to update connection status:', updateError);
      return NextResponse.redirect(`${appUrl}/dashboard/integrations?hospitable_connect=error&reason=db_error`);
    }

    // Redirect to integrations page with success
    return NextResponse.redirect(`${appUrl}/dashboard/integrations?hospitable_connect=connected`);
  } catch (error) {
    console.error('Hospitable Connect callback error:', error);
    return NextResponse.redirect(`${appUrl}/dashboard/integrations?hospitable_connect=error&reason=unknown`);
  }
}
