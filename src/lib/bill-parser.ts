import type { ParsedBill } from "@/lib/types";

const SYSTEM_PROMPT = `You are a utility bill parser. Extract structured data from bill emails.

Return ONLY valid JSON with this exact structure:
{
  "provider_name": "string - company name (e.g. SoCalGas, LADWP, SCE)",
  "utility_type": "string - one of: electric, gas, water, internet, trash, rent, insurance, other",
  "amount": number,
  "due_date": "YYYY-MM-DD or null",
  "billing_period_start": "YYYY-MM-DD or null",
  "billing_period_end": "YYYY-MM-DD or null",
  "account_number": "string or null",
  "service_address": "string - full address or null",
  "confidence": number between 0 and 1
}

Rules:
- Extract the TOTAL amount due, not individual line items
- For dates, convert to ISO format (YYYY-MM-DD)
- If multiple amounts exist, use the total/amount due
- Set confidence based on how clearly the data was extractable
- If a field is ambiguous or missing, use null
- For utility_type, infer from provider name and context if not explicit`;

export async function parseBillEmail(
  emailBody: string,
  subject: string,
  senderEmail: string,
  attachmentDescriptions?: string[]
): Promise<ParsedBill> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to your .env.local file."
    );
  }

  const userMessage = [
    `From: ${senderEmail}`,
    `Subject: ${subject}`,
    "",
    "Email Body:",
    emailBody,
    ...(attachmentDescriptions?.length
      ? ["", "Attachments:", ...attachmentDescriptions]
      : []),
  ].join("\n");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const text =
    data.content?.[0]?.type === "text" ? data.content[0].text : "";

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to extract JSON from AI response");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    provider_name: parsed.provider_name ?? "Unknown",
    utility_type: parsed.utility_type ?? "other",
    amount: typeof parsed.amount === "number" ? parsed.amount : 0,
    due_date: parsed.due_date ?? null,
    billing_period_start: parsed.billing_period_start ?? null,
    billing_period_end: parsed.billing_period_end ?? null,
    account_number: parsed.account_number ?? null,
    service_address: parsed.service_address ?? null,
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
    raw_extraction: data,
  };
}
