import { NextRequest, NextResponse } from "next/server";
import { parseBillEmail } from "@/lib/bill-parser";
import { matchBillToProperty } from "@/lib/bill-matcher";
import { createAsyncRateLimiter } from "@/lib/rate-limit";

interface EmailPayload {
  sender: string;
  subject: string;
  text: string;
  html: string;
  attachments: Array<{
    filename: string;
    content_type: string;
    content_base64: string;
  }>;
}

const isRateLimited = createAsyncRateLimiter('parse-bill', 20, 60_000);

function parseSendGrid(body: Record<string, unknown>): EmailPayload {
  return {
    sender: (body.from as string) ?? (body.sender_ip as string) ?? "",
    subject: (body.subject as string) ?? "",
    text: (body.text as string) ?? "",
    html: (body.html as string) ?? "",
    attachments: [],
  };
}

function parsePostmark(body: Record<string, unknown>): EmailPayload {
  return {
    sender: (body.FromFull as Record<string, string>)?.Email ?? (body.From as string) ?? "",
    subject: (body.Subject as string) ?? "",
    text: (body.TextBody as string) ?? "",
    html: (body.HtmlBody as string) ?? "",
    attachments: Array.isArray(body.Attachments)
      ? (body.Attachments as Array<Record<string, string>>).map((a) => ({
          filename: a.Name ?? a.FileName ?? "attachment",
          content_type: a.ContentType ?? "application/octet-stream",
          content_base64: a.Content ?? "",
        }))
      : [],
  };
}

function detectAndParse(body: Record<string, unknown>): EmailPayload {
  if ("FromFull" in body || "TextBody" in body) {
    return parsePostmark(body);
  }
  return parseSendGrid(body);
}

const MAX_PAYLOAD_SIZE = 1_048_576; // 1MB

export async function POST(request: NextRequest) {
  try {
    // Authentication: verify webhook secret (required in production)
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (!webhookSecret && process.env.NODE_ENV === 'production') {
      console.error('WEBHOOK_SECRET not configured in production');
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }
    if (webhookSecret) {
      const providedSecret = request.headers.get("X-Webhook-Secret");
      if (providedSecret !== webhookSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Rate limiting
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (await isRateLimited(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Payload size check
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_SIZE) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error: "ANTHROPIC_API_KEY not configured",
          hint: "Add ANTHROPIC_API_KEY to your .env.local file",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    // Input validation
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const email = detectAndParse(body);

    const emailText = email.text || email.html?.replace(/<[^>]*>/g, " ") || "";
    if (!emailText.trim()) {
      return NextResponse.json({ error: "Empty email body" }, { status: 400 });
    }

    // Parse with AI
    const attachmentDescriptions = email.attachments.map(
      (a) => `[${a.content_type}] ${a.filename}`
    );
    const parsed = await parseBillEmail(
      emailText,
      email.subject,
      email.sender,
      attachmentDescriptions
    );

    // Fetch user's properties for matching
    let properties: Array<{ id: string; address_line1: string; city: string; state: string; zip: string }> = [];
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && serviceKey) {
        const { createClient } = await import('@supabase/supabase-js');
        const admin = createClient(supabaseUrl, serviceKey);
        const { data } = await admin.from('properties').select('id, address_line1, city, state, zip');
        if (data) properties = data;
      }
    } catch (err) {
      console.error('Failed to fetch properties for bill matching:', err);
    }

    // Match to property
    const match = matchBillToProperty(parsed, email.sender, properties as Parameters<typeof matchBillToProperty>[2]);

    // Strip raw_extraction from response
    const { raw_extraction: _raw, ...safeParsed } = parsed;

    return NextResponse.json({
      success: true,
      inbox_item: {
        id: `inbox-${Date.now()}`,
        received_at: new Date().toISOString(),
        sender_email: email.sender,
        subject: email.subject,
        body_preview: emailText.slice(0, 500),
        parsed: safeParsed,
        match,
        status: "pending_review",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
