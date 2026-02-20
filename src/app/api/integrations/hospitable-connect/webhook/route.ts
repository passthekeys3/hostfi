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
    
    // Log the webhook for debugging
    console.log('Hospitable Connect webhook received:', JSON.stringify({
      action: body.action || body.event || 'unknown',
      customerId: body.customer_id,
      timestamp: new Date().toISOString(),
    }));

    // TODO: Add specific handlers for different webhook events
    // Common events might include:
    // - channel.connected
    // - channel.disconnected
    // - reservation.created
    // - reservation.updated
    // - reservation.cancelled
    // - listing.created
    // - listing.updated

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
