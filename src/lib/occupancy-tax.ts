/**
 * Occupancy (lodging) tax ledger.
 * Rates are whatever the account holder types. This module does not know
 * jurisdiction rates and does not give tax advice.
 */

import { isBankDeposit } from "./payout-reconciliation";

export type FilingCadence = "monthly" | "quarterly";

export interface OccupancyStay {
  propertyId: string;
  /** Booking date. Used only when check-in is missing. */
  date: string;
  checkIn?: string | null;
  checkOut?: string | null;
  nights?: number | null;
  amount: number;
  notes?: string | null;
}

export interface OccupancyRate {
  propertyId: string;
  jurisdiction: string;
  /** Null means the user has not entered a rate. Zero is a real entry. */
  ratePercent: number | null;
}

export interface OccupancyRemittance {
  propertyId: string;
  periodStart: string;
  cadence: FilingCadence;
  collectedByPlatform: number;
  remittedByPlatform: number;
  remittedByHost: number;
}

export interface OccupancyProperty {
  id: string;
  name: string;
}

export interface OccupancyLedgerRow {
  propertyId: string;
  propertyName: string;
  jurisdiction: string;
  periodStart: string;
  periodLabel: string;
  cadence: FilingCadence;
  bookingCount: number;
  nights: number | null;
  nightsComplete: boolean;
  grossBookings: number;
  grossPerNight: number | null;
  ratePercent: number | null;
  taxAtRate: number | null;
  collectedByPlatform: number;
  remittedByPlatform: number;
  remittedByHost: number;
  hostBalance: number | null;
  runningBalance: number | null;
  notes: string[];
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function isoDate(value: string | null | undefined): string | null {
  if (!value || value.length < 10) return null;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${value.slice(0, 4)}-${value.slice(5, 7)}-${value.slice(8, 10)}`;
}

function utcDay(iso: string): number {
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  const day = Number(iso.slice(8, 10));
  return Date.UTC(year, month - 1, day) / 86400000;
}

/** Nights between check-in and check-out. Missing dates stay unknown. */
export function nightsForStay(stay: OccupancyStay): number | null {
  const checkIn = isoDate(stay.checkIn);
  const checkOut = isoDate(stay.checkOut);
  if (checkIn && checkOut) {
    const nights = utcDay(checkOut) - utcDay(checkIn);
    return nights > 0 ? nights : 0;
  }
  if (stay.nights != null && Number.isFinite(stay.nights) && stay.nights >= 0) {
    return Math.round(stay.nights);
  }
  return null;
}

export function stayDate(stay: OccupancyStay): string | null {
  return isoDate(stay.checkIn) || isoDate(stay.date);
}

export function periodStartFor(date: string, cadence: FilingCadence): string {
  const month = Number(date.slice(5, 7));
  const startMonth = cadence === "monthly" ? month : Math.floor((month - 1) / 3) * 3 + 1;
  return `${date.slice(0, 4)}-${String(startMonth).padStart(2, "0")}-01`;
}

export function periodLabel(periodStart: string, cadence: FilingCadence): string {
  const year = periodStart.slice(0, 4);
  const month = Number(periodStart.slice(5, 7));
  if (cadence === "monthly") return `${MONTHS[month - 1]} ${year}`;
  return `Q${Math.floor((month - 1) / 3) + 1} ${year}`;
}

function emptyRemittance(): Pick<OccupancyRemittance, "collectedByPlatform" | "remittedByPlatform" | "remittedByHost"> {
  return { collectedByPlatform: 0, remittedByPlatform: 0, remittedByHost: 0 };
}

export function buildOccupancyLedger(
  properties: OccupancyProperty[],
  stays: OccupancyStay[],
  rates: OccupancyRate[],
  remittances: OccupancyRemittance[],
  year: number,
  cadence: FilingCadence
): OccupancyLedgerRow[] {
  const names = new Map(properties.map(property => [property.id, property.name]));
  const rateByProperty = new Map(rates.map(rate => [rate.propertyId, rate]));
  type Bucket = { propertyId: string; periodStart: string; stays: OccupancyStay[]; remittance: OccupancyRemittance | null };
  const buckets = new Map<string, Bucket>();

  const bucketFor = (propertyId: string, periodStart: string) => {
    const key = `${propertyId}:${periodStart}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { propertyId, periodStart, stays: [], remittance: null };
      buckets.set(key, bucket);
    }
    return bucket;
  };

  for (const stay of stays) {
    if (isBankDeposit(stay)) continue;
    const date = stayDate(stay);
    if (!date || Number(date.slice(0, 4)) !== year) continue;
    bucketFor(stay.propertyId, periodStartFor(date, cadence)).stays.push(stay);
  }

  for (const remittance of remittances) {
    if (remittance.cadence !== cadence) continue;
    if (Number(remittance.periodStart.slice(0, 4)) !== year) continue;
    bucketFor(remittance.propertyId, remittance.periodStart.slice(0, 10)).remittance = remittance;
  }

  const byProperty = new Map<string, Bucket[]>();
  for (const bucket of buckets.values()) {
    const list = byProperty.get(bucket.propertyId) || [];
    list.push(bucket);
    byProperty.set(bucket.propertyId, list);
  }

  const rows: OccupancyLedgerRow[] = [];
  const propertyIds = [...byProperty.keys()].sort((a, b) =>
    (names.get(a) || a).localeCompare(names.get(b) || b)
  );

  for (const propertyId of propertyIds) {
    const rate = rateByProperty.get(propertyId);
    const ratePercent = rate && rate.ratePercent != null && Number.isFinite(rate.ratePercent)
      ? rate.ratePercent
      : null;
    let running = 0;
    let runningKnown = ratePercent != null;
    const periods = (byProperty.get(propertyId) || []).sort((a, b) => a.periodStart.localeCompare(b.periodStart));

    for (const period of periods) {
      const nightValues = period.stays.map(nightsForStay);
      const nightsComplete = nightValues.every(nights => nights != null);
      const nights = nightsComplete ? nightValues.reduce((sum, nights) => sum + (nights || 0), 0) : null;
      const grossBookings = roundMoney(period.stays.reduce((sum, stay) => sum + (stay.amount || 0), 0));
      const taxAtRate = ratePercent == null ? null : roundMoney(grossBookings * ratePercent / 100);
      const money = period.remittance || emptyRemittance();
      const collectedByPlatform = roundMoney(money.collectedByPlatform || 0);
      const remittedByPlatform = roundMoney(money.remittedByPlatform || 0);
      const remittedByHost = roundMoney(money.remittedByHost || 0);
      const hostBalance = taxAtRate == null
        ? null
        : roundMoney(taxAtRate - remittedByPlatform - remittedByHost);
      if (hostBalance != null) running = roundMoney(running + hostBalance);
      const notes: string[] = [];
      if (ratePercent == null) {
        notes.push("No rate entered. HostFi does not supply a jurisdiction rate.");
      }
      if (!nightsComplete) {
        notes.push("At least one stay is missing check-in and check-out, so nights are not totaled.");
      }
      if (collectedByPlatform > remittedByPlatform) {
        notes.push("The platform collected more than the amount marked remitted by the platform. The difference is not treated as paid.");
      }
      rows.push({
        propertyId,
        propertyName: names.get(propertyId) || "Property",
        jurisdiction: rate?.jurisdiction?.trim() || "",
        periodStart: period.periodStart,
        periodLabel: periodLabel(period.periodStart, cadence),
        cadence,
        bookingCount: period.stays.length,
        nights,
        nightsComplete,
        grossBookings,
        grossPerNight: nights != null && nights > 0 ? roundMoney(grossBookings / nights) : null,
        ratePercent,
        taxAtRate,
        collectedByPlatform,
        remittedByPlatform,
        remittedByHost,
        hostBalance,
        runningBalance: runningKnown && hostBalance != null ? running : null,
        notes,
      });
      if (hostBalance == null) runningKnown = false;
    }
  }

  return rows;
}

function csvCell(value: string | number | null): string {
  if (value == null) return "";
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function occupancyLedgerCsv(rows: OccupancyLedgerRow[]): string {
  const header = [
    "Property",
    "Jurisdiction entered",
    "Period",
    "Stays",
    "Nights",
    "Gross bookings",
    "Gross per night",
    "Rate percent entered",
    "Tax at entered rate",
    "Collected by platform",
    "Remitted by platform",
    "Remitted by host",
    "Host balance",
    "Running host balance",
    "Notes",
  ];
  const body = rows.map(row => [
    row.propertyName,
    row.jurisdiction,
    row.periodLabel,
    row.bookingCount,
    row.nights == null ? "" : row.nights,
    row.grossBookings.toFixed(2),
    row.grossPerNight == null ? "" : row.grossPerNight.toFixed(2),
    row.ratePercent == null ? "" : String(row.ratePercent),
    row.taxAtRate == null ? "" : row.taxAtRate.toFixed(2),
    row.collectedByPlatform.toFixed(2),
    row.remittedByPlatform.toFixed(2),
    row.remittedByHost.toFixed(2),
    row.hostBalance == null ? "" : row.hostBalance.toFixed(2),
    row.runningBalance == null ? "" : row.runningBalance.toFixed(2),
    row.notes.join(" "),
  ].map(csvCell).join(","));
  const disclaimer = csvCell("HostFi is not a tax advisor. Rates and remittance amounts in this file were entered by the account holder. HostFi does not look up jurisdiction rates.");
  return [disclaimer, header.map(csvCell).join(","), ...body].join("\n");
}
