import type { ExpenseCategory } from "@/lib/expense-categories";

export interface ParsedReceipt {
  vendor_name: string;
  amount: number;
  date: string | null;
  category_suggestion: ExpenseCategory;
  items: Array<{
    description: string;
    amount: number;
  }>;
  payment_method?: string;
  tax_amount?: number;
  subtotal?: number;
  confidence: number;
  raw_text?: string;
}

const RECEIPT_SYSTEM_PROMPT = `You are a receipt parser for a property management expense tracker. Extract structured data from receipt images or text.

Return ONLY valid JSON with this exact structure:
{
  "vendor_name": "string - business name (e.g. The Home Depot, Target, Lowe's)",
  "amount": number - total amount charged,
  "date": "YYYY-MM-DD or null",
  "category_suggestion": "string - one of: utility, cleaning, insurance, maintenance, mortgage, supplies, taxes, management, subscription, improvement, other",
  "items": [{"description": "string", "amount": number}],
  "payment_method": "string or null - e.g. Visa ending 4521",
  "tax_amount": number or null,
  "subtotal": number or null,
  "confidence": number between 0 and 1,
  "raw_text": "string - the text you read from the receipt"
}

Category inference rules:
- Hardware stores (Home Depot, Lowe's, Ace) → "maintenance" or "supplies" depending on items
- Cleaning services, maid services → "cleaning"
- Insurance companies, policy payments → "insurance"
- Plumbers, electricians, HVAC, handyman → "maintenance"
- Toiletries, linens, consumables, Amazon household → "supplies"
- Property tax, TOT, lodging tax → "taxes"
- Software, SaaS, smart lock subscriptions → "subscription"
- Renovation materials, furniture, appliances → "improvement"
- Property management, co-host fees → "management"
- Utility companies (electric, gas, water, internet) → "utility"
- Mortgage/rent payments → "mortgage"
- If unclear, use "other"

Rules:
- Use the TOTAL amount (including tax), not subtotal
- Parse all visible line items
- Set confidence based on image quality and data clarity
- If a field is unreadable, use null`;

export async function parseReceipt(
  imageBase64: string,
  mimeType: string = "image/jpeg"
): Promise<ParsedReceipt> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('AI not configured: ANTHROPIC_API_KEY is required for receipt parsing');
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
      max_tokens: 2048,
      system: RECEIPT_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType,
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: "Parse this receipt and extract all data. Return only JSON.",
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
  const text =
    data.content?.[0]?.type === "text" ? data.content[0].text : "";

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to extract JSON from AI response");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    vendor_name: parsed.vendor_name ?? "Unknown",
    amount: typeof parsed.amount === "number" ? parsed.amount : 0,
    date: parsed.date ?? null,
    category_suggestion: parsed.category_suggestion ?? "other",
    items: Array.isArray(parsed.items) ? parsed.items : [],
    payment_method: parsed.payment_method ?? undefined,
    tax_amount: typeof parsed.tax_amount === "number" ? parsed.tax_amount : undefined,
    subtotal: typeof parsed.subtotal === "number" ? parsed.subtotal : undefined,
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
    raw_text: parsed.raw_text ?? undefined,
  };
}
