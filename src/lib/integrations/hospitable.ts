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
  stay_type?: 'guest_stay' | 'owner_stay';
  financials?: {
    guest?: Record<string, unknown>;
    host?: {
      accommodation?: { amount: number; formatted: string };
      guest_fees?: Array<{ amount: number; formatted: string; label: string; category: string }>;
      host_fees?: Array<{ amount: number; formatted: string; label: string; category: string }>;
      discounts?: Array<{ amount: number; formatted: string; label: string; category: string }>;
      adjustments?: Array<{ amount: number; formatted: string; label: string; category: string }>;
      taxes?: Array<{ amount: number; formatted: string; label: string; category: string }>;
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
): Promise<{ auth: HospitableAuth; credentials: HospitableCredentials; refreshed: boolean; refreshExpiringSoon: boolean }> {
  const expiringSoon = refreshTokenExpiringSoon(credentials);

  if (refreshTokenExpired(credentials)) {
    throw new Error('Hospitable refresh token expired (90 days). User must reconnect.');
  }

  if (needsRefresh(credentials)) {
    const newCredentials = await refreshAccessToken(credentials);
    return {
      auth: { accessToken: newCredentials.access_token },
      credentials: newCredentials,
      refreshed: true,
      refreshExpiringSoon: expiringSoon,
    };
  }
  return {
    auth: { accessToken: credentials.access_token },
    credentials,
    refreshed: false,
    refreshExpiringSoon: expiringSoon,
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

/**
 * Check if refresh token is nearing expiry (90-day lifetime).
 * Returns true if token was issued more than 80 days ago.
 * Call this during sync to proactively warn users to reconnect.
 */
export function refreshTokenExpiringSoon(credentials: HospitableCredentials): boolean {
  // Refresh tokens last 90 days. The token_expires_at tracks the ACCESS token.
  // We estimate refresh token age from access token expiry:
  // If access token expires in 12h, it was issued at (token_expires_at - 12h).
  // Refresh token was issued at the same time.
  const accessTokenIssuedAt = credentials.token_expires_at - (12 * 60 * 60 * 1000);
  const refreshTokenMaxAge = 90 * 24 * 60 * 60 * 1000; // 90 days
  const warningThreshold = 80 * 24 * 60 * 60 * 1000; // warn at 80 days
  const age = Date.now() - accessTokenIssuedAt;
  return age > warningThreshold;
}

/**
 * Check if refresh token is definitely expired (>90 days)
 */
export function refreshTokenExpired(credentials: HospitableCredentials): boolean {
  const accessTokenIssuedAt = credentials.token_expires_at - (12 * 60 * 60 * 1000);
  const refreshTokenMaxAge = 90 * 24 * 60 * 60 * 1000;
  const age = Date.now() - accessTokenIssuedAt;
  return age > refreshTokenMaxAge;
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

  // Handle rate limiting with retry-after
  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('retry-after') || '5', 10);
    const waitMs = Math.min(retryAfter * 1000, 60000); // Cap at 60s
    await new Promise(resolve => setTimeout(resolve, waitMs));
    // Single retry after backoff
    const retryRes = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${auth.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    if (!retryRes.ok) {
      const err = await retryRes.text();
      throw new Error(`Hospitable API error after retry (${retryRes.status} ${path}): ${err}`);
    }
    return retryRes.json();
  }

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
 * Fetch reservations for given properties, handling pagination.
 * Fetches per-property so we can tag each reservation with its property ID
 * (the API response doesn't include a direct property_id field).
 */
export async function fetchReservations(
  auth: HospitableAuth,
  propertyIds: string[],
  startDate?: string,
  endDate?: string
): Promise<HospitableReservation[]> {
  if (propertyIds.length === 0) return [];

  const allReservations: HospitableReservation[] = [];

  // Default date range: last 2 years to now
  const now = new Date();
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(now.getFullYear() - 2);
  
  const start = startDate || twoYearsAgo.toISOString().split('T')[0];
  const end = endDate || now.toISOString().split('T')[0];

  // Fetch per-property so we can tag each reservation with its property ID
  for (const propertyId of propertyIds) {
    let page = 1;

    while (true) {
      const params: Record<string, string | string[]> = {
        properties: [propertyId],
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

      // Tag each reservation with the property ID it was fetched for
      // Skip owner stays — they're not revenue
      for (const res of response.data) {
        if (res.stay_type === 'owner_stay') continue;
        res.property_id = propertyId;
        allReservations.push(res);
      }

      if (page >= response.meta.last_page) break;
      page++;
    }
  }

  return allReservations;
}

/**
 * Fetch the authenticated user's profile
 */
export async function fetchUser(auth: HospitableAuth): Promise<{ id: string; email: string; name: string }> {
  const res = await hospitableFetch<{ data: { id: string; email: string; name: string } }>(
    '/v2/user',
    auth
  );
  return res.data;
}

/**
 * Fetch a single reservation by UUID with financials
 */
export async function fetchReservation(
  auth: HospitableAuth,
  uuid: string
): Promise<HospitableReservation> {
  const res = await hospitableFetch<{ data: HospitableReservation }>(
    `/v2/reservations/${uuid}`,
    auth,
    { include: 'financials,properties' }
  );
  return res.data;
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
 * Check if a reservation is an owner stay (personal use, not revenue)
 */
export function isOwnerStay(reservation: HospitableReservation): boolean {
  return reservation.stay_type === 'owner_stay';
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

  // Sum host service fees (e.g. "Host Service Fee") — these are negative amounts in cents
  const hostFees = reservation.financials?.host?.host_fees || [];
  const totalPlatformFee = hostFees.reduce((sum, fee) => sum + Math.abs(fee.amount), 0) / 100;

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
    platform_fee: totalPlatformFee,
    check_in: checkIn,
    check_out: checkOut,
    date: checkIn || new Date().toISOString().split('T')[0],
    nights: reservation.nights || null,
    confirmation_code: reservation.platform_id || null,
    hospitable_reservation_id: reservation.id,
  };
}

/**
 * Extract host-side fees from a reservation as HostFi expense entries.
 * Returns cleaning fees, host taxes, and adjustments as individual expense items.
 * These are costs deducted from the host payout.
 */
export function extractExpensesFromReservation(
  reservation: HospitableReservation,
  propertyId: string
): Array<{
  property_id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  source: 'api_sync';
  hospitable_reservation_id: string;
}> {
  const expenses: Array<{
    property_id: string;
    category: string;
    description: string;
    amount: number;
    date: string;
    source: 'api_sync';
    hospitable_reservation_id: string;
  }> = [];
  const host = reservation.financials?.host;
  if (!host) return expenses;

  const checkIn = reservation.arrival_date?.split('T')[0] || new Date().toISOString().split('T')[0];
  const code = reservation.platform_id || reservation.id;

  // Guest fees charged by host (cleaning fee, etc.) — these are costs the host pays for
  for (const fee of host.guest_fees || []) {
    const amt = Math.abs(fee.amount) / 100;
    if (amt === 0) continue;
    const label = fee.label || 'Guest Fee';
    const category = label.toLowerCase().includes('clean') ? 'cleaning' : 'management';
    expenses.push({
      property_id: propertyId,
      category,
      description: `${label} — Booking ${code}`,
      amount: amt,
      date: checkIn,
      source: 'api_sync',
      hospitable_reservation_id: reservation.id,
    });
  }

  // Host taxes
  for (const tax of host.taxes || []) {
    const amt = Math.abs(tax.amount) / 100;
    if (amt === 0) continue;
    expenses.push({
      property_id: propertyId,
      category: 'tax',
      description: `${tax.label || 'Tax'} — Booking ${code}`,
      amount: amt,
      date: checkIn,
      source: 'api_sync',
      hospitable_reservation_id: reservation.id,
    });
  }

  return expenses;
}
