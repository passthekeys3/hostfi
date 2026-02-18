import type { ParsedBill, MatchResult, Property, UtilityAccount } from "@/lib/types";

// Simple string similarity (Dice coefficient)
function similarity(a: string, b: string): number {
  const sa = a.toLowerCase().trim();
  const sb = b.toLowerCase().trim();
  if (sa === sb) return 1;
  if (sa.length < 2 || sb.length < 2) return 0;

  const bigrams = new Map<string, number>();
  for (let i = 0; i < sa.length - 1; i++) {
    const bigram = sa.substring(i, i + 2);
    bigrams.set(bigram, (bigrams.get(bigram) ?? 0) + 1);
  }

  let matches = 0;
  for (let i = 0; i < sb.length - 1; i++) {
    const bigram = sb.substring(i, i + 2);
    const count = bigrams.get(bigram) ?? 0;
    if (count > 0) {
      bigrams.set(bigram, count - 1);
      matches++;
    }
  }

  return (2 * matches) / (sa.length - 1 + sb.length - 1);
}

export function matchBillToProperty(
  parsed: ParsedBill,
  senderEmail: string,
  properties: Property[],
  utilityAccounts: UtilityAccount[] = [],
  billMappings: Record<string, string> = {}
): MatchResult {
  const candidates: Array<{ property_id: string; score: number; reason: string }> = [];

  // 1. Exact mapping lookup
  const mappedProperty = billMappings[senderEmail];
  if (mappedProperty) {
    return {
      property_id: mappedProperty,
      utility_account_id: null,
      match_type: "exact_mapping",
      confidence: 1.0,
      candidates: [{ property_id: mappedProperty, score: 1.0, reason: "Known sender mapping" }],
    };
  }

  // 2. Account number matching
  if (parsed.account_number) {
    const matchedAccount = utilityAccounts.find(
      (ua) => ua.account_number === parsed.account_number
    );
    if (matchedAccount) {
      return {
        property_id: matchedAccount.property_id,
        utility_account_id: matchedAccount.id,
        match_type: "account_number",
        confidence: 0.95,
        candidates: [
          {
            property_id: matchedAccount.property_id,
            score: 0.95,
            reason: `Account number match: ${parsed.account_number}`,
          },
        ],
      };
    }
  }

  // 3. Address matching
  if (parsed.service_address) {
    for (const prop of properties) {
      const fullAddress = [prop.address_line1, prop.city, prop.state, prop.zip]
        .filter(Boolean)
        .join(", ");
      const score = similarity(parsed.service_address, fullAddress);
      if (score > 0.3) {
        candidates.push({
          property_id: prop.id,
          score,
          reason: `Address similarity: ${(score * 100).toFixed(0)}%`,
        });
      }
    }
  }

  // Sort candidates by score
  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length > 0 && candidates[0].score > 0.5) {
    return {
      property_id: candidates[0].property_id,
      utility_account_id: null,
      match_type: "address",
      confidence: candidates[0].score,
      candidates,
    };
  }

  return {
    property_id: null,
    utility_account_id: null,
    match_type: "none",
    confidence: 0,
    candidates,
  };
}
