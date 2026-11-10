export interface PnLRevenue {
  property_id: string;
  amount?: number;
  payout_amount?: number;
  date?: string;
  check_in?: string;
}

export interface PnLExpense {
  property_id: string;
  amount: number;
  date?: string;
}

export interface PnLProperty {
  id: string;
  name: string;
}

export interface PropertyPnLRow {
  property: PnLProperty;
  bookings: number;
  gross: number;
  net: number;
  fees: number;
  expenses: number;
  profit: number;
}

export function inPnLPeriod(date: string | undefined, year: number | "all", month: number | "all"): boolean {
  if (year === "all" && month === "all") return true;
  if (!date || date.length < 7) return false;
  const rowYear = Number(date.slice(0, 4));
  const rowMonth = Number(date.slice(5, 7));
  if (year !== "all" && rowYear !== year) return false;
  if (month !== "all" && rowMonth !== month) return false;
  return true;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function buildPropertyPnL(
  properties: PnLProperty[],
  revenue: PnLRevenue[],
  expenses: PnLExpense[],
  year: number | "all",
  month: number | "all"
): PropertyPnLRow[] {
  return properties.map(property => {
    const bookings = revenue.filter(row =>
      row.property_id === property.id && inPnLPeriod(row.check_in || row.date, year, month)
    );
    const costs = expenses.filter(row =>
      row.property_id === property.id && inPnLPeriod(row.date, year, month)
    );
    const gross = round2(bookings.reduce((sum, row) => sum + (row.amount || 0), 0));
    const net = round2(bookings.reduce((sum, row) => sum + (row.payout_amount ?? row.amount ?? 0), 0));
    const expenseTotal = round2(costs.reduce((sum, row) => sum + row.amount, 0));
    return {
      property,
      bookings: bookings.length,
      gross,
      net,
      fees: round2(gross - net),
      expenses: expenseTotal,
      profit: round2(net - expenseTotal),
    };
  });
}

export function pnlPeriodLabel(year: number | "all", month: number | "all"): string {
  const monthName = month === "all" ? null : new Date(2000, month - 1, 1).toLocaleString("en-US", { month: "long" });
  if (year === "all" && month === "all") return "All time";
  if (year === "all") return monthName || "All time";
  if (!monthName) return String(year);
  return `${monthName} ${year}`;
}
