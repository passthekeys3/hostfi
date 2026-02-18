import type { ExpenseCategory } from "@/lib/expense-categories";

export interface ParsedBill {
  vendor_name: string;
  amount: number;
  due_date: string | null;
  billing_period: string | null;
  category_suggestion: ExpenseCategory;
  account_number: string | null;
  confidence: number;
  raw_text?: string;
}

const BILL_SYSTEM_PROMPT = `You are a bill/invoice parser for a property management expense tracker. Extract structured data from forwarded utility bills, invoices, and statements.

Return ONLY valid JSON with this exact structure:
{
  "vendor_name": "string - company name (e.g. SoCalGas, Florida Power & Light, Spectrum)",
  "amount": number - amount due,
  "due_date": "YYYY-MM-DD or null",
  "billing_period": "string or null - e.g. Jan 1 - Jan 31, 2026",
  "category_suggestion": "string - one of: utility, cleaning, insurance, maintenance, mortgage, supplies, taxes, management, subscription, improvement, other",
  "account_number": "string or null - last 4 digits if visible",
  "confidence": number between 0 and 1,
  "raw_text": "string - key text you extracted"
}

Category inference rules:
- Electric, gas, water, sewer, trash, internet, cable, phone → "utility"
- Insurance companies, policy renewals → "insurance"
- Property tax, HOA, lodging tax, TOT → "taxes"
- Cleaning services, maid services → "cleaning"
- Plumbers, electricians, HVAC, handyman, contractors → "maintenance"
- Software, SaaS, smart locks, PMS fees → "subscription"
- Property management, co-host fees → "management"
- Mortgage, rent payments → "mortgage"
- Hardware stores, renovation → "improvement"
- Household supplies, linens, toiletries → "supplies"
- If unclear, use "other"

Rules:
- Use the TOTAL AMOUNT DUE, not previous balance or partial amounts
- Extract the due date, not the statement date
- Set confidence based on how clearly you can read the data
- If a field is unreadable, use null`;

export async function parseBillFromText(emailBody: string): Promise<ParsedBill> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('AI not configured: ANTHROPIC_API_KEY is required for bill parsing');
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-3-5-20241022",
      max_tokens: 1024,
      system: BILL_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Parse this forwarded bill/invoice email and extract the billing data. Return only JSON.\n\n---\n${emailBody.slice(0, 8000)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.type === "text" ? data.content[0].text : "";

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to extract JSON from AI response");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    vendor_name: parsed.vendor_name ?? "Unknown",
    amount: typeof parsed.amount === "number" ? parsed.amount : 0,
    due_date: parsed.due_date ?? null,
    billing_period: parsed.billing_period ?? null,
    category_suggestion: parsed.category_suggestion ?? "other",
    account_number: parsed.account_number ?? null,
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
    raw_text: parsed.raw_text ?? undefined,
  };
}

export async function parseBillFromAttachment(
  base64Content: string,
  contentType: string
): Promise<ParsedBill> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('AI not configured: ANTHROPIC_API_KEY is required for bill parsing');
  }

  // For PDFs, we extract text and parse. For images, use vision.
  if (contentType === "application/pdf") {
    // Claude can handle PDFs via document type
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-3-5-20241022",
        max_tokens: 1024,
        system: BILL_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: base64Content,
                },
              },
              {
                type: "text",
                text: "Parse this bill/invoice document and extract the billing data. Return only JSON.",
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.type === "text" ? data.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Failed to extract JSON from AI response");
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      vendor_name: parsed.vendor_name ?? "Unknown",
      amount: typeof parsed.amount === "number" ? parsed.amount : 0,
      due_date: parsed.due_date ?? null,
      billing_period: parsed.billing_period ?? null,
      category_suggestion: parsed.category_suggestion ?? "other",
      account_number: parsed.account_number ?? null,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
      raw_text: parsed.raw_text ?? undefined,
    };
  }

  // Image attachments (PNG, JPEG)
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-3-5-20241022",
      max_tokens: 1024,
      system: BILL_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: contentType,
                data: base64Content,
              },
            },
            {
              type: "text",
              text: "Parse this bill/invoice and extract the billing data. Return only JSON.",
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.type === "text" ? data.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to extract JSON from AI response");
  const parsed = JSON.parse(jsonMatch[0]);

  return {
    vendor_name: parsed.vendor_name ?? "Unknown",
    amount: typeof parsed.amount === "number" ? parsed.amount : 0,
    due_date: parsed.due_date ?? null,
    billing_period: parsed.billing_period ?? null,
    category_suggestion: parsed.category_suggestion ?? "other",
    account_number: parsed.account_number ?? null,
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
    raw_text: parsed.raw_text ?? undefined,
  };
}
