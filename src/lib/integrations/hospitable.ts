/**
 * Hospitable API client for HostFi integration
 * 
 * Auth: OAuth 2.0 with refresh tokens
 * Base URL: https://public.api.hospitable.com
 * Auth URL: https://auth.hospitable.com
 * 
 * Access tokens expire in 12 hours, refresh tokens in 90 days.
 */

const HOSPITABLE_API_BASE = 'https://public.api.hospitable.com';
const HOSPITABLE_AUTH_BASE = 'https://auth.hospitable.com';

export interface HospitableCredentials {
  access_token: string;
  refresh_token: string;
  token_expires_at: number; // Unix timestamp in ms
}

export interface HospitableAuth {
  accessToken: string;
}

export interface HospitableProperty {
  id: string; // UUID
  name: string;
  public_name?: string;
  picture?: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  timezone?: string;
  property_type?: string;
  room_type?: string;
  currency?: string;
  capacity?: {
    guests?: number;
    bedrooms?: number;
    beds?: number;
    bathrooms?: number;
  };
}

export interface HospitableReservation {
  id: string; // UUID
  platform: 'airbnb' | 'homeaway' | 'booking' | 'direct' | 'manual' | string;
  platform_id?: string;
  booking_date?: string;
  arrival_date: string;
  departure_date: string;
  nights: number;
  check_in?: string;
  check_out?: string;
  status: string;
  reservation_status?: {
    confirmed?: boolean;
    cancelled?: boolean;
  };
  guests?: {
    adults?: number;
    children?: number;
    infants?: number;
    name?: string;
  };
  financials?: {
    guest?: Record<string, unknown>;
    host?: {
      accommodation?: { amount: number; formatted: string };
      host_fees?: Array<{ amount: number; label: string }>;
      revenue?: { amount: number; formatted: string; label: string };
    };
    currency?: string;
  };
  property_id?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
  };
}

/**
 * Check if credentials need refresh (token expires within 5 minutes)
 */
export function needsRefresh(credentials: HospitableCredentials): boolean {
  const bufferMs = 5 * 60 * 1000; // 5 minutes
  return Date.now() + bufferMs >= credentials.token_expires_at;
}

/**
 * Refresh the access token using the refresh token
 */
export async function refreshAccessToken(
  credentials: HospitableCredentials
): Promise<HospitableCredentials> {
  const clientId = process.env.HOSPITABLE_CLIENT_ID;
  const clientSecret = process.env.HOSPITABLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Hospitable OAuth not configured');
  }

  const res = await fetch(`${HOSPITABLE_AUTH_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: credentials.refresh_token,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Hospitable token refresh failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  
  // Access token expires in 12 hours (43200 seconds)
  const expiresIn = data.expires_in || 43200;
  
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || credentials.refresh_token,
    token_expires_at: Date.now() + expiresIn * 1000,
  };
}

/**
 * Get a valid access token, refreshing if needed.
 * Returns the (possibly refreshed) credentials and the token.
 */
export async function getAccessToken(
  credentials: HospitableCredentials
): Promise<{ auth: HospitableAuth; credentials: HospitableCredentials; refreshed: boolean }> {
  if (needsRefresh(credentials)) {
    const newCredentials = await refreshAccessToken(credentials);
    return {
      auth: { accessToken: newCredentials.access_token },
      credentials: newCredentials,
      refreshed: true,
    };
  }
  return {
    auth: { accessToken: credentials.access_token },
    credentials,
    refreshed: false,
  };
}

/**
 * Build auth from stored credentials (handles legacy formats)
 */
export function authFromCredentials(creds: Record<string, string | number>): HospitableCredentials {
  return {
    access_token: String(creds.access_token || ''),
    refresh_token: String(creds.refresh_token || ''),
    token_expires_at: Number(creds.token_expires_at) || 0,
  };
}

async function hospitableFetch<T>(
  path: string,
  auth: HospitableAuth,
  params?: Record<string, string | string[]>
): Promise<T> {
  const url = new URL(`${HOSPITABLE_API_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (Array.isArray(v)) {
        v.forEach(val => url.searchParams.append(`${k}[]`, val));
      } else {
        url.searchParams.set(k, v);
      }
    });
  }

  const res = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${auth.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Hospitable API error (${res.status} ${path}): ${err}`);
  }

  return res.json();
}

/**
 * Fetch all properties, handling pagination
 */
export async function fetchProperties(
  auth: HospitableAuth
): Promise<HospitableProperty[]> {
  const allProperties: HospitableProperty[] = [];
  let page = 1;

  while (true) {
    const response = await hospitableFetch<PaginatedResponse<HospitableProperty>>(
      '/v2/properties',
      auth,
      { include: 'listings', per_page: '100', page: String(page) }
    );

    allProperties.push(...response.data);

    if (page >= response.meta.last_page) break;
    page++;
  }

  return allProperties;
}

/**
 * Fetch reservations for given properties, handling pagination
 */
export async function fetchReservations(
  auth: HospitableAuth,
  propertyIds: string[],
  startDate?: string,
  endDate?: string
): Promise<HospitableReservation[]> {
  if (propertyIds.length === 0) return [];

  const allReservations: HospitableReservation[] = [];
  let page = 1;

  // Default date range: last 2 years to now
  const now = new Date();
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(now.getFullYear() - 2);
  
  const start = startDate || twoYearsAgo.toISOString().split('T')[0];
  const end = endDate || now.toISOString().split('T')[0];

  while (true) {
    const params: Record<string, string | string[]> = {
      properties: propertyIds,
      include: 'financials',
      per_page: '100',
      page: String(page),
      start_date: start,
      end_date: end,
      status: ['accepted'],
    };

    const response = await hospitableFetch<PaginatedResponse<HospitableReservation>>(
      '/v2/reservations',
      auth,
      params
    );

    allReservations.push(...response.data);

    if (page >= response.meta.last_page) break;
    page++;
  }

  return allReservations;
}

/**
 * Verify credentials by attempting to fetch properties
 */
export async function verifyCredentials(auth: HospitableAuth): Promise<boolean> {
  try {
    await hospitableFetch<PaginatedResponse<HospitableProperty>>(
      '/v2/properties',
      auth,
      { per_page: '1' }
    );
    return true;
  } catch (error) {
    console.error('Hospitable credentials verification failed:', error);
    return false;
  }
}

/**
 * Map Hospitable property to HostFi schema
 */
export function mapPropertyToHostFi(property: HospitableProperty) {
  const addr = property.address || {};
  const capacity = property.capacity || {};

  return {
    name: property.name || property.public_name || 'Unnamed Property',
    address_line1: addr.street || 'Address pending',
    city: addr.city || 'Unknown',
    state: addr.state || 'NA',
    zip: addr.postal_code || '00000',
    property_type: 'str' as const,
    bedrooms: capacity.bedrooms || 1,
    bathrooms: capacity.bathrooms || 1,
    status: 'active' as const,
    hospitable_property_id: property.id,
  };
}

/**
 * Map Hospitable platform to HostFi platform
 */
function mapPlatform(platform: string): string {
  const normalized = platform.toLowerCase();
  
  if (normalized === 'airbnb') return 'airbnb';
  if (normalized === 'homeaway') return 'vrbo';
  if (normalized === 'booking') return 'booking_com';
  if (normalized === 'direct') return 'direct';
  if (normalized === 'manual') return 'other';
  
  return 'other';
}

/**
 * Map Hospitable reservation to HostFi revenue schema
 */
export function mapReservationToRevenue(
  reservation: HospitableReservation,
  propertyId: string
) {
  // Amount is in CENTS — divide by 100
  const revenueAmount = reservation.financials?.host?.revenue?.amount || 0;
  const amount = revenueAmount / 100;

  const platform = mapPlatform(reservation.platform);
  const checkIn = reservation.arrival_date?.split('T')[0] || null;
  const checkOut = reservation.departure_date?.split('T')[0] || null;
  const guestName = reservation.guests?.name || 'Guest';

  return {
    property_id: propertyId,
    platform,
    source: 'api_sync' as const,
    description: `Hospitable Booking — ${checkIn || 'Reservation'}`,
    guest_name: guestName,
    amount,
    platform_fee: 0,
    check_in: checkIn,
    check_out: checkOut,
    date: checkIn || new Date().toISOString().split('T')[0],
    nights: reservation.nights || null,
    confirmation_code: reservation.platform_id || null,
    hospitable_reservation_id: reservation.id,
  };
}
