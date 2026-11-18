import { describe, expect, it } from "vitest";
import { formatDate, plural, todayDateInput } from "../utils";
import { netPayout, profitFromBookings } from "../profit";
import { annualSpendProjection } from "../report-projection";

describe("date-only fields", () => {
  it("keeps a calendar date on the same day in US time zones", () => {
    const formatted = formatDate("2026-11-17");
    expect(formatted).toContain("17");
    expect(formatted).toContain("2026");
    expect(formatted).not.toMatch(/\b16\b/);
  });

  it("uses the local calendar day instead of the UTC date", () => {
    const eveningBeforeUtcMidnight = new Date("2026-11-18T03:30:00.000Z");
    const local = todayDateInput(eveningBeforeUtcMidnight);
    const utc = eveningBeforeUtcMidnight.toISOString().slice(0, 10);
    const expected = [
      eveningBeforeUtcMidnight.getFullYear(),
      String(eveningBeforeUtcMidnight.getMonth() + 1).padStart(2, "0"),
      String(eveningBeforeUtcMidnight.getDate()).padStart(2, "0"),
    ].join("-");
    expect(local).toBe(expected);
    if (eveningBeforeUtcMidnight.getTimezoneOffset() > 0) {
      expect(local).not.toBe(utc);
      expect(local).toBe("2026-11-17");
    }
  });
});

describe("net profit", () => {
  it("subtracts the platform fee the same way on revenue and analytics", () => {
    const booking = { amount: 500, payout_amount: 485, platform_fee: 15 };
    expect(netPayout(booking)).toBe(485);
    const summary = profitFromBookings([booking], [{ amount: 120 }]);
    expect(summary.profit).toBe(365);
    expect(summary.margin).toBeCloseTo(75.257, 2);
  });

  it("falls back to gross minus fee when payout is missing", () => {
    expect(netPayout({ amount: 500, platform_fee: 15 })).toBe(485);
  });
});

describe("annual projections", () => {
  it("does not annualize a single month or invent a year-over-year percent", () => {
    const result = annualSpendProjection(
      [{ date: "2026-11-02", amount: 120 }],
      2026,
    );
    expect(result.showProjection).toBe(false);
    expect(result.projectedAnnualSpend).toBeNull();
    expect(result.showYoY).toBe(false);
  });

  it("annualizes once three months exist and compares only a real prior year", () => {
    const thin = annualSpendProjection([
      { date: "2026-01-02", amount: 100 },
      { date: "2026-02-02", amount: 100 },
      { date: "2026-03-02", amount: 100 },
    ], 2026);
    expect(thin.showProjection).toBe(true);
    expect(thin.projectedAnnualSpend).toBe(1200);
    expect(thin.showYoY).toBe(false);

    const compared = annualSpendProjection([
      { date: "2025-01-02", amount: 50 },
      { date: "2025-02-02", amount: 50 },
      { date: "2025-03-02", amount: 50 },
      { date: "2026-01-02", amount: 100 },
      { date: "2026-02-02", amount: 100 },
      { date: "2026-03-02", amount: 100 },
    ], 2026);
    expect(compared.showYoY).toBe(true);
    expect(compared.yoyPercent).toBe(700);
  });
});

describe("plural", () => {
  it("uses the singular for one", () => {
    expect(plural(1, "booking")).toBe("1 booking");
    expect(plural(2, "booking")).toBe("2 bookings");
    expect(plural(1, "entry", "entries")).toBe("1 entry");
  });
});
