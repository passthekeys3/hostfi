import { DEMO_PROPERTIES } from "@/lib/types";

export interface ParsedBill {
  provider_name: string;
  utility_type: string;
  amount: number;
  due_date: string | null;
  billing_period_start: string | null;
  billing_period_end: string | null;
  account_number: string | null;
  service_address: string | null;
  confidence: number;
  raw_extraction: object;
}

export interface MatchResult {
  property_id: string | null;
  utility_account_id: string | null;
  match_type: "exact_mapping" | "address" | "account_number" | "none";
  confidence: number;
  candidates: Array<{ property_id: string; score: number; reason: string }>;
}

export interface InboxItem {
  id: string;
  received_at: string;
  sender_email: string;
  subject: string;
  body_preview: string;
  parsed: ParsedBill;
  match: MatchResult;
  status: "pending_review" | "confirmed" | "rejected";
}

export const DEMO_INBOX_ITEMS: InboxItem[] = [
  {
    id: "inbox-1",
    received_at: "2026-02-07T10:30:00Z",
    sender_email: "billing@socalgascompany.com",
    subject: "Your January 2026 Bill is Ready",
    body_preview:
      "Dear Customer,\n\nYour SoCalGas bill for the period of January 1–31, 2026 is now available. Your total amount due is $47.83, payable by February 20, 2026.\n\nAccount: 1234567890\nService Address: 1234 Abbot Kinney Blvd, Venice, CA 90291\n\nThank you for choosing SoCalGas.",
    parsed: {
      provider_name: "SoCalGas",
      utility_type: "gas",
      amount: 47.83,
      due_date: "2026-02-20",
      billing_period_start: "2026-01-01",
      billing_period_end: "2026-01-31",
      account_number: "1234567890",
      service_address: "1234 Abbot Kinney Blvd, Venice, CA 90291",
      confidence: 0.95,
      raw_extraction: {},
    },
    match: {
      property_id: "1",
      utility_account_id: null,
      match_type: "address",
      confidence: 0.92,
      candidates: [
        { property_id: "1", score: 0.92, reason: "Address partial match: Venice, CA" },
      ],
    },
    status: "pending_review",
  },
  {
    id: "inbox-2",
    received_at: "2026-02-06T14:15:00Z",
    sender_email: "noreply@ladwp.com",
    subject: "LADWP Bill - Account ending 4521",
    body_preview:
      "Your LADWP water bill is ready.\n\nAmount Due: $62.17\nDue Date: February 25, 2026\nAccount: ****4521\nService: 4567 Sunset Blvd, Los Angeles, CA 90026\n\nPay online at ladwp.com",
    parsed: {
      provider_name: "LADWP",
      utility_type: "water",
      amount: 62.17,
      due_date: "2026-02-25",
      billing_period_start: "2026-01-05",
      billing_period_end: "2026-02-04",
      account_number: "9876544521",
      service_address: "4567 Sunset Blvd, Los Angeles, CA 90026",
      confidence: 0.88,
      raw_extraction: {},
    },
    match: {
      property_id: "2",
      utility_account_id: null,
      match_type: "address",
      confidence: 0.85,
      candidates: [
        { property_id: "2", score: 0.85, reason: "Address match: 4567 Sunset Blvd, Los Angeles, CA 90026" },
      ],
    },
    status: "pending_review",
  },
  {
    id: "inbox-3",
    received_at: "2026-02-05T09:00:00Z",
    sender_email: "billing@edison.com",
    subject: "Your SCE Statement",
    body_preview:
      "Southern California Edison\nMonthly Statement\n\nAccount: 3456789012\nService Address: 1234 Abbot Kinney Blvd, Venice, CA 90291\nBilling Period: Dec 20, 2025 – Jan 19, 2026\n\nTotal Due: $134.92\nDue by: February 18, 2026",
    parsed: {
      provider_name: "Southern California Edison",
      utility_type: "electric",
      amount: 134.92,
      due_date: "2026-02-18",
      billing_period_start: "2025-12-20",
      billing_period_end: "2026-01-19",
      account_number: "3456789012",
      service_address: "1234 Abbot Kinney Blvd, Venice, CA 90291",
      confidence: 0.97,
      raw_extraction: {},
    },
    match: {
      property_id: "1",
      utility_account_id: null,
      match_type: "address",
      confidence: 0.92,
      candidates: [
        { property_id: "1", score: 0.92, reason: "Address partial match: Venice, CA" },
      ],
    },
    status: "pending_review",
  },
  {
    id: "inbox-4",
    received_at: "2026-02-04T16:45:00Z",
    sender_email: "autopay@spectrum.net",
    subject: "Spectrum Internet - Payment Confirmation",
    body_preview:
      "Spectrum\n\nYour monthly internet bill is ready.\n\nAmount: $79.99\nDue Date: February 10, 2026\nService Address: 4567 Sunset Blvd, Los Angeles, CA 90026\n\nAutomatic payment will be processed on the due date.",
    parsed: {
      provider_name: "Spectrum",
      utility_type: "internet",
      amount: 79.99,
      due_date: "2026-02-10",
      billing_period_start: "2026-02-01",
      billing_period_end: "2026-02-28",
      account_number: null,
      service_address: "4567 Sunset Blvd, Los Angeles, CA 90026",
      confidence: 0.82,
      raw_extraction: {},
    },
    match: {
      property_id: "2",
      utility_account_id: "ua4",
      match_type: "account_number",
      confidence: 0.78,
      candidates: [
        { property_id: "2", score: 0.78, reason: "Provider match: Spectrum" },
      ],
    },
    status: "pending_review",
  },
  {
    id: "inbox-5",
    received_at: "2026-02-03T11:20:00Z",
    sender_email: "statements@landlord.com",
    subject: "February 2026 Rent Statement",
    body_preview:
      "Pacific Property Management\n\nRent Statement for February 2026\n\nTenant: Demo User\nUnit: 1234 Abbot Kinney Blvd, Venice, CA 90291\nAmount Due: $3,200.00\nDue Date: February 1, 2026\n\nPlease remit payment promptly.",
    parsed: {
      provider_name: "Pacific Property Management",
      utility_type: "rent",
      amount: 3200.0,
      due_date: "2026-02-01",
      billing_period_start: "2026-02-01",
      billing_period_end: "2026-02-28",
      account_number: "UNIT-1425",
      service_address: "1234 Abbot Kinney Blvd, Venice, CA 90291",
      confidence: 0.91,
      raw_extraction: {},
    },
    match: {
      property_id: "1",
      utility_account_id: null,
      match_type: "exact_mapping",
      confidence: 1.0,
      candidates: [
        { property_id: "1", score: 1.0, reason: "Known sender mapping" },
      ],
    },
    status: "pending_review",
  },
];

export function getPropertyName(propertyId: string | null): string {
  if (!propertyId) return "Unmatched";
  const prop = DEMO_PROPERTIES.find((p) => p.id === propertyId);
  return prop?.name ?? "Unknown Property";
}
