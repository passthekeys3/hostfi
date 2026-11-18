import { describe, expect, it } from "vitest";
import {
  buildOccupancyLedger,
  nightsForStay,
  occupancyLedgerCsv,
  periodStartFor,
} from "../occupancy-tax";

const properties = [
  { id: "p1", name: "Cabin" },
  { id: "p2", name: "Apartment" },
];

describe("occupancy tax ledger", () => {
  it("counts nights from check-in and check-out and leaves missing dates unknown", () => {
    expect(nightsForStay({
      propertyId: "p1",
      date: "2026-01-02",
      checkIn: "2026-01-02",
      checkOut: "2026-01-05",
      amount: 300,
    })).toBe(3);
    expect(nightsForStay({ propertyId: "p1", date: "2026-01-02", amount: 300 })).toBeNull();
    expect(nightsForStay({
      propertyId: "p1",
      date: "2026-01-02",
      nights: 2,
      amount: 200,
    })).toBe(2);
  });

  it("applies only the rate the user entered and keeps a running host balance", () => {
    const rows = buildOccupancyLedger(
      properties,
      [
        { propertyId: "p1", date: "2026-01-10", checkIn: "2026-01-02", checkOut: "2026-01-05", amount: 300, notes: null },
        { propertyId: "p1", date: "2026-02-10", checkIn: "2026-02-01", checkOut: "2026-02-03", amount: 200, notes: null },
        { propertyId: "p1", date: "2026-01-15", amount: 999, notes: "Imported from Plaid (txn)" },
        { propertyId: "p2", date: "2026-01-04", checkIn: "2026-01-04", checkOut: "2026-01-05", amount: 100, notes: null },
      ],
      [
        { propertyId: "p1", jurisdiction: "Town the host typed", ratePercent: 10 },
      ],
      [
        {
          propertyId: "p1",
          periodStart: "2026-01-01",
          cadence: "monthly",
          collectedByPlatform: 40,
          remittedByPlatform: 30,
          remittedByHost: 0,
        },
      ],
      2026,
      "monthly"
    );

    const january = rows.find(row => row.propertyId === "p1" && row.periodStart === "2026-01-01");
    const february = rows.find(row => row.propertyId === "p1" && row.periodStart === "2026-02-01");
    const other = rows.find(row => row.propertyId === "p2");
    expect(january).toMatchObject({
      nights: 3,
      grossBookings: 300,
      grossPerNight: 100,
      ratePercent: 10,
      taxAtRate: 30,
      collectedByPlatform: 40,
      remittedByPlatform: 30,
      hostBalance: 0,
      runningBalance: 0,
      bookingCount: 1,
    });
    expect(january?.notes.some(note => note.includes("collected more"))).toBe(true);
    expect(february).toMatchObject({
      nights: 2,
      grossBookings: 200,
      taxAtRate: 20,
      hostBalance: 20,
      runningBalance: 20,
    });
    expect(other?.taxAtRate).toBeNull();
    expect(other?.hostBalance).toBeNull();
    expect(other?.notes[0]).toMatch(/does not supply a jurisdiction rate/);
    expect(rows.some(row => row.grossBookings === 999)).toBe(false);
  });

  it("groups a quarter without inventing a rate of zero", () => {
    expect(periodStartFor("2026-05-20", "quarterly")).toBe("2026-04-01");
    const [row] = buildOccupancyLedger(
      properties,
      [
        { propertyId: "p1", date: "2026-04-02", checkIn: "2026-04-02", checkOut: "2026-04-04", amount: 150 },
        { propertyId: "p1", date: "2026-06-01", checkIn: "2026-06-01", checkOut: "2026-06-02", amount: 50 },
      ],
      [{ propertyId: "p1", jurisdiction: "", ratePercent: 0 }],
      [],
      2026,
      "quarterly"
    );
    expect(row.periodLabel).toBe("Q2 2026");
    expect(row.grossBookings).toBe(200);
    expect(row.taxAtRate).toBe(0);
    expect(row.hostBalance).toBe(0);
    expect(row.nights).toBe(3);
  });

  it("does not total nights when a stay in the period has no dates", () => {
    const [row] = buildOccupancyLedger(
      properties,
      [
        { propertyId: "p1", date: "2026-03-01", checkIn: "2026-03-01", checkOut: "2026-03-03", amount: 80 },
        { propertyId: "p1", date: "2026-03-20", amount: 40 },
      ],
      [{ propertyId: "p1", jurisdiction: "County", ratePercent: 5 }],
      [],
      2026,
      "monthly"
    );
    expect(row.nights).toBeNull();
    expect(row.grossPerNight).toBeNull();
    expect(row.grossBookings).toBe(120);
    expect(row.taxAtRate).toBe(6);
  });

  it("exports a disclaimer and blank tax cells when no rate is entered", () => {
    const rows = buildOccupancyLedger(
      properties,
      [{ propertyId: "p2", date: "2026-08-01", checkIn: "2026-08-01", checkOut: "2026-08-02", amount: 90 }],
      [],
      [],
      2026,
      "monthly"
    );
    const csv = occupancyLedgerCsv(rows);
    expect(csv.startsWith("\"HostFi is not a tax advisor.")).toBe(true);
    expect(csv).toContain("Apartment");
    expect(csv).not.toMatch(/Asheville|6\.75|default rate/i);
    const dataLine = csv.split("\n")[2];
    expect(dataLine).toContain("\"90.00\"");
    expect(dataLine.split(",").filter(cell => cell === "\"\"").length).toBeGreaterThan(3);
  });
});
