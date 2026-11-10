import { describe, it, expect } from 'vitest';
import { isBankDeposit, reconcilePlatforms } from '../payout-reconciliation';

describe('payout reconciliation', () => {
  it('treats only Plaid imports as bank deposits', () => {
    expect(isBankDeposit({ notes: 'Imported from Plaid (txn_1)' })).toBe(true);
    expect(isBankDeposit({ notes: 'Guest stayed' })).toBe(false);
    expect(isBankDeposit({})).toBe(false);
  });

  it('subtracts fees, tax, and adjustments from gross and compares deposits', () => {
    const rows = reconcilePlatforms([
      { platform: 'airbnb', date: '2026-06-01', amount: 1000, platformFee: 30, notes: null },
      { platform: 'airbnb', date: '2026-06-15', amount: 500, platformFee: 15, notes: null },
      { platform: 'airbnb', date: '2026-06-20', amount: 1400, platformFee: 0, notes: 'Imported from Plaid (txn_9)' },
      { platform: 'airbnb', date: '2025-12-01', amount: 999, platformFee: 10, notes: null },
    ], 2026, {
      airbnb: { form1099kGross: 1600, occupancyTax: 40, adjustments: 15 },
    });

    expect(rows).toHaveLength(1);
    const airbnb = rows[0];
    expect(airbnb.grossBookings).toBe(1500);
    expect(airbnb.platformFees).toBe(45);
    expect(airbnb.expectedPayout).toBe(1500 - 45 - 40 - 15);
    expect(airbnb.bankDeposits).toBe(1400);
    expect(airbnb.gap).toBe(airbnb.expectedPayout - 1400);
    expect(airbnb.formVsBookings).toBe(100);
    expect(airbnb.notes.some(note => note.includes('1099-K'))).toBe(true);
  });

  it('does not invent a fee when none was recorded', () => {
    const [row] = reconcilePlatforms([
      { platform: 'vrbo', date: '2026-03-01', amount: 800, platformFee: 0, notes: null },
    ], 2026);
    expect(row.feesRecorded).toBe(false);
    expect(row.expectedPayout).toBe(800);
    expect(row.notes.some(note => note.includes('No host fee'))).toBe(true);
    expect(row.depositCount).toBe(0);
  });
});
