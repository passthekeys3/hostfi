/**
 * Hospitable Connect API client for HostFi integration
 * 
 * This is a VENDOR-LEVEL integration (different from the user-level OAuth integration).
 * Auth: Bearer token from HOSPITABLE_CONNECT_TOKEN env var
 * Base URL: https://connect.hospitable.com/api/v1
 * Rate limit: 60 req/min per vendor
 * 
 * Amounts are in CENTS — divide by 100 for dollars.
 */

const HOSPITABLE_CONNECT_BASE = 'https://connect.hospitable.com/api/v1';

export interface HospitableConnectCustomer {
  id: string;
  email: string;
  name: string;
  phone?: string;
  timezone?: string;
}

export interface HospitableConnectAuthCode {
  expires_at: string;
  return_url: string;
}

export interface HospitableConnectChannel {
  id: string;
  platform: string;
  platform_id: string;
  name?: string | null;
  picture?: string | null;
  location?: string | null;
  description?: string | null;
  first_connected_at?: string;
}

export interface HospitableConnectAddress {
  street?: string;
  zipcode?: string;
  city?: string;
  state?: string;
  country_code?: string;
}

export interface HospitableConnectListing {
  id: string;
  platform: string;
  platform_id: string;
  public_name?: string;
  private_name?: string;
  picture?: string;
  address?: HospitableConnectAddress;
  bathrooms?: number;
  bedrooms?: number;
  available?: boolean;
  channel?: HospitableConnectChannel;
}

export interface HospitableConnectGuest {
  platform: string;
  platform_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  picture?: string;
}

export interface HospitableConnectFinancial {
  amount: number;
  currency?: string;
  formatted?: string;
  label?: string;
}

export interface HospitableConnectFee {
  amount: number;
  label: string;
  formatted?: string;
}

export interface HospitableConnectReservationFinancials {
  host?: {
    accommodation?: HospitableConnectFinancial;
    cleaning_fee?: HospitableConnectFinancial;
    service_fee?: HospitableConnectFinancial;
    taxes?: HospitableConnectFee[];
    fees?: HospitableConnectFee[];
    discounts?: HospitableConnectFee[];
    payout?: HospitableConnectFinancial;
  };
  guest?: {
    accommodation?: HospitableConnectFinancial;
    cleaning_fee?: HospitableConnectFinancial;
    service_fee?: HospitableConnectFinancial;
    taxes?: HospitableConnectFee[];
    fees?: HospitableConnectFee[];
    total_price?: HospitableConnectFinancial;
  };
}

export interface HospitableConnectReservation {
  id: string;
  platform: string;
  platform_id: string;
  booking_date?: string;
  arrival_date: string;
  departure_date: string;
  nights?: number;
  status?: string;
  guest?: HospitableConnectGuest;
  listing?: HospitableConnectListing;
  listing_id?: string;
  financials?: HospitableConnectReservationFinancials;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    from?: number;
    to?: number;
    per_page?: number;
    path?: string;
  };
  links: {
    first?: string | null;
    last?: string | null;
    prev?: string | null;
    next?: string | null;
  };
}

function getToken(): string {
  const token = process.env.HOSPITABLE_CONNECT_TOKEN;
  if (!token) {
    throw new Error('HOSPITABLE_CONNECT_TOKEN not configured');
  }
  return token;
}

/**
 * Make a request to the Hospitable Connect API with rate limit handling
 */
async function connectFetch<T>(
  path: string,
  options: RequestInit = {},
  params?: Record<string, string>
): Promise<T> {
  const token = getToken();
  const url = new URL(`${HOSPITABLE_CONNECT_BASE}${path}`);
  
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      url.searchParams.set(k, v);
    });
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  const res = await fetch(url.toString(), {
    ...options,
    headers,
  });

  // Handle rate limiting with retry-after
  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('retry-after') || '5', 10);
    const waitMs = Math.min(retryAfter * 1000, 60000); // Cap at 60s
    console.log(`Hospitable Connect rate limited, waiting ${waitMs}ms...`);
    await new Promise(resolve => setTimeout(resolve, waitMs));
    
    // Single retry after backoff
    const retryRes = await fetch(url.toString(), {
      ...options,
      headers,
    });
    
    if (!retryRes.ok) {
      const err = await retryRes.text();
      throw new Error(`Hospitable Connect API error after retry (${retryRes.status}): ${err}`);
    }
    return retryRes.json();
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Hospitable Connect API error (${res.status} ${path}): ${err}`);
  }

  // 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

/**
 * Helper to fetch all pages of a paginated endpoint
 */
async function fetchAllPages<T>(
  path: string,
  params?: Record<string, string>
): Promise<T[]> {
  const all: T[] = [];
  let page = 1;

  while (true) {
    const response = await connectFetch<PaginatedResponse<T>>(
      path,
      {},
      { ...params, page: String(page), per_page: '100' }
    );

    all.push(...response.data);

    // Check if there are more pages (Connect API uses links.next, not meta.last_page)
    if (!response.links.next) {
      break;
    }
    page++;
  }

  return all;
}

// ============================================================================
// Customer Management
// ============================================================================

/**
 * Create a customer in Hospitable Connect
 * Uses the HostFi user ID as the customer ID
 */
export async function createCustomer(
  userId: string,
  email: string,
  name: string
): Promise<HospitableConnectCustomer> {
  const res = await connectFetch<{ data: HospitableConnectCustomer }>(
    '/customers',
    {
      method: 'POST',
      body: JSON.stringify({
        id: userId,
        email,
        name,
      }),
    }
  );
  return res.data;
}

/**
 * Get a customer by ID
 */
export async function getCustomer(
  customerId: string
): Promise<HospitableConnectCustomer> {
  const res = await connectFetch<{ data: HospitableConnectCustomer }>(
    `/customers/${customerId}`
  );
  return res.data;
}

/**
 * Delete a customer from Hospitable Connect
 */
export async function deleteCustomer(customerId: string): Promise<void> {
  await connectFetch<void>(
    `/customers/${customerId}`,
    { method: 'DELETE' }
  );
}

// ============================================================================
// Auth Codes
// ============================================================================

/**
 * Create an auth code for a customer to connect their OTA account
 * Returns a magic link URL the user should be redirected to
 */
export async function createAuthCode(
  customerId: string,
  redirectUrl: string
): Promise<HospitableConnectAuthCode> {
  const res = await connectFetch<{ data: HospitableConnectAuthCode }>(
    '/auth-codes',
    {
      method: 'POST',
      body: JSON.stringify({
        customer_id: customerId,
        redirect_url: redirectUrl,
      }),
    }
  );
  return res.data;
}

// ============================================================================
// Channels
// ============================================================================

/**
 * Fetch all channels (connected OTA accounts) for a customer
 */
export async function fetchChannels(
  customerId: string
): Promise<HospitableConnectChannel[]> {
  return fetchAllPages<HospitableConnectChannel>(
    `/customers/${customerId}/channels`
  );
}

// ============================================================================
// Listings
// ============================================================================

/**
 * Fetch all listings for a customer
 */
export async function fetchListings(
  customerId: string
): Promise<HospitableConnectListing[]> {
  return fetchAllPages<HospitableConnectListing>(
    `/customers/${customerId}/listings`
  );
}

// ============================================================================
// Reservations
// ============================================================================

/**
 * Fetch all reservations for a customer with financials
 */
export async function fetchReservations(
  customerId: string,
  startDate?: string,
  endDate?: string
): Promise<HospitableConnectReservation[]> {
  // Default date range: last 2 years to now
  const now = new Date();
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(now.getFullYear() - 2);
  
  const start = startDate || twoYearsAgo.toISOString().split('T')[0];
  const end = endDate || now.toISOString().split('T')[0];

  const params: Record<string, string> = {
    'arrival_date[after]': start,
    'departure_date[before]': end,
    '_select': [
      'id', 'platform', 'platform_id', 'booking_date',
      'arrival_date', 'departure_date', 'status',
      'guest', 'guest.first_name', 'guest.last_name', 'guest.email',
      'listing', 'listing.id', 'listing.platform', 'listing.platform_id',
      'listing.public_name', 'listing.address',
      'financials',
    ].join(','),
  };

  return fetchAllPages<HospitableConnectReservation>(
    `/customers/${customerId}/reservations`,
    params
  );
}

// ============================================================================
// Mapping Functions
// ============================================================================

/**
 * Map platform names from Hospitable to HostFi
 */
function mapPlatform(platform: string): string {
  const normalized = platform.toLowerCase();
  
  if (normalized === 'airbnb') return 'airbnb';
  if (normalized === 'homeaway') return 'vrbo';
  if (normalized === 'booking') return 'booking_com';
  if (normalized === 'direct') return 'direct';
  
  return 'other';
}

/**
 * Map Hospitable Connect listing to HostFi property schema
 */
export function mapListingToProperty(listing: HospitableConnectListing) {
  const addr = listing.address || {};

  return {
    name: listing.public_name || listing.private_name || 'Unnamed Property',
    address_line1: addr.street || 'Address pending',
    city: addr.city || 'Unknown',
    state: addr.state || 'NA',
    zip: addr.zipcode || '00000',
    property_type: 'str' as const,
    bedrooms: listing.bedrooms || 1,
    bathrooms: listing.bathrooms || 1,
    status: 'active' as const,
    hospitable_connect_listing_id: listing.id,
  };
}

/**
 * Map Hospitable Connect reservation to HostFi revenue schema
 * Uses host.payout.amount for revenue (in cents, ÷100)
 */
export function mapReservationToRevenue(
  reservation: HospitableConnectReservation,
  propertyId: string
) {
  // Get financials from the host object (direct or from financials wrapper)
  const hostFinancials = reservation.financials?.host;
  
  // Amount is in CENTS — divide by 100
  const payoutAmount = hostFinancials?.payout?.amount || 0;
  const amount = payoutAmount / 100;

  // Service fee is also in cents
  const serviceFeeAmount = hostFinancials?.service_fee?.amount || 0;
  const platformFee = serviceFeeAmount / 100;

  const platform = mapPlatform(reservation.platform);
  
  // Split dates on T to get just the date part
  const checkIn = reservation.arrival_date?.split('T')[0] || null;
  const checkOut = reservation.departure_date?.split('T')[0] || null;
  
  // Build guest name from guest object
  const guest = reservation.guest;
  const guestName = guest 
    ? [guest.first_name, guest.last_name].filter(Boolean).join(' ') || 'Guest'
    : 'Guest';

  // Calculate nights if not provided
  let nights = reservation.nights;
  if (!nights && checkIn && checkOut) {
    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);
    nights = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  }

  return {
    property_id: propertyId,
    platform,
    source: 'api_sync' as const,
    description: `Hospitable Connect Booking — ${checkIn || 'Reservation'}`,
    guest_name: guestName,
    amount,
    platform_fee: platformFee,
    check_in: checkIn,
    check_out: checkOut,
    date: checkIn || new Date().toISOString().split('T')[0],
    nights: nights || null,
    confirmation_code: reservation.platform_id || null,
    hospitable_connect_reservation_id: reservation.id,
  };
}

/**
 * Extract cleaning fees and host taxes from a reservation as expense entries
 * Note: expenses table has CHECK constraint requiring source = 'pms_sync'
 * Note: Do NOT include hospitable_reservation_id on expenses (column doesn't exist)
 */
export function extractExpenses(
  reservation: HospitableConnectReservation,
  propertyId: string
): Array<{
  property_id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  source: 'pms_sync';
}> {
  const expenses: Array<{
    property_id: string;
    category: string;
    description: string;
    amount: number;
    date: string;
    source: 'pms_sync';
  }> = [];

  const hostFinancials = reservation.financials?.host;
  if (!hostFinancials) return expenses;

  const checkIn = reservation.arrival_date?.split('T')[0] || new Date().toISOString().split('T')[0];
  const code = reservation.platform_id || reservation.id;

  // Cleaning fee (in cents, ÷100)
  if (hostFinancials.cleaning_fee?.amount) {
    const amt = Math.abs(hostFinancials.cleaning_fee.amount) / 100;
    if (amt > 0) {
      expenses.push({
        property_id: propertyId,
        category: 'cleaning',
        description: `Cleaning Fee — Booking ${code}`,
        amount: amt,
        date: checkIn,
        source: 'pms_sync',
      });
    }
  }

  // Host taxes
  for (const tax of hostFinancials.taxes || []) {
    const amt = Math.abs(tax.amount) / 100;
    if (amt === 0) continue;
    expenses.push({
      property_id: propertyId,
      category: 'tax',
      description: `${tax.label || 'Tax'} — Booking ${code}`,
      amount: amt,
      date: checkIn,
      source: 'pms_sync',
    });
  }

  // Additional host fees (pass-through fees, etc.)
  for (const fee of hostFinancials.fees || []) {
    // Skip negative adjustments (credits) for expense tracking
    if (fee.amount <= 0) continue;
    
    const amt = fee.amount / 100;
    if (amt === 0) continue;
    
    const label = fee.label || 'Fee';
    const category = label.toLowerCase().includes('clean') ? 'cleaning' : 'management';
    
    expenses.push({
      property_id: propertyId,
      category,
      description: `${label} — Booking ${code}`,
      amount: amt,
      date: checkIn,
      source: 'pms_sync',
    });
  }

  return expenses;
}
