/**
 * Revenue types and utilities
 */

export interface RevenueEntry {
  id: string;
  property_id: string;
  user_id?: string;
  source: string;
  platform?: string;
  amount: number;
  payout_amount?: number;
  platform_fee?: number;
  date: string;
  check_in?: string;
  check_out?: string;
  nights?: number;
  guest_name?: string;
  confirmation_code?: string;
  payout_date?: string;
  description?: string;
  notes?: string;
  created_at?: string;
}

export type RevenueSource = 'airbnb' | 'vrbo' | 'booking' | 'direct' | 'other';

export const REVENUE_SOURCES: { value: RevenueSource; label: string; color: string }[] = [
  { value: 'airbnb', label: 'Airbnb', color: '#FF5A5F' },
  { value: 'vrbo', label: 'VRBO', color: '#3D5A80' },
  { value: 'booking', label: 'Booking.com', color: '#003580' },
  { value: 'direct', label: 'Direct Booking', color: '#10B981' },
  { value: 'other', label: 'Other', color: '#6B7280' },
];

export function getRevenueBySource(entries: RevenueEntry[]): Record<RevenueSource, number> {
  const result: Record<RevenueSource, number> = {
    airbnb: 0, vrbo: 0, booking: 0, direct: 0, other: 0,
  };
  
  for (const entry of entries) {
    const source = (entry.platform || entry.source || 'other') as RevenueSource;
    const key = Object.keys(result).includes(source) ? source : 'other';
    result[key] += entry.payout_amount ?? entry.amount ?? 0;
  }
  
  return result;
}
