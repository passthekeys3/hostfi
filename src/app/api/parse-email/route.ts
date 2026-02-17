import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/parse-email
 * 
 * Postmark Inbound Webhook Handler
 * Receives forwarded bills, matches to user by billing email,
 * parses with Claude, and creates expense records.
 * 
 * Postmark JSON payload: https://postmarkapp.com/developer/webhooks/inbound-webhook
 */

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

// Create admin Supabase client (bypasses RLS for webhook processing)
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey);
}

interface PostmarkAttachment {
  Name: string;
  Content: string; // base64
  ContentType: string;
  ContentLength: number;
}

interface PostmarkInboundPayload {
  From: string;
  FromName: string;
  FromFull: { Email: string; Name: string };
  To: string;
  ToFull: { Email: string; Name: string }[];
  Cc: string;
  Subject: string;
  MessageID: string;
  Date: string;
  TextBody: string;
  HtmlBody: string;
  StrippedTextReply: string;
  Attachments: PostmarkAttachment[];
  Headers: { Name: string; Value: string }[];
}

export async function POST(request: NextRequest) {
  // Verify webhook secret in production
  if (process.env.NODE_ENV === 'production' && WEBHOOK_SECRET) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('[parse-email] Supabase not configured');
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }

  let payload: PostmarkInboundPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Extract the recipient email to find the user
  const toAddresses = payload.ToFull?.map(t => t.Email.toLowerCase()) || [];
  const billingEmail = toAddresses.find(email => email.startsWith('expenses-'));

  if (!billingEmail) {
    console.log('[parse-email] No billing email found in recipients');
    return NextResponse.json({ error: 'No matching billing email' }, { status: 404 });
  }

  // Look up user by billing email
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('billing_email', billingEmail)
    .single();

  if (profileError || !profile) {
    console.log('[parse-email] No user found for billing email');
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const userId = profile.id;

  // Store the raw inbound email
  const { data: emailRecord, error: emailError } = await supabase
    .from('inbound_emails')
    .insert({
      user_id: userId,
      from_email: payload.FromFull?.Email || payload.From,
      from_name: payload.FromFull?.Name || payload.FromName,
      subject: payload.Subject,
      body_text: payload.TextBody,
      body_html: payload.HtmlBody,
      attachments: payload.Attachments?.map(a => ({
        name: a.Name,
        type: a.ContentType,
        size: a.ContentLength,
      })),
      parsed: false,
    })
    .select('id')
    .single();

  if (emailError) {
    console.error('[parse-email] Failed to store email:', emailError.message);
    return NextResponse.json({ error: 'Failed to store email' }, { status: 500 });
  }

  // Parse the bill with Claude
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    console.log('[parse-email] No Anthropic key — email stored but not parsed');
    return NextResponse.json({ 
      success: true, 
      emailId: emailRecord.id,
      parsed: false,
      message: 'Email stored, awaiting AI parsing (no API key)',
    });
  }

  try {
    // Get user's properties for matching
    const { data: properties } = await supabase
      .from('properties')
      .select('id, name, address_line1, city, state, zip')
      .eq('user_id', userId);

    const propertyList = properties?.map(p => 
      `ID: ${p.id} | ${p.name} | ${p.address_line1}, ${p.city}, ${p.state} ${p.zip}`
    ).join('\n') || 'No properties found';

    // Build parsing prompt
    const emailContent = payload.TextBody || payload.HtmlBody || '';
    const parsePrompt = `You are parsing a utility bill or expense document forwarded by a rental property operator.

Extract the following fields:
- vendor: The company/provider name
- amount: The total amount due (number only, no $ sign)
- due_date: Due date in YYYY-MM-DD format (null if not found)
- category: One of: utility, cleaning, insurance, maintenance, mortgage, supplies, taxes, management, subscription, improvement, other
- description: Brief description of the expense
- billing_period_start: Start of billing period YYYY-MM-DD (null if not found)
- billing_period_end: End of billing period YYYY-MM-DD (null if not found)
- property_id: Best matching property ID from the list below (null if uncertain)
- confidence: Your confidence in the parsing (0.0 to 1.0)

User's properties:
${propertyList}

Email from: ${payload.FromFull?.Name || ''} <${payload.FromFull?.Email || payload.From}>
Subject: ${payload.Subject}

Email body:
${emailContent.slice(0, 8000)}

Respond with ONLY valid JSON, no markdown or explanation.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        messages: [{ role: 'user', content: parsePrompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const aiResult = await response.json();
    const text = aiResult.content?.[0]?.text || '';
    
    // Parse the JSON response
    const parsed = JSON.parse(text);

    // Create the expense record
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        user_id: userId,
        property_id: parsed.property_id || properties?.[0]?.id,
        category: parsed.category || 'other',
        description: parsed.description || payload.Subject,
        vendor: parsed.vendor,
        amount: parseFloat(parsed.amount) || 0,
        date: new Date().toISOString().split('T')[0],
        due_date: parsed.due_date,
        billing_period_start: parsed.billing_period_start,
        billing_period_end: parsed.billing_period_end,
        source: 'email_parse',
        status: 'pending',
        raw_email_id: emailRecord.id,
        confidence_score: parsed.confidence,
      })
      .select('id')
      .single();

    if (expenseError) {
      console.error('[parse-email] Failed to create expense:', expenseError.message);
      // Still mark email as stored
      return NextResponse.json({ 
        success: true, 
        emailId: emailRecord.id,
        parsed: false,
        error: 'Failed to create expense',
      });
    }

    // Mark email as parsed
    await supabase
      .from('inbound_emails')
      .update({ parsed: true, expense_id: expense.id })
      .eq('id', emailRecord.id);

    return NextResponse.json({ 
      success: true, 
      emailId: emailRecord.id,
      expenseId: expense.id,
      parsed: true,
      data: {
        vendor: parsed.vendor,
        amount: parsed.amount,
        category: parsed.category,
        confidence: parsed.confidence,
      },
    });

  } catch (err) {
    console.error('[parse-email] AI parsing failed:', err);
    
    // Email is stored, just not parsed yet — user can review manually
    return NextResponse.json({ 
      success: true, 
      emailId: emailRecord.id,
      parsed: false,
      message: 'Email stored, AI parsing failed — available for manual review',
    });
  }
}
