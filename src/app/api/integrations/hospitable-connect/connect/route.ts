/**
 * POST /api/integrations/hospitable-connect/connect - Initialize connection
 * GET /api/integrations/hospitable-connect/connect - Check connection status
 * DELETE /api/integrations/hospitable-connect/connect - Disconnect
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { canAccessFeature, type Plan } from '@/lib/feature-gates';
import {
  createCustomer,
  getCustomer,
  deleteCustomer,
  createAuthCode,
  fetchChannels,
} from '@/lib/integrations/hospitable-connect';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * POST - Initialize connection (create customer + auth code)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await authenticateRequest();
    if (!session.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    // Server-side plan check: Integrations require Pro plan
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', session.userId)
      .single();
    const userPlan = (profile?.plan || 'free') as Plan;
    if (!canAccessFeature(userPlan, 'integrations')) {
      return NextResponse.json({ error: 'Integrations require a Pro plan.' }, { status: 403 });
    }

    // Check if already connected
    const { data: existingConnection } = await supabase
      .from('integration_connections')
      .select('id, metadata, status')
      .eq('user_id', session.userId)
      .eq('provider', 'hospitable_connect')
      .single();

    let customerId = existingConnection?.metadata?.hospitable_connect_customer_id as string | undefined;

    // If not connected, create customer in Hospitable Connect
    if (!customerId) {
      // Get user profile for name and email
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', session.userId)
        .single();

      const userName = profile?.full_name || session.email?.split('@')[0] || 'User';
      const userEmail = profile?.email || session.email || `user-${session.userId}@hostfi.ai`;

      try {
        // Create customer using HostFi user ID
        const customer = await createCustomer(session.userId, userEmail, userName);
        customerId = customer.id;
      } catch (error) {
        // Customer may already exist (422 error) — try to get them
        const errMsg = error instanceof Error ? error.message : '';
        if (errMsg.includes('422') || errMsg.includes('already been taken')) {
          try {
            const existing = await getCustomer(session.userId);
            customerId = existing.id;
          } catch {
            return NextResponse.json({ error: 'Failed to create or retrieve customer' }, { status: 500 });
          }
        } else {
          throw error;
        }
      }
    }

    // Generate auth code with redirect URL
    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://hostfi.ai'}/api/integrations/hospitable-connect/callback`;
    const authCode = await createAuthCode(customerId, redirectUrl);

    // Store or update connection record
    if (existingConnection) {
      await supabase
        .from('integration_connections')
        .update({
          metadata: {
            ...existingConnection.metadata,
            hospitable_connect_customer_id: customerId,
          },
          status: 'pending',
          active: false,
        })
        .eq('id', existingConnection.id);
    } else {
      await supabase
        .from('integration_connections')
        .insert({
          user_id: session.userId,
          provider: 'hospitable_connect',
          status: 'pending',
          active: false,
          metadata: {
            hospitable_connect_customer_id: customerId,
          },
        });
    }

    // Return the magic link URL for frontend to redirect
    return NextResponse.json({ 
      url: authCode.return_url,
      customerId,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Hospitable Connect connect error:', message);
    return NextResponse.json({ error: `Connection failed: ${message}` }, { status: 500 });
  }
}

/**
 * GET - Check connection status
 */
export async function GET() {
  try {
    const session = await authenticateRequest();
    if (!session.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    // Get connection record
    const { data: connection } = await supabase
      .from('integration_connections')
      .select('id, metadata, status, active, created_at, last_synced_at')
      .eq('user_id', session.userId)
      .eq('provider', 'hospitable_connect')
      .single();

    if (!connection || (!connection.active && connection.status !== 'connected')) {
      return NextResponse.json({ 
        connected: false,
        status: connection?.status || 'not_connected',
      });
    }

    // Count synced properties
    const { count: syncedCount } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.userId)
      .not('hospitable_connect_listing_id', 'is', null);

    // Get channels if customer ID exists
    let channels: { platform: string; name?: string | null }[] = [];
    const customerId = connection.metadata?.hospitable_connect_customer_id as string | undefined;
    if (customerId) {
      try {
        const channelData = await fetchChannels(customerId);
        channels = channelData.map(c => ({ platform: c.platform, name: c.name }));
      } catch {
        // Ignore channel fetch errors
      }
    }

    return NextResponse.json({
      connected: true,
      status: connection.status,
      connectedAt: connection.created_at,
      lastSyncedAt: connection.last_synced_at,
      syncedCount: syncedCount || 0,
      channels,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Hospitable Connect status error:', message);
    return NextResponse.json({ error: `Status check failed: ${message}` }, { status: 500 });
  }
}

/**
 * DELETE - Disconnect integration
 */
export async function DELETE() {
  try {
    const session = await authenticateRequest();
    if (!session.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    // Get connection record
    const { data: connection } = await supabase
      .from('integration_connections')
      .select('id, metadata')
      .eq('user_id', session.userId)
      .eq('provider', 'hospitable_connect')
      .single();

    if (!connection) {
      return NextResponse.json({ error: 'Not connected' }, { status: 400 });
    }

    // Delete customer from Hospitable Connect API
    const customerId = connection.metadata?.hospitable_connect_customer_id as string | undefined;
    if (customerId) {
      try {
        await deleteCustomer(customerId);
      } catch (error) {
        // Log but don't fail — might already be deleted
        console.warn('Failed to delete Hospitable Connect customer:', error);
      }
    }

    // Mark connection as disconnected (preserve property/revenue data)
    await supabase
      .from('integration_connections')
      .update({
        status: 'disconnected',
        active: false,
      })
      .eq('id', connection.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Hospitable Connect disconnect error:', message);
    return NextResponse.json({ error: `Disconnect failed: ${message}` }, { status: 500 });
  }
}
