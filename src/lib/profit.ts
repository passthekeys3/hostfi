export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Net cash from a booking. Prefer the recorded payout, otherwise gross minus the platform fee. */
export function netPayout(row: {
  amount?: number | null;
  payout_amount?: number | null;
  platform_fee?: number | null;
}): number {
  if (row.payout_amount != null && Number.isFinite(Number(row.payout_amount))) {
    return Number(row.payout_amount);
  }
  return (Number(row.amount) || 0) - (Number(row.platform_fee) || 0);
}

export function profitFromBookings(
  bookings: { amount?: number | null; payout_amount?: number | null; platform_fee?: number | null }[],
  expenses: { amount: number }[],
): { net: number; expenses: number; profit: number; margin: number } {
  const net = roundMoney(bookings.reduce((sum, row) => sum + netPayout(row), 0));
  const costs = roundMoney(expenses.reduce((sum, row) => sum + row.amount, 0));
  const profit = roundMoney(net - costs);
  const margin = net > 0 ? (profit / net) * 100 : 0;
  return { net, expenses: costs, profit, margin };
}
