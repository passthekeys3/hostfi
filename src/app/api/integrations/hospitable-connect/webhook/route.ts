/**
 * POST /api/integrations/hospitable-connect/webhook - Webhook handler
 * 
 * Hospitable Connect can send webhooks for various events.
 * For now, we just acknowledge and log. Can add specific handlers later.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    
    console.info('Hospitable Connect webhook received:', JSON.stringify({
      action: body.action || body.event || 'unknown',
      customerId: body.customer_id,
      timestamp: new Date().toISOString(),
    }));

    // Hospitable Connect webhook events are handled by the main Hospitable webhook handler
    // at /api/integrations/hospitable/webhook. This endpoint exists for Connect-specific
    // events (channel.connected, channel.disconnected) which are logged above.

    // Acknowledge receipt
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Hospitable Connect webhook error:', error);
    // Always return 200 to acknowledge receipt even on errors
    return NextResponse.json({ received: true, error: 'Processing failed' });
  }
}

// Also handle GET for webhook verification if needed
export async function GET() {
  return NextResponse.json({ status: 'ok', integration: 'hospitable_connect' });
}
