import { NextRequest, NextResponse } from 'next/server';
import { parseBillFromText, parseBillFromAttachment } from '@/lib/email-parser';
import { createRateLimiter } from '@/lib/rate-limit';
import { fireWebhookEvent } from '@/lib/integrations/webhooks';

const isRateLimited = createRateLimiter('email-inbound', 60, 60_000); // 60 emails per minute

// Postmark inbound webhook payload types
interface PostmarkAttachment {
  Name: string;
  Content: string; // base64
  ContentType: string;
  ContentLength: number;
}

interface PostmarkInboundPayload {
  From: string;
  FromName: string;
  To: string;
  Subject: string;
  TextBody: string;
  HtmlBody: string;
  Date: string;
  MessageID: string;
  Attachments: PostmarkAttachment[];
  OriginalRecipient: string;
}

function extractInboundAddress(to: string): string | null {
  // Extract the local part from "user@in.hostfi.ai" or "Something <user@in.hostfi.ai>"
  const match = to.match(/<?([^<@\s]+)@in\.hostfi\.ai>?/i);
  return match?.[1]?.toLowerCase() ?? null;
}

async function lookupUserByInboundAddress(addressPrefix: string): Promise<{ userId: string; email: string } | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('inbound_email_prefix', addressPrefix)
    .single();

  if (error || !data) return null;
  return { userId: data.id, email: data.email };
}

async function saveToInbox(
  userId: string,
  parsed: {
    vendor_name: string;
    amount: number;
    due_date: string | null;
    category_suggestion: string;
    confidence: number;
  },
  source: {
    from: string;
    subject: string;
    receivedAt: string;
  }
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return;

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, serviceKey);

  await supabase.from('parsed_emails').insert({
    user_id: userId,
    vendor_name: parsed.vendor_name,
    amount: parsed.amount,
    due_date: parsed.due_date,
    category: parsed.category_suggestion,
    confidence: parsed.confidence,
    source_from: source.from,
    source_subject: source.subject,
    status: parsed.confidence >= 0.8 ? 'ready' : 'needs_review',
    received_at: source.receivedAt,
  });
}

// Postmark's known inbound processing IPs
// https://postmarkapp.com/support/article/800-ips-for-firewalls
const POSTMARK_IPS = new Set([
  '3.134.147.250', '50.31.156.6', '50.31.156.77', '18.217.206.57',
]);

function verifyPostmarkSource(req: NextRequest): boolean {
  // In development, skip IP check
  if (process.env.NODE_ENV !== 'production') return true;
  
  // Check for webhook secret if configured
  const secret = process.env.POSTMARK_WEBHOOK_SECRET;
  if (secret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader === `Bearer ${secret}`) return true;
  }
  
  // Check source IP against Postmark's known IPs
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 
             req.headers.get('x-real-ip') ?? '';
  return POSTMARK_IPS.has(ip);
}

export async function POST(req: NextRequest) {
  // Verify request comes from Postmark
  if (!verifyPostmarkSource(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit by IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  try {
    const payload: PostmarkInboundPayload = await req.json();

    // Basic validation
    if (!payload.To || !payload.MessageID) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Extract the inbound address prefix
    const addressPrefix = extractInboundAddress(payload.To) 
      ?? extractInboundAddress(payload.OriginalRecipient);

    if (!addressPrefix) {
      console.error('Could not extract inbound address from:', payload.To);
      return NextResponse.json({ error: 'Invalid recipient' }, { status: 400 });
    }

    // Look up the user
    const user = await lookupUserByInboundAddress(addressPrefix);
    if (!user) {
      console.error('No user found for inbound prefix:', addressPrefix);
      // Still return 200 so Postmark doesn't retry
      return NextResponse.json({ status: 'no_user_found' }, { status: 200 });
    }

    // Parse the bill - try attachments first (PDFs/images are more reliable)
    let parsed = null;

    const supportedAttachments = payload.Attachments?.filter(a =>
      a.ContentType === 'application/pdf' ||
      a.ContentType.startsWith('image/')
    ) ?? [];

    if (supportedAttachments.length > 0) {
      // Use the first supported attachment
      const attachment = supportedAttachments[0];
      try {
        parsed = await parseBillFromAttachment(attachment.Content, attachment.ContentType);
      } catch (err) {
        console.error('Attachment parsing failed, falling back to text:', err);
      }
    }

    // Fall back to email body text
    if (!parsed) {
      const bodyText = payload.TextBody || payload.HtmlBody?.replace(/<[^>]*>/g, ' ') || '';
      if (bodyText.trim().length < 20) {
        return NextResponse.json({ status: 'no_content' }, { status: 200 });
      }

      const fullText = `From: ${payload.From}\nSubject: ${payload.Subject}\n\n${bodyText}`;
      parsed = await parseBillFromText(fullText);
    }

    // Save to inbox for user review
    await saveToInbox(user.userId, parsed, {
      from: payload.From,
      subject: payload.Subject,
      receivedAt: payload.Date || new Date().toISOString(),
    });

    // Fire webhook event for receipt parsing
    fireWebhookEvent(user.userId, 'receipt.parsed', {
      vendor: parsed.vendor_name,
      amount: parsed.amount,
      due_date: parsed.due_date,
      category: parsed.category_suggestion,
      confidence: parsed.confidence,
      source_from: payload.From,
      source_subject: payload.Subject,
    }).catch(err => console.error('[email-inbound] Webhook error:', err));

    return NextResponse.json({
      status: 'processed',
      vendor: parsed.vendor_name,
      amount: parsed.amount,
      confidence: parsed.confidence,
    });
  } catch (err) {
    console.error('Inbound email processing error:', err);
    // Return 200 to prevent Postmark retries on our errors
    return NextResponse.json({ status: 'error', message: 'Processing failed' }, { status: 200 });
  }
}
