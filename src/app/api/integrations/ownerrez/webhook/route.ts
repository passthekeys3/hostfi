import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * OwnerRez Webhook Handler
 * POST /api/integrations/ownerrez/webhook
 * 
 * Receives notifications when:
 * - OAuth app access is revoked by user
 * - Entities change (bookings, properties, guests, etc.)
 * 
 * OwnerRez sends Basic Auth (configured in OAuth App settings).
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook auth
    const authHeader = request.headers.get('authorization');
    const expectedUser = process.env.OWNERREZ_WEBHOOK_USER;
    const expectedPass = process.env.OWNERREZ_WEBHOOK_PASSWORD;

    if (expectedUser && expectedPass) {
      const expected = 'Basic ' + Buffer.from(`${expectedUser}:${expectedPass}`).toString('base64');
      if (authHeader !== expected) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await request.json();
    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    // Handle different webhook event types
    const eventType = body.event || body.type || body.action;

    // App revocation: user disconnected HostFi from their OwnerRez
    if (eventType === 'app_revoked' || eventType === 'revoked') {
      const userId = body.user_id || body.userId;
      if (userId) {
        await supabase.from('integration_connections')
          .update({ status: 'disconnected', credentials: null, active: false })
          .eq('provider', 'ownerrez')
          .eq('user_id', userId);
      }
      return NextResponse.json({ received: true });
    }

    // Entity change notifications (bookings, properties, etc.)
    // Log for now — can trigger auto-sync later
    console.log('OwnerRez webhook event:', JSON.stringify(body));

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('OwnerRez webhook error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
