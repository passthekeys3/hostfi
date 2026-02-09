export type RevenueSource = 'airbnb' | 'vrbo' | 'booking' | 'direct' | 'other';

export interface RevenueEntry {
  id: string;
  user_id: string;
  property_id: string;
  source: RevenueSource;
  description: string;
  guest_name: string | null;
  amount: number;
  payout_amount: number; // after platform fees
  platform_fee: number;
  check_in: string;
  check_out: string;
  nights: number;
  payout_date: string;
  confirmation_code: string | null;
  created_at: string;
  import_source: 'manual' | 'csv_import';
}

export const REVENUE_SOURCES: { value: RevenueSource; label: string; color: string }[] = [
  { value: 'airbnb', label: 'Airbnb', color: '#FF5A5F' },
  { value: 'vrbo', label: 'VRBO', color: '#3B5998' },
  { value: 'booking', label: 'Booking.com', color: '#003580' },
  { value: 'direct', label: 'Direct Booking', color: '#14B8A6' },
  { value: 'other', label: 'Other', color: '#6B7280' },
];

export const DEMO_REVENUE: RevenueEntry[] = [
  // Venice Beach Unit — Jan 2026
  { id: 'rev-1', user_id: 'demo', property_id: '1', source: 'airbnb', description: 'Standard reservation', guest_name: 'Sarah M.', amount: 1250, payout_amount: 1087.50, platform_fee: 162.50, check_in: '2026-01-03', check_out: '2026-01-08', nights: 5, payout_date: '2026-01-09', confirmation_code: 'HMAB1234', created_at: '2026-01-03T00:00:00Z', import_source: 'csv_import' },
  { id: 'rev-2', user_id: 'demo', property_id: '1', source: 'airbnb', description: 'Standard reservation', guest_name: 'James K.', amount: 980, payout_amount: 852.60, platform_fee: 127.40, check_in: '2026-01-10', check_out: '2026-01-14', nights: 4, payout_date: '2026-01-15', confirmation_code: 'HMAB5678', created_at: '2026-01-10T00:00:00Z', import_source: 'csv_import' },
  { id: 'rev-3', user_id: 'demo', property_id: '1', source: 'vrbo', description: 'Standard reservation', guest_name: 'Linda P.', amount: 1820, payout_amount: 1583.40, platform_fee: 236.60, check_in: '2026-01-16', check_out: '2026-01-23', nights: 7, payout_date: '2026-01-24', confirmation_code: 'VR-90123', created_at: '2026-01-16T00:00:00Z', import_source: 'csv_import' },
  { id: 'rev-4', user_id: 'demo', property_id: '1', source: 'airbnb', description: 'Standard reservation', guest_name: 'Tom R.', amount: 750, payout_amount: 652.50, platform_fee: 97.50, check_in: '2026-01-25', check_out: '2026-01-28', nights: 3, payout_date: '2026-01-29', confirmation_code: 'HMAB9012', created_at: '2026-01-25T00:00:00Z', import_source: 'csv_import' },

  // Venice Beach Unit — Feb 2026
  { id: 'rev-5', user_id: 'demo', property_id: '1', source: 'airbnb', description: 'Standard reservation', guest_name: 'Diana W.', amount: 1500, payout_amount: 1305.00, platform_fee: 195.00, check_in: '2026-02-01', check_out: '2026-02-07', nights: 6, payout_date: '2026-02-08', confirmation_code: 'HMAB3456', created_at: '2026-02-01T00:00:00Z', import_source: 'manual' },

  // Silver Lake Duplex — Jan 2026
  { id: 'rev-6', user_id: 'demo', property_id: '2', source: 'airbnb', description: 'Monthly rental', guest_name: 'Alex C.', amount: 4200, payout_amount: 3654.00, platform_fee: 546.00, check_in: '2026-01-01', check_out: '2026-01-31', nights: 30, payout_date: '2026-02-01', confirmation_code: 'HMAB7890', created_at: '2026-01-01T00:00:00Z', import_source: 'csv_import' },

  // Silver Lake Duplex — Feb 2026
  { id: 'rev-7', user_id: 'demo', property_id: '2', source: 'direct', description: 'Direct booking — returning guest', guest_name: 'Alex C.', amount: 3800, payout_amount: 3800.00, platform_fee: 0, check_in: '2026-02-01', check_out: '2026-02-28', nights: 27, payout_date: '2026-02-01', confirmation_code: null, created_at: '2026-02-01T00:00:00Z', import_source: 'manual' },

  // Joshua Tree Cabin — Jan 2026
  { id: 'rev-8', user_id: 'demo', property_id: '3', source: 'airbnb', description: 'Weekend getaway', guest_name: 'Mike B.', amount: 680, payout_amount: 591.60, platform_fee: 88.40, check_in: '2026-01-03', check_out: '2026-01-05', nights: 2, payout_date: '2026-01-06', confirmation_code: 'HMAB2345', created_at: '2026-01-03T00:00:00Z', import_source: 'csv_import' },
  { id: 'rev-9', user_id: 'demo', property_id: '3', source: 'vrbo', description: 'Standard reservation', guest_name: 'Rachel S.', amount: 1360, payout_amount: 1183.20, platform_fee: 176.80, check_in: '2026-01-10', check_out: '2026-01-14', nights: 4, payout_date: '2026-01-15', confirmation_code: 'VR-45678', created_at: '2026-01-10T00:00:00Z', import_source: 'csv_import' },
  { id: 'rev-10', user_id: 'demo', property_id: '3', source: 'airbnb', description: 'MLK Weekend', guest_name: 'Chris D.', amount: 1020, payout_amount: 887.40, platform_fee: 132.60, check_in: '2026-01-17', check_out: '2026-01-20', nights: 3, payout_date: '2026-01-21', confirmation_code: 'HMAB6789', created_at: '2026-01-17T00:00:00Z', import_source: 'csv_import' },
  { id: 'rev-11', user_id: 'demo', property_id: '3', source: 'airbnb', description: 'Standard reservation', guest_name: 'Emily F.', amount: 1700, payout_amount: 1479.00, platform_fee: 221.00, check_in: '2026-01-24', check_out: '2026-01-31', nights: 7, payout_date: '2026-02-01', confirmation_code: 'HMAB0123', created_at: '2026-01-24T00:00:00Z', import_source: 'csv_import' },

  // Joshua Tree Cabin — Feb 2026
  { id: 'rev-12', user_id: 'demo', property_id: '3', source: 'airbnb', description: 'Valentine\'s weekend', guest_name: 'Jason & Amy L.', amount: 890, payout_amount: 774.30, platform_fee: 115.70, check_in: '2026-02-13', check_out: '2026-02-16', nights: 3, payout_date: '2026-02-17', confirmation_code: 'HMAB4567', created_at: '2026-02-13T00:00:00Z', import_source: 'manual' },
];

export function getRevenueForProperty(propertyId: string): RevenueEntry[] {
  return DEMO_REVENUE.filter(r => r.property_id === propertyId);
}

export function getRevenueByMonth(revenue: RevenueEntry[]): Record<string, { gross: number; net: number; fees: number; bookings: number }> {
  const result: Record<string, { gross: number; net: number; fees: number; bookings: number }> = {};
  for (const r of revenue) {
    const month = r.payout_date.substring(0, 7);
    if (!result[month]) result[month] = { gross: 0, net: 0, fees: 0, bookings: 0 };
    result[month].gross += r.amount;
    result[month].net += r.payout_amount;
    result[month].fees += r.platform_fee;
    result[month].bookings++;
  }
  return result;
}

export function getRevenueBySource(revenue: RevenueEntry[]): Record<RevenueSource, number> {
  const result = { airbnb: 0, vrbo: 0, booking: 0, direct: 0, other: 0 };
  for (const r of revenue) {
    result[r.source] += r.payout_amount;
  }
  return result;
}
