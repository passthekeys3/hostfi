import { describe, expect, it } from "vitest";
import { necRollupCsv, necThreshold, rollupVendors, tinLast4OrReject } from "../nec-1099";

const payments = [
  { vendor: "Ada Cleaner", amount: 1500, date: "2026-02-01", status: "paid", category: "cleaning" },
  { vendor: "ada cleaner", amount: 500, date: "2026-06-01", status: "paid", category: "cleaning" },
  { vendor: "Handy Pat", amount: 400, date: "2026-03-01", status: "paid", category: "maintenance" },
  { vendor: "  ", amount: 80, date: "2026-03-02", status: "paid", category: "other" },
  { vendor: "Ada Cleaner", amount: 9000, date: "2026-04-01", status: "pending", category: "cleaning" },
  { vendor: "Ada Cleaner", amount: 50, date: "2025-12-01", status: "paid", category: "cleaning" },
];

describe("1099-NEC rollup", () => {
  it("uses the IRS threshold for the year being viewed", () => {
    expect(necThreshold(2025).amount).toBe(600);
    expect(necThreshold(2025).source).toMatch(/\$600/);
    expect(necThreshold(2026).amount).toBe(2000);
    expect(necThreshold(2026).source).toMatch(/\$2,000/);
    expect(necThreshold(2026).source).toMatch(/irs\.gov\/instructions\/i1099mec/);
    expect(necThreshold(2027).amount).toBeNull();
    expect(necThreshold(2027).source).toMatch(/does not estimate/);
  });

  it("rolls paid expenses up by vendor and flags the 2026 threshold", () => {
    const rollup = rollupVendors(payments, [
      { vendorKey: "ada cleaner", w9OnFile: true, tinLast4: "4321" },
    ], 2026);
    expect(rollup.rows).toHaveLength(2);
    expect(rollup.rows[0]).toMatchObject({
      vendorKey: "ada cleaner",
      vendorName: "Ada Cleaner",
      amount: 2000,
      expenseCount: 2,
      w9OnFile: true,
      tinLast4: "4321",
      atOrOverThreshold: true,
    });
    expect(rollup.rows[1]).toMatchObject({
      vendorName: "Handy Pat",
      amount: 400,
      atOrOverThreshold: false,
      w9OnFile: false,
      tinLast4: null,
    });
    expect(rollup.unassignedAmount).toBe(80);
    expect(rollup.unassignedCount).toBe(1);
  });

  it("uses $600 for a 2025 view and does not flag a later year with a guessed amount", () => {
    const prior = rollupVendors([
      { vendor: "Ada Cleaner", amount: 600, date: "2025-01-01", status: "paid", category: "cleaning" },
    ], [], 2025);
    expect(prior.rows[0].atOrOverThreshold).toBe(true);
    const later = rollupVendors([
      { vendor: "Ada Cleaner", amount: 5000, date: "2027-01-01", status: "paid", category: "cleaning" },
    ], [], 2027);
    expect(later.rows[0].atOrOverThreshold).toBeNull();
    expect(later.threshold.amount).toBeNull();
  });

  it("refuses a full TIN and accepts four digits", () => {
    expect(tinLast4OrReject("123456789").ok).toBe(false);
    expect(tinLast4OrReject("12-3456789").ok).toBe(false);
    expect(tinLast4OrReject("6789")).toEqual({ ok: true, last4: "6789" });
    expect(tinLast4OrReject("")).toEqual({ ok: true, last4: null });
  });

  it("exports a filing worksheet without a full TIN column", () => {
    const csv = necRollupCsv(rollupVendors(payments, [
      { vendorKey: "ada cleaner", w9OnFile: true, tinLast4: "4321" },
    ], 2026));
    expect(csv.startsWith("\"This file is a worksheet")).toBe(true);
    expect(csv).toContain("TIN last 4");
    expect(csv).toContain("not a full SSN or EIN");
    expect(csv).not.toMatch(/\d{9}/);
    expect(csv).toContain("\"4321\"");
    expect(csv).toContain("\"2000.00\"");
    expect(csv).not.toContain("9000");
    expect(csv).not.toContain("(no vendor");
  });
});
