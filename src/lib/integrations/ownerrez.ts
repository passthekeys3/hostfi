/**
 * OwnerRez API client for HostFi integration
 * 
 * Auth: OAuth 2.0 Bearer token (preferred) OR HTTP Basic Auth (legacy)
 * Base URL: https://api.ownerrez.com/v2
 * Docs: https://www.ownerrez.com/support/articles/api-overview
 * OAuth: https://www.ownerrez.com/support/articles/api-oauth-app
 * 
 * Access tokens are long-lived (no refresh needed).
 */

const OWNERREZ_API_BASE = 'https://api.ownerrez.com/v2';

export interface OwnerRezAuth {
  type: 'oauth' | 'basic';
  accessToken?: string;   // OAuth bearer token
  email?: string;         // Basic auth email
  apiToken?: string;      // Basic auth token
}

function buildAuthHeader(auth: OwnerRezAuth): string {
  if (auth.type === 'oauth' && auth.accessToken) {
    return `Bearer ${auth.accessToken}`;
  }
  if (auth.type === 'basic' && auth.email && auth.apiToken) {
    return 'Basic ' + Buffer.from(`${auth.email}:${auth.apiToken}`).toString('base64');
  }
  throw new Error('Invalid OwnerRez auth config');
}

/** Helper to build auth from stored credentials */
export function authFromCredentials(credentials: Record<string, string>): OwnerRezAuth {
  if (credentials.auth_type === 'oauth' && credentials.access_token) {
    return { type: 'oauth', accessToken: credentials.access_token };
  }
  // Legacy basic auth
  return { type: 'basic', email: credentials.email, apiToken: credentials.api_token };
}

async function ownerrezFetch(path: string, auth: OwnerRezAuth, params?: Record<string, string>) {
  const url = new URL(`${OWNERREZ_API_BASE}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: { 'Authorization': buildAuthHeader(auth), 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OwnerRez API error (${res.status} ${path}): ${err}`);
  }

  return res.json();
}

// Backwards-compatible wrapper for basic auth callers
function legacyAuth(email: string, token: string): OwnerRezAuth {
  return { type: 'basic', email, apiToken: token };
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
  guest_id?: number;
  guest?: { first_name?: string; last_name?: string };
  arrival: string;
  departure: string;
  status: string;
  total_amount: number;
  total_paid?: number;
  channel?: string;
  confirmation_code?: string;
  booked_utc?: string;
  type?: string;
  is_block?: boolean;
  property?: { id: number; name: string };
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  page_size: number;
  total_count: number;
  has_more: boolean;
}

export async function getProperties(authOrEmail: OwnerRezAuth | string, tokenOrParams?: string | { page?: number; page_size?: number }, params?: { page?: number; page_size?: number }): Promise<PaginatedResponse<OwnerRezProperty>> {
  let auth: OwnerRezAuth;
  let actualParams: { page?: number; page_size?: number } | undefined;
  if (typeof authOrEmail === 'string') {
    auth = legacyAuth(authOrEmail, tokenOrParams as string);
    actualParams = params;
  } else {
    auth = authOrEmail;
    actualParams = (typeof tokenOrParams === 'object' ? tokenOrParams : params) as { page?: number; page_size?: number } | undefined;
  }
  const queryParams: Record<string, string> = {};
  if (actualParams?.page) queryParams.page = String(actualParams.page);
  if (actualParams?.page_size) queryParams.page_size = String(actualParams.page_size);
  
  const result = await ownerrezFetch('/properties', auth, queryParams);
  return {
    items: result.items || [],
    page: result.page || 1,
    page_size: result.page_size || 50,
    total_count: result.total_count || result.items?.length || 0,
    has_more: result.items?.length === (result.page_size || 50),
  };
}

export async function getBookings(authOrEmail: OwnerRezAuth | string, tokenOrParams?: string | { page?: number; page_size?: number }, params?: { page?: number; page_size?: number }): Promise<PaginatedResponse<OwnerRezBooking>> {
  let auth: OwnerRezAuth;
  let actualParams: { page?: number; page_size?: number } | undefined;
  if (typeof authOrEmail === 'string') {
    auth = legacyAuth(authOrEmail, tokenOrParams as string);
    actualParams = params;
  } else {
    auth = authOrEmail;
    actualParams = (typeof tokenOrParams === 'object' ? tokenOrParams : params) as { page?: number; page_size?: number } | undefined;
  }
  const queryParams: Record<string, string> = {};
  if (actualParams?.page) queryParams.page = String(actualParams.page);
  if (actualParams?.page_size) queryParams.page_size = String(actualParams.page_size);
  
  // OwnerRez requires either property_ids or since_utc for bookings
  if (!queryParams.property_ids && !queryParams.since_utc) {
    // Default to last 2 years of bookings
    const since = new Date();
    since.setFullYear(since.getFullYear() - 2);
    queryParams.since_utc = since.toISOString();
  }
  const result = await ownerrezFetch('/bookings', auth, queryParams);
  return {
    items: result.items || [],
    page: result.page || 1,
    page_size: result.page_size || 50,
    total_count: result.total_count || result.items?.length || 0,
    has_more: result.items?.length === (result.page_size || 50),
  };
}

export async function verifyCredentials(emailOrAuth: OwnerRezAuth | string, token?: string): Promise<boolean> {
  const auth = typeof emailOrAuth === 'string' ? legacyAuth(emailOrAuth, token!) : emailOrAuth;
  try {
    await ownerrezFetch('/properties', auth, { page_size: '1' });
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

  // OwnerRez returns dates as "2026-02-17" (no T), but handle both formats
  const checkIn = booking.arrival?.split('T')[0] || null;
  const checkOut = booking.departure?.split('T')[0] || null;

  // Guest name: OwnerRez may return guest object or just guest_id
  const guestName = booking.guest
    ? [booking.guest.first_name, booking.guest.last_name].filter(Boolean).join(' ')
    : null;

  return {
    property_id: propertyId,
    platform,
    source: 'api_sync' as const,
    description: booking.property?.name
      ? `${booking.property.name} — ${checkIn || 'Booking'}`
      : 'OwnerRez Booking',
    guest_name: guestName || 'Guest',
    amount: booking.total_amount || 0,
    platform_fee: 0,
    check_in: checkIn,
    check_out: checkOut,
    date: checkIn || new Date().toISOString().split('T')[0],
    ownerrez_booking_id: String(booking.id),
  };
}
