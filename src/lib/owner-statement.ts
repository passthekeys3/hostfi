/**
 * Gross-to-net statements for an owner, a co-host split, or an arbitrage operator.
 * Figures come from bookings and expenses already in HostFi, plus the fee the
 * account holder configures. Nothing here is a tax filing.
 */

import { categoryScheduleELine } from "./tax-mapping";
import { inPnLPeriod, pnlPeriodLabel } from "./property-pnl";
import { isBankDeposit } from "./payout-reconciliation";

export type FeeBasis = "gross" | "after_platform_fees";
export type FlatCadence = "period" | "booking";

export interface StatementProperty {
  id: string;
  name: string;
  propertyType: "str" | "ltr" | "primary" | "arbitrage";
}

export interface StatementBooking {
  propertyId: string;
  date: string;
  checkIn?: string | null;
  amount: number;
  platformFee?: number | null;
  payoutAmount?: number | null;
  notes?: string | null;
}

export interface StatementExpense {
  propertyId: string;
  date: string;
  amount: number;
  category: string;
}

export interface StatementTerms {
  propertyId: string;
  feePercent: number;
  feeFlat: number;
  feeBasis: FeeBasis;
  flatPer: FlatCadence;
}

export interface OwnerStatement {
  propertyId: string;
  propertyName: string;
  propertyType: StatementProperty["propertyType"];
  periodLabel: string;
  bookingCount: number;
  gross: number;
  platformFees: number;
  platformFeesRecorded: boolean;
  feeBasisAmount: number;
  feePercent: number;
  percentFee: number;
  flatFee: number;
  managementFee: number;
  rentPaid: number;
  rentScheduleELine: number;
  otherExpenses: number;
  recordedManagement: number;
  recordedManagementSubtracted: boolean;
  expensesSubtracted: number;
  netToOwner: number;
  notes: string[];
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function bookingFee(booking: StatementBooking): number {
  if (booking.platformFee != null && Number.isFinite(booking.platformFee)) {
    return Math.max(0, booking.platformFee);
  }
  if (booking.payoutAmount != null && Number.isFinite(booking.payoutAmount)) {
    return Math.max(0, (booking.amount || 0) - booking.payoutAmount);
  }
  return 0;
}

function bookingDate(booking: StatementBooking): string | undefined {
  return booking.checkIn || booking.date || undefined;
}

export function buildOwnerStatements(
  properties: StatementProperty[],
  bookings: StatementBooking[],
  expenses: StatementExpense[],
  terms: StatementTerms[],
  year: number | "all",
  month: number | "all"
): OwnerStatement[] {
  const termsByProperty = new Map(terms.map(term => [term.propertyId, term]));
  const periodLabel = pnlPeriodLabel(year, month);

  return properties.flatMap(property => {
    const stays = bookings.filter(booking =>
      booking.propertyId === property.id
      && !isBankDeposit(booking)
      && inPnLPeriod(bookingDate(booking), year, month)
    );
    const costs = expenses.filter(expense =>
      expense.propertyId === property.id && inPnLPeriod(expense.date, year, month)
    );
    const term = termsByProperty.get(property.id);
    const feePercent = term?.feePercent && term.feePercent > 0 ? term.feePercent : 0;
    const feeFlat = term?.feeFlat && term.feeFlat > 0 ? term.feeFlat : 0;
    const configured = feePercent > 0 || feeFlat > 0;
    if (stays.length === 0 && costs.length === 0 && !configured) return [];

    const gross = roundMoney(stays.reduce((sum, stay) => sum + (stay.amount || 0), 0));
    const platformFees = roundMoney(stays.reduce((sum, stay) => sum + bookingFee(stay), 0));
    const platformFeesRecorded = stays.some(stay => bookingFee(stay) > 0);
    const basis = term?.feeBasis === "after_platform_fees" ? "after_platform_fees" : "gross";
    const feeBasisAmount = basis === "gross" ? gross : roundMoney(Math.max(0, gross - platformFees));
    const percentFee = roundMoney(feeBasisAmount * feePercent / 100);
    const flatFee = term?.flatPer === "booking" ? roundMoney(feeFlat * stays.length) : roundMoney(feeFlat);
    const managementFee = roundMoney(percentFee + flatFee);
    const rentPaid = roundMoney(costs.filter(cost => cost.category === "rent").reduce((sum, cost) => sum + cost.amount, 0));
    const recordedManagement = roundMoney(costs.filter(cost => cost.category === "management").reduce((sum, cost) => sum + cost.amount, 0));
    const otherExpenses = roundMoney(costs
      .filter(cost => cost.category !== "rent" && cost.category !== "management")
      .reduce((sum, cost) => sum + cost.amount, 0));
    const recordedManagementSubtracted = !(managementFee > 0);
    const expensesSubtracted = roundMoney(otherExpenses + rentPaid + (recordedManagementSubtracted ? recordedManagement : 0));
    const netToOwner = roundMoney(gross - platformFees - managementFee - expensesSubtracted);
    const notes: string[] = [];
    if (stays.length > 0 && !platformFeesRecorded) {
      notes.push("No platform fee was recorded on these bookings, so that line is zero.");
    }
    if (managementFee > 0 && recordedManagement > 0) {
      notes.push("Management expenses already in the books are listed and not subtracted again, because a co-host fee is set for this property.");
    }
    if (property.propertyType === "arbitrage") {
      notes.push("Rent paid to the landlord is an operating expense on Schedule E line 19. It is not a co-host split.");
    }
    if (term?.flatPer !== "booking" && feeFlat > 0) {
      notes.push("The flat fee is once for the period selected, not once per month inside a full-year view.");
    }

    return [{
      propertyId: property.id,
      propertyName: property.name,
      propertyType: property.propertyType,
      periodLabel,
      bookingCount: stays.length,
      gross,
      platformFees,
      platformFeesRecorded,
      feeBasisAmount,
      feePercent,
      percentFee,
      flatFee,
      managementFee,
      rentPaid,
      rentScheduleELine: categoryScheduleELine("rent", property.propertyType),
      otherExpenses,
      recordedManagement,
      recordedManagementSubtracted,
      expensesSubtracted,
      netToOwner,
      notes,
    }];
  });
}

function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function ownerStatementCsv(rows: OwnerStatement[]): string {
  const header = [
    "Property",
    "Property type",
    "Period",
    "Bookings",
    "Gross bookings",
    "Platform fees",
    "Co-host or management fee",
    "Fee percent",
    "Rent paid",
    "Rent Schedule E line",
    "Other expenses",
    "Recorded management expenses",
    "Recorded management subtracted",
    "Net to owner",
    "Notes",
  ];
  const body = rows.map(row => [
    row.propertyName,
    row.propertyType,
    row.periodLabel,
    row.bookingCount,
    row.gross.toFixed(2),
    row.platformFees.toFixed(2),
    row.managementFee.toFixed(2),
    row.feePercent,
    row.rentPaid.toFixed(2),
    row.rentPaid > 0 ? row.rentScheduleELine : "",
    row.otherExpenses.toFixed(2),
    row.recordedManagement.toFixed(2),
    row.recordedManagementSubtracted ? "yes" : "no",
    row.netToOwner.toFixed(2),
    row.notes.join(" "),
  ].map(csvCell).join(","));
  const disclaimer = csvCell("Statement from HostFi records. Not a tax filing and not a payment. Co-host fees are the percent and flat amount saved for the property.");
  return [disclaimer, header.map(csvCell).join(","), ...body].join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function ownerStatementHtml(rows: OwnerStatement[]): string {
  const period = rows[0]?.periodLabel || "";
  const body = rows.map(row => `
    <section>
      <h2>${escapeHtml(row.propertyName)}</h2>
      <p class="sub">${escapeHtml(row.propertyType)} · ${escapeHtml(row.periodLabel)} · ${row.bookingCount} bookings</p>
      <table>
        <tbody>
          <tr><td>Gross bookings</td><td class="right">${row.gross.toFixed(2)}</td></tr>
          <tr><td>Platform fees</td><td class="right">${row.platformFees.toFixed(2)}</td></tr>
          <tr><td>Co-host / management fee</td><td class="right">${row.managementFee.toFixed(2)}</td></tr>
          <tr><td>Rent paid${row.rentPaid > 0 ? ` (Schedule E line ${row.rentScheduleELine})` : ""}</td><td class="right">${row.rentPaid.toFixed(2)}</td></tr>
          <tr><td>Other expenses</td><td class="right">${row.otherExpenses.toFixed(2)}</td></tr>
          <tr><td>Management expenses already recorded${row.recordedManagementSubtracted ? "" : " (not subtracted again)"}</td><td class="right">${row.recordedManagement.toFixed(2)}</td></tr>
          <tr class="total"><td>Net to owner</td><td class="right">${row.netToOwner.toFixed(2)}</td></tr>
        </tbody>
      </table>
      ${row.notes.map(note => `<p class="note">${escapeHtml(note)}</p>`).join("")}
    </section>
  `).join("");
  return `<!DOCTYPE html><html><head><title>HostFi owner statement</title><style>
    body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:40px;color:#111}
    h1{font-size:20px;margin-bottom:4px} h2{font-size:16px;margin:24px 0 0}
    .sub{color:#666;font-size:13px;margin:4px 0 12px}
    table{width:100%;border-collapse:collapse;font-size:13px;max-width:560px}
    td{padding:8px 0;border-bottom:1px solid #f3f4f6}
    .right{text-align:right;font-variant-numeric:tabular-nums}
    .total{font-weight:600;border-top:2px solid #e5e7eb}
    .note{font-size:12px;color:#444;max-width:560px}
    .footer{margin-top:32px;font-size:11px;color:#666}
  </style></head><body>
    <h1>Owner statement</h1>
    <p class="sub">${escapeHtml(period)}. Generated from HostFi records.</p>
    ${body}
    <p class="footer">HostFi is not paying this amount and this is not a tax filing. Rent on an arbitrage property is Schedule E line 19.</p>
  </body></html>`;
}
