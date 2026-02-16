/**
 * Guesty API client for HostFi integration
 * 
 * Auth: Client credentials OAuth2 flow
 * Base URL: https://open-api.guesty.com
 * Token endpoint: https://open-api.guesty.com/oauth2/token
 * Token TTL: 24 hours
 */

const GUESTY_TOKEN_URL = 'https://open-api.guesty.com/oauth2/token';
const GUESTY_API_BASE = 'https://open-api.guesty.com/v1';

// In-memory token cache (per-process)
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Get a valid Guesty access token using client credentials.
 * For marketplace integrations, each user would store their own credentials.
 * For now, we use the app-level credentials (Kevin's account).
 */
export async function getGuestyToken(clientId?: string, clientSecret?: string): Promise<string> {
  const id = clientId || process.env.GUESTY_CLIENT_ID;
  const secret = clientSecret || process.env.GUESTY_CLIENT_SECRET;

  if (!id || !secret) {
    throw new Error('Guesty credentials not configured');
  }

  // Return cached token if still valid (with 5min buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 300_000) {
    return cachedToken.token;
  }

  const res = await fetch(GUESTY_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: id,
      client_secret: secret,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Guesty token error (${res.status}): ${err}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  };

  return cachedToken.token;
}

/**
 * Make an authenticated request to the Guesty API
 */
async function guestyFetch(
  path: string,
  options: { method?: string; body?: unknown; params?: Record<string, string> } = {}
) {
  const token = await getGuestyToken();
  const url = new URL(`${GUESTY_API_BASE}${path}`);
  if (options.params) {
    Object.entries(options.params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const res = await fetch(url.toString(), {
    method: options.method || 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Guesty API error (${res.status} ${path}): ${err}`);
  }

  return res.json();
}

// ============================================================================
// Listings
// ============================================================================

export interface GuestyListing {
  _id: string;
  title: string;
  nickname?: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    zipcode?: string;
    country?: string;
    full?: string;
    lat?: number;
    lng?: number;
  };
  bedrooms: number;
  bathrooms: number;
  accommodates: number;
  propertyType: string;
  roomType?: string;
  active: boolean;
  picture?: {
    thumbnail?: string;
    regular?: string;
  };
  prices?: {
    basePrice?: number;
    cleaningFee?: number;
    currency?: string;
  };
}

export async function getListings(limit = 100, skip = 0): Promise<{ results: GuestyListing[]; count: number }> {
  return guestyFetch('/listings', {
    params: { limit: String(limit), skip: String(skip) },
  });
}

export async function getListing(id: string): Promise<GuestyListing> {
  return guestyFetch(`/listings/${id}`);
}

// ============================================================================
// Reservations
// ============================================================================

export interface GuestyReservation {
  _id: string;
  listingId: string;
  confirmationCode?: string;
  guest?: {
    fullName?: string;
    email?: string;
    phone?: string;
  };
  checkIn: string;
  checkOut: string;
  status: string; // confirmed, canceled, checked_in, checked_out, inquiry
  nightsCount?: number;
  money?: {
    hostPayout?: number;
    totalPaid?: number;
    fareAccommodation?: number;
    fareCleaning?: number;
    hostServiceFee?: number;
    currency?: string;
  };
  source?: string;
  createdAt?: string;
}

export async function getReservations(
  params: { limit?: number; skip?: number; checkInFrom?: string; checkInTo?: string; listingId?: string } = {}
): Promise<{ results: GuestyReservation[]; count: number }> {
  const queryParams: Record<string, string> = {
    limit: String(params.limit || 25),
    skip: String(params.skip || 0),
  };
  if (params.checkInFrom) queryParams['checkIn[$gte]'] = params.checkInFrom;
  if (params.checkInTo) queryParams['checkIn[$lte]'] = params.checkInTo;
  if (params.listingId) queryParams.listingId = params.listingId;

  return guestyFetch('/reservations', { params: queryParams });
}

// ============================================================================
// Mapping helpers (Guesty → HostFi)
// ============================================================================

/**
 * Map a Guesty listing to HostFi property fields
 */
export function mapListingToProperty(listing: GuestyListing) {
  const addr = listing.address || {};
  // Parse street into line1 (Guesty format: "Street Name Number")
  const street = addr.street || '';

  return {
    name: listing.nickname || listing.title || 'Unnamed Property',
    address_line1: street,
    city: addr.city || '',
    state: abbreviateState(addr.state || ''),
    zip: addr.zipcode?.replace(/-\d+$/, '') || '', // strip +4 zip
    property_type: mapPropertyType(listing.propertyType, listing.roomType),
    bedrooms: listing.bedrooms || 1,
    bathrooms: listing.bathrooms || 1,
    status: listing.active ? 'active' : 'inactive',
    guesty_listing_id: listing._id,
  };
}

/**
 * Map a Guesty reservation to HostFi revenue fields
 */
export function mapReservationToRevenue(reservation: GuestyReservation, propertyId: string) {
  const money = reservation.money || {};
  return {
    property_id: propertyId,
    source: mapSource(reservation.source),
    guest_name: reservation.guest?.fullName || 'Guest',
    amount: money.hostPayout || money.fareAccommodation || 0,
    platform_fee: money.hostServiceFee || 0,
    check_in: reservation.checkIn?.split('T')[0] || '',
    check_out: reservation.checkOut?.split('T')[0] || '',
    confirmation_code: reservation.confirmationCode || '',
    payout_date: null,
    guesty_reservation_id: reservation._id,
  };
}

function mapPropertyType(guestyType: string, roomType?: string): string {
  const t = (guestyType || '').toLowerCase();
  if (t.includes('apartment') || t.includes('condo') || roomType?.toLowerCase().includes('entire')) return 'str';
  if (t.includes('house') || t.includes('villa') || t.includes('cabin')) return 'str';
  return 'str'; // Default to STR for Guesty properties
}

function mapSource(source?: string): string {
  if (!source) return 'other';
  const s = source.toLowerCase();
  if (s.includes('airbnb')) return 'airbnb';
  if (s.includes('vrbo') || s.includes('homeaway')) return 'vrbo';
  if (s.includes('booking')) return 'booking';
  if (s.includes('direct')) return 'direct';
  return 'other';
}

function abbreviateState(state: string): string {
  const map: Record<string, string> = {
    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
    'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
    'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
    'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
    'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
    'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
    'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
    'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
    'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
    'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY',
    'district of columbia': 'DC',
  };
  if (state.length === 2) return state.toUpperCase();
  return map[state.toLowerCase()] || state.slice(0, 2).toUpperCase();
}
