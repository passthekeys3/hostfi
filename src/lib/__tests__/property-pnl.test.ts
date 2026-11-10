import { describe, it, expect } from "vitest";
import { buildPropertyPnL, pnlPeriodLabel } from "../property-pnl";

const properties = [{ id: "a", name: "A" }, { id: "b", name: "B" }];

describe("property P&L period", () => {
  const revenue = [
    { property_id: "a", amount: 1000, payout_amount: 900, check_in: "2026-03-02", date: "2026-03-10" },
    { property_id: "a", amount: 400, payout_amount: 400, check_in: "2026-04-01", date: "2026-04-02" },
    { property_id: "b", amount: 200, date: "2025-03-01" },
  ];
  const expenses = [
    { property_id: "a", amount: 100, date: "2026-03-20" },
    { property_id: "a", amount: 50, date: "2026-04-03" },
  ];

  it("limits a property to the selected month and year", () => {
    const [a, b] = buildPropertyPnL(properties, revenue, expenses, 2026, 3);
    expect(a.bookings).toBe(1);
    expect(a.gross).toBe(1000);
    expect(a.net).toBe(900);
    expect(a.fees).toBe(100);
    expect(a.expenses).toBe(100);
    expect(a.profit).toBe(800);
    expect(b.bookings).toBe(0);
    expect(b.profit).toBe(0);
  });

  it("uses the whole year when the month is all", () => {
    const [a] = buildPropertyPnL(properties, revenue, expenses, 2026, "all");
    expect(a.gross).toBe(1400);
    expect(a.expenses).toBe(150);
    expect(pnlPeriodLabel(2026, "all")).toBe("2026");
    expect(pnlPeriodLabel(2026, 3)).toBe("March 2026");
    expect(pnlPeriodLabel("all", "all")).toBe("All time");
  });
});
