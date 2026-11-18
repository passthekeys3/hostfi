/**
 * 1099-NEC vendor rollup.
 * Thresholds follow IRS instructions. This does not file a return and it
 * never accepts a full TIN.
 *
 * 2026: file Form 1099-NEC for nonemployee compensation of at least $2,000.
 * https://www.irs.gov/instructions/i1099mec
 * Payments before 2026 used $600:
 * https://www.irs.gov/businesses/small-businesses-self-employed/am-i-required-to-file-a-form-1099-or-other-information-return
 * After 2026 the IRS adjusts the amount for inflation. This module does not guess it.
 */

export interface NecThreshold {
  taxYear: number;
  /** Null when the IRS has not published a fixed dollar amount this module should hardcode. */
  amount: number | null;
  source: string;
}

const BEFORE_2026 = "IRS: for payments made before 2026, the Form 1099-NEC reporting threshold is $600. https://www.irs.gov/businesses/small-businesses-self-employed/am-i-required-to-file-a-form-1099-or-other-information-return";
const YEAR_2026 = "IRS Instructions for Forms 1099-MISC and 1099-NEC (Rev. December 2026): file Form 1099-NEC for each person to whom you paid at least $2,000 for services. https://www.irs.gov/instructions/i1099mec";
const AFTER_2026 = "IRS Publication 1099: for payments after 2026 the reporting threshold is adjusted for inflation. HostFi does not estimate that amount. https://www.irs.gov/publications/p1099";

export function necThreshold(taxYear: number): NecThreshold {
  if (taxYear < 2026) return { taxYear, amount: 600, source: BEFORE_2026 };
  if (taxYear === 2026) return { taxYear, amount: 2000, source: YEAR_2026 };
  return { taxYear, amount: null, source: AFTER_2026 };
}

export interface VendorPayment {
  vendor: string | null;
  amount: number;
  date: string;
  status: string;
  paidAt?: string | null;
  category: string;
}

export interface VendorTaxProfile {
  vendorKey: string;
  w9OnFile: boolean;
  tinLast4: string | null;
}

export interface VendorRollupRow {
  vendorKey: string;
  vendorName: string;
  amount: number;
  expenseCount: number;
  categories: string[];
  w9OnFile: boolean;
  tinLast4: string | null;
  atOrOverThreshold: boolean | null;
}

export interface VendorRollup {
  threshold: NecThreshold;
  rows: VendorRollupRow[];
  unassignedAmount: number;
  unassignedCount: number;
}

export function vendorKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Accept only four digits. A longer TIN is refused rather than trimmed into storage. */
export function tinLast4OrReject(value: string): { ok: true; last4: string | null } | { ok: false; reason: string } {
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, last4: null };
  if (!/^\d+$/.test(trimmed)) return { ok: false, reason: "Use digits only." };
  if (trimmed.length !== 4) {
    return { ok: false, reason: "Enter only the last 4 digits. HostFi does not store a full TIN." };
  }
  return { ok: true, last4: trimmed };
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function isPaid(payment: VendorPayment): boolean {
  return payment.status === "paid" || Boolean(payment.paidAt);
}

export function rollupVendors(
  payments: VendorPayment[],
  profiles: VendorTaxProfile[],
  taxYear: number
): VendorRollup {
  const threshold = necThreshold(taxYear);
  const profileByKey = new Map(profiles.map(profile => [profile.vendorKey, profile]));
  const groups = new Map<string, { spellings: Map<string, number>; amount: number; count: number; categories: Set<string> }>();
  let unassignedAmount = 0;
  let unassignedCount = 0;

  for (const payment of payments) {
    if (!isPaid(payment)) continue;
    if (!payment.date || Number(payment.date.slice(0, 4)) !== taxYear) continue;
    const raw = payment.vendor?.trim() || "";
    if (!raw) {
      unassignedAmount = roundMoney(unassignedAmount + (payment.amount || 0));
      unassignedCount += 1;
      continue;
    }
    const key = vendorKey(raw);
    let group = groups.get(key);
    if (!group) {
      group = { spellings: new Map(), amount: 0, count: 0, categories: new Set() };
      groups.set(key, group);
    }
    group.spellings.set(raw, (group.spellings.get(raw) || 0) + 1);
    group.amount = roundMoney(group.amount + (payment.amount || 0));
    group.count += 1;
    if (payment.category) group.categories.add(payment.category);
  }

  const rows = [...groups.entries()].map(([key, group]) => {
    let vendorName = key;
    let seen = -1;
    for (const [spelling, count] of group.spellings) {
      if (count > seen) {
        vendorName = spelling;
        seen = count;
      }
    }
    const profile = profileByKey.get(key);
    const atOrOverThreshold = threshold.amount == null ? null : group.amount >= threshold.amount;
    return {
      vendorKey: key,
      vendorName,
      amount: group.amount,
      expenseCount: group.count,
      categories: [...group.categories].sort(),
      w9OnFile: profile?.w9OnFile || false,
      tinLast4: profile?.tinLast4 || null,
      atOrOverThreshold,
    };
  }).sort((a, b) => b.amount - a.amount || a.vendorName.localeCompare(b.vendorName));

  return { threshold, rows, unassignedAmount, unassignedCount };
}

function csvCell(value: string | number | null): string {
  if (value == null) return "";
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function necRollupCsv(rollup: VendorRollup): string {
  const header = [
    "Tax year",
    "Payee name",
    "TIN last 4",
    "W-9 on file",
    "Amount paid",
    "Expense count",
    "Categories",
    "At or over reporting threshold",
    "Threshold",
    "Threshold source",
  ];
  const body = rollup.rows.map(row => [
    rollup.threshold.taxYear,
    row.vendorName,
    row.tinLast4 || "",
    row.w9OnFile ? "yes" : "no",
    row.amount.toFixed(2),
    row.expenseCount,
    row.categories.join("; "),
    row.atOrOverThreshold == null ? "" : row.atOrOverThreshold ? "yes" : "no",
    rollup.threshold.amount == null ? "" : rollup.threshold.amount.toFixed(2),
    rollup.threshold.source,
  ].map(csvCell).join(","));
  const disclaimer = csvCell("This file is a worksheet for a 1099 filing service. HostFi did not file Form 1099-NEC. It stores at most the last 4 digits of a TIN, not a full SSN or EIN. Backup withholding is not tracked. Corporations and some payees are exempt; this export does not decide that.");
  return [disclaimer, header.map(csvCell).join(","), ...body].join("\n");
}
