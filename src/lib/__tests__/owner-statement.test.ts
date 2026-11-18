import { describe, expect, it } from "vitest";
import { buildOwnerStatements, ownerStatementCsv, ownerStatementHtml } from "../owner-statement";

const properties = [
  { id: "own", name: "Owner Cabin", propertyType: "str" as const },
  { id: "arb", name: "Arbitrage <Flat>", propertyType: "arbitrage" as const },
];

describe("owner statements", () => {
  it("subtracts a percent of gross, a per-booking flat fee, and platform fees", () => {
    const [row] = buildOwnerStatements(
      properties,
      [
        { propertyId: "own", date: "2026-03-20", checkIn: "2026-03-02", amount: 1000, platformFee: 150 },
        { propertyId: "own", date: "2026-03-21", checkIn: "2026-03-08", amount: 500, payoutAmount: 450 },
      ],
      [{ propertyId: "own", date: "2026-03-15", amount: 80, category: "cleaning" }],
      [{ propertyId: "own", feePercent: 10, feeFlat: 25, feeBasis: "gross", flatPer: "booking" }],
      2026,
      3
    );
    expect(row.gross).toBe(1500);
    expect(row.platformFees).toBe(200);
    expect(row.percentFee).toBe(150);
    expect(row.flatFee).toBe(50);
    expect(row.managementFee).toBe(200);
    expect(row.otherExpenses).toBe(80);
    expect(row.netToOwner).toBe(1500 - 200 - 200 - 80);
  });

  it("can take the co-host percent after platform fees", () => {
    const [row] = buildOwnerStatements(
      properties,
      [{ propertyId: "own", date: "2026-01-05", checkIn: "2026-01-05", amount: 1000, platformFee: 200 }],
      [],
      [{ propertyId: "own", feePercent: 10, feeFlat: 0, feeBasis: "after_platform_fees", flatPer: "period" }],
      2026,
      1
    );
    expect(row.feeBasisAmount).toBe(800);
    expect(row.managementFee).toBe(80);
    expect(row.netToOwner).toBe(720);
  });

  it("treats arbitrage rent as Schedule E line 19 and does not subtract recorded management twice", () => {
    const [row] = buildOwnerStatements(
      properties,
      [{ propertyId: "arb", date: "2026-04-02", checkIn: "2026-04-02", amount: 4000, platformFee: 400 }],
      [
        { propertyId: "arb", date: "2026-04-01", amount: 2200, category: "rent" },
        { propertyId: "arb", date: "2026-04-03", amount: 300, category: "management" },
        { propertyId: "arb", date: "2026-04-04", amount: 100, category: "cleaning" },
      ],
      [{ propertyId: "arb", feePercent: 0, feeFlat: 200, feeBasis: "gross", flatPer: "period" }],
      2026,
      4
    );
    expect(row.rentPaid).toBe(2200);
    expect(row.rentScheduleELine).toBe(19);
    expect(row.recordedManagement).toBe(300);
    expect(row.recordedManagementSubtracted).toBe(false);
    expect(row.managementFee).toBe(200);
    expect(row.netToOwner).toBe(4000 - 400 - 200 - 2200 - 100);
    expect(row.notes.some(note => note.includes("line 19"))).toBe(true);
    expect(ownerStatementHtml([row])).toContain("Schedule E line 19");
    expect(ownerStatementHtml([row])).toContain("Arbitrage &lt;Flat&gt;");
    expect(ownerStatementCsv([row])).toContain("\"19\"");
  });

  it("subtracts recorded management when no co-host fee is configured", () => {
    const [row] = buildOwnerStatements(
      properties,
      [{ propertyId: "own", date: "2026-05-01", checkIn: "2026-05-01", amount: 500, platformFee: 0 }],
      [{ propertyId: "own", date: "2026-05-02", amount: 75, category: "management" }],
      [],
      2026,
      5
    );
    expect(row.managementFee).toBe(0);
    expect(row.recordedManagementSubtracted).toBe(true);
    expect(row.netToOwner).toBe(425);
    expect(row.notes.some(note => note.includes("No platform fee"))).toBe(true);
  });

  it("ignores bank deposits and stays outside the month", () => {
    const rows = buildOwnerStatements(
      properties,
      [
        { propertyId: "own", date: "2026-06-02", checkIn: "2026-06-02", amount: 300, platformFee: 30 },
        { propertyId: "own", date: "2026-07-02", checkIn: "2026-07-02", amount: 900, platformFee: 90 },
        { propertyId: "own", date: "2026-06-03", amount: 5000, notes: "Imported from Plaid (abc)", platformFee: 0 },
      ],
      [],
      [],
      2026,
      6
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].gross).toBe(300);
    expect(rows[0].bookingCount).toBe(1);
  });
});
