/**
 * Compare gross booking records with the net amount that should hit the bank.
 * Occupancy tax and refunds are not columns on revenue, so those stay at zero
 * until the user types them. Bank deposits are revenue rows imported from Plaid.
 */

export interface ReconciliationBooking {
  platform: string;
  date: string;
  amount: number;
  platformFee: number | null;
  notes?: string | null;
  source?: string | null;
}

export interface UserReconciliationInputs {
  form1099kGross: number | null;
  occupancyTax: number;
  adjustments: number;
}

export interface PlatformReconciliation {
  platform: string;
  bookingCount: number;
  grossBookings: number;
  platformFees: number;
  feesRecorded: boolean;
  occupancyTax: number;
  adjustments: number;
  expectedPayout: number;
  depositCount: number;
  bankDeposits: number;
  gap: number;
  form1099kGross: number | null;
  formVsBookings: number | null;
  notes: string[];
}

export function isBankDeposit(row: { notes?: string | null }): boolean {
  return (row.notes || '').startsWith('Imported from Plaid');
}

export function taxYearOf(date: string | null | undefined): number | null {
  if (!date) return null;
  const year = Number(date.slice(0, 4));
  return Number.isInteger(year) && year > 1900 ? year : null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function reconcilePlatforms(
  rows: ReconciliationBooking[],
  year: number,
  inputs: Record<string, UserReconciliationInputs> = {}
): PlatformReconciliation[] {
  const byPlatform = new Map<string, ReconciliationBooking[]>();
  for (const row of rows) {
    if (taxYearOf(row.date) !== year) continue;
    const platform = row.platform || 'other';
    const list = byPlatform.get(platform) || [];
    list.push(row);
    byPlatform.set(platform, list);
  }

  for (const platform of Object.keys(inputs)) {
    if (!byPlatform.has(platform)) byPlatform.set(platform, []);
  }

  return [...byPlatform.entries()]
    .map(([platform, list]) => {
      const bookings = list.filter(row => !isBankDeposit(row));
      const deposits = list.filter(isBankDeposit);
      const grossBookings = round2(bookings.reduce((sum, row) => sum + (row.amount || 0), 0));
      const platformFees = round2(bookings.reduce((sum, row) => sum + (row.platformFee || 0), 0));
      const feesRecorded = bookings.some(row => (row.platformFee || 0) > 0);
      const entered = inputs[platform] || { form1099kGross: null, occupancyTax: 0, adjustments: 0 };
      const occupancyTax = round2(entered.occupancyTax || 0);
      const adjustments = round2(entered.adjustments || 0);
      const expectedPayout = round2(grossBookings - platformFees - occupancyTax - adjustments);
      const bankDeposits = round2(deposits.reduce((sum, row) => sum + (row.amount || 0), 0));
      const gap = round2(expectedPayout - bankDeposits);
      const form1099kGross = entered.form1099kGross;
      const formVsBookings = form1099kGross == null ? null : round2(form1099kGross - grossBookings);
      return {
        platform,
        bookingCount: bookings.length,
        grossBookings,
        platformFees,
        feesRecorded,
        occupancyTax,
        adjustments,
        expectedPayout,
        depositCount: deposits.length,
        bankDeposits,
        gap,
        form1099kGross,
        formVsBookings,
        notes: explainRow({
          bookingCount: bookings.length,
          feesRecorded,
          occupancyTax,
          adjustments,
          depositCount: deposits.length,
          gap,
          formVsBookings,
        }),
      };
    })
    .filter(row => row.bookingCount > 0 || row.depositCount > 0 || row.form1099kGross != null)
    .sort((a, b) => a.platform.localeCompare(b.platform));
}

function explainRow(row: {
  bookingCount: number;
  feesRecorded: boolean;
  occupancyTax: number;
  adjustments: number;
  depositCount: number;
  gap: number;
  formVsBookings: number | null;
}): string[] {
  const notes: string[] = [];
  if (row.bookingCount > 0 && !row.feesRecorded) {
    notes.push('No host fee is recorded on these bookings, so the expected payout is not reduced by a platform fee.');
  }
  if (row.occupancyTax === 0) {
    notes.push('Occupancy tax the platform collected and sent to the city is not stored on each booking. Enter it when the 1099-K includes tax you did not receive.');
  }
  if (row.adjustments === 0) {
    notes.push('Refunds and resolution adjustments are not their own field. Enter them when they changed what was paid out.');
  }
  if (row.depositCount === 0) {
    notes.push('No bank deposit for this platform is in HostFi. Plaid counts a deposit only when the bank description matches Airbnb or Vrbo.');
  }
  if (Math.abs(row.gap) >= 0.01) {
    notes.push('A remaining gap is often timing: the stay is counted in the check-in year and the bank deposit landed in a different year.');
  }
  if (row.formVsBookings != null && Math.abs(row.formVsBookings) >= 0.01) {
    notes.push('The 1099-K gross does not match the gross on your bookings. The form is what the platform reported to the IRS, and it can include taxes and canceled stays your records do not.');
  }
  return notes;
}
