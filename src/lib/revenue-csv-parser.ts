import type { RevenueEntry, RevenueSource } from './demo-revenue';
import { DEMO_PROPERTIES } from './types';

interface ParsedRow {
  [key: string]: string;
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: ParsedRow = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }
  return rows;
}

function detectPlatform(headers: string[]): RevenueSource {
  const joined = headers.join(' ').toLowerCase();
  if (joined.includes('confirmation code') || joined.includes('host payout')) return 'airbnb';
  if (joined.includes('reservation id') && joined.includes('vrbo')) return 'vrbo';
  if (joined.includes('booking.com') || joined.includes('booker')) return 'booking_com';
  return 'other';
}

function matchProperty(row: ParsedRow): string | null {
  const listing = (row['listing'] || row['listing name'] || row['property'] || row['property name'] || '').toLowerCase();

  for (const prop of DEMO_PROPERTIES) {
    const name = prop.name.toLowerCase();
    const city = prop.city.toLowerCase();
    if (listing.includes(name) || listing.includes(city) || name.includes(listing)) {
      return prop.id;
    }
  }
  return null;
}

function parseAmount(val: string): number {
  if (!val) return 0;
  return parseFloat(val.replace(/[$,]/g, '')) || 0;
}

function parseDate(val: string): string {
  if (!val) return new Date().toISOString().split('T')[0];
  // Handle MM/DD/YYYY
  const parts = val.split('/');
  if (parts.length === 3) {
    const [m, d, y] = parts;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // Already YYYY-MM-DD
  if (val.match(/^\d{4}-\d{2}-\d{2}/)) return val.substring(0, 10);
  return val;
}

export interface CSVParseResult {
  entries: Partial<RevenueEntry>[];
  errors: string[];
  platform: RevenueSource;
  unmatchedCount: number;
}

export function parseRevenueCSV(text: string): CSVParseResult {
  const rows = parseCSV(text);
  const errors: string[] = [];

  if (rows.length === 0) {
    return { entries: [], errors: ['No data rows found in CSV'], platform: 'other', unmatchedCount: 0 };
  }

  const headers = Object.keys(rows[0]);
  const platform = detectPlatform(headers);
  let unmatchedCount = 0;

  const entries: Partial<RevenueEntry>[] = rows.map((row, idx) => {
    const amount = parseAmount(row['amount'] || row['gross earnings'] || row['total'] || row['gross amount'] || '0');
    const payout = parseAmount(row['host payout'] || row['payout'] || row['net amount'] || row['net earnings'] || '0');
    const fee = parseAmount(row['host service fee'] || row['service fee'] || row['platform fee'] || '0');
    const propertyId = matchProperty(row);

    if (!propertyId) unmatchedCount++;

    const checkIn = parseDate(row['start date'] || row['check-in'] || row['check in'] || row['arrival'] || '');
    const checkOut = parseDate(row['end date'] || row['check-out'] || row['check out'] || row['departure'] || '');
    const payoutDate = parseDate(row['payout date'] || row['paid date'] || row['payment date'] || '');

    const nights = parseInt(row['nights'] || '0') ||
      Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000));

    return {
      id: `csv-${Date.now()}-${idx}`,
      user_id: '', // Set by API route with actual auth user
      property_id: propertyId || '',
      platform: platform,
      description: row['type'] || row['description'] || 'Reservation',
      guest_name: row['guest'] || row['guest name'] || row['booker name'] || null,
      amount: amount || (payout + fee),
      payout_amount: payout || (amount - fee),
      platform_fee: fee || (amount - payout),
      check_in: checkIn,
      check_out: checkOut,
      nights,
      payout_date: payoutDate || checkOut,
      confirmation_code: row['confirmation code'] || row['reservation id'] || row['booking id'] || null,
      created_at: new Date().toISOString(),
      source: 'csv_import' as const,
    };
  });

  return { entries, errors, platform, unmatchedCount };
}

export const SAMPLE_CSV = `Date,Type,Confirmation Code,Start Date,End Date,Nights,Guest,Listing,Amount,Host Service Fee,Host Payout,Payout Date
01/03/2026,Reservation,HMTEST01,01/10/2026,01/14/2026,4,Test Guest,Venice Beach Unit,$980.00,$127.40,$852.60,01/15/2026
01/16/2026,Reservation,HMTEST02,01/16/2026,01/23/2026,7,Another Guest,Joshua Tree Cabin,$1360.00,$176.80,$1183.20,01/24/2026`;
