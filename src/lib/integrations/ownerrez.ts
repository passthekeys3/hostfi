/**
 * OwnerRez API client for HostFi integration
 * 
 * Auth: HTTP Basic Auth (email + API token)
 * Base URL: https://api.ownerrez.com/v2
 * Docs: https://www.ownerrez.com/support/articles/api-overview
 */

const OWNERREZ_API_BASE = 'https://api.ownerrez.com/v2';

function basicAuth(email: string, token: string): string {
  return 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64');
}

async function ownerrezFetch(path: string, email: string, token: string, params?: Record<string, string>) {
  const url = new URL(`${OWNERREZ_API_BASE}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: { 'Authorization': basicAuth(email, token), 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OwnerRez API error (${res.status} ${path}): ${err}`);
  }

  return res.json();
}

export interface OwnerRezProperty {
  id: number;
  name: string;
  address: {
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  bedrooms: number;
  bathrooms: number;
  active: boolean;
}

export interface OwnerRezBooking {
  id: number;
  property_id: number;
  guest: { first_name?: string; last_name?: string };
  arrival: string;
  departure: string;
  status: string;
  total_amount: number;
  channel?: string;
  confirmation_code?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  page_size: number;
  total_count: number;
  has_more: boolean;
}

export async function getProperties(email: string, token: string, params?: { page?: number; page_size?: number }): Promise<PaginatedResponse<OwnerRezProperty>> {
  const queryParams: Record<string, string> = {};
  if (params?.page) queryParams.page = String(params.page);
  if (params?.page_size) queryParams.page_size = String(params.page_size);
  
  const result = await ownerrezFetch('/properties', email, token, queryParams);
  // OwnerRez returns { items: [], page: 1, page_size: 50, total_count: N }
  return {
    items: result.items || [],
    page: result.page || 1,
    page_size: result.page_size || 50,
    total_count: result.total_count || result.items?.length || 0,
    has_more: result.items?.length === (result.page_size || 50),
  };
}

export async function getBookings(email: string, token: string, params?: { page?: number; page_size?: number }): Promise<PaginatedResponse<OwnerRezBooking>> {
  const queryParams: Record<string, string> = {};
  if (params?.page) queryParams.page = String(params.page);
  if (params?.page_size) queryParams.page_size = String(params.page_size);
  
  const result = await ownerrezFetch('/bookings', email, token, queryParams);
  return {
    items: result.items || [],
    page: result.page || 1,
    page_size: result.page_size || 50,
    total_count: result.total_count || result.items?.length || 0,
    has_more: result.items?.length === (result.page_size || 50),
  };
}

export async function verifyCredentials(email: string, token: string): Promise<boolean> {
  try {
    await ownerrezFetch('/properties', email, token, { page_size: '1' });
    return true;
  } catch {
    return false;
  }
}

export function mapPropertyToHostFi(property: OwnerRezProperty) {
  const addr = property.address || {};
  return {
    name: property.name || 'Unnamed Property',
    address_line1: addr.street1 || 'Address pending',
    city: addr.city || 'Unknown',
    state: addr.state || 'NA',
    zip: addr.postal_code || '00000',
    property_type: 'str' as const,
    bedrooms: property.bedrooms || 1,
    bathrooms: property.bathrooms || 1,
    status: property.active ? 'active' : 'inactive',
    ownerrez_property_id: String(property.id),
  };
}

export function mapBookingToRevenue(booking: OwnerRezBooking, propertyId: string) {
  const channel = (booking.channel || '').toLowerCase();
  let platform = 'other';
  if (channel.includes('airbnb')) platform = 'airbnb';
  else if (channel.includes('vrbo') || channel.includes('homeaway')) platform = 'vrbo';
  else if (channel.includes('booking')) platform = 'booking_com';
  else if (channel.includes('direct') || channel.includes('owner')) platform = 'direct';

  return {
    property_id: propertyId,
    platform,
    source: 'api_sync',
    guest_name: [booking.guest?.first_name, booking.guest?.last_name].filter(Boolean).join(' ') || 'Guest',
    amount: booking.total_amount || 0,
    platform_fee: 0,
    check_in: booking.arrival?.split('T')[0] || '',
    check_out: booking.departure?.split('T')[0] || '',
    confirmation_code: booking.confirmation_code || '',
    payout_date: null,
    ownerrez_booking_id: String(booking.id),
  };
}
