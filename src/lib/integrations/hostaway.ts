/**
 * Hostaway API client for HostFi integration
 * 
 * Auth: OAuth2 client credentials
 * Base URL: https://api.hostaway.com/v1
 * Token endpoint: https://api.hostaway.com/accessTokens
 * Docs: https://api.hostaway.com/documentation
 */

const HOSTAWAY_TOKEN_URL = 'https://api.hostaway.com/accessTokens';
const HOSTAWAY_API_BASE = 'https://api.hostaway.com/v1';

// Per-credential token cache (keyed by account_id)
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

export async function getHostawayToken(accountId: string, apiKey: string): Promise<string> {
  // Return cached token if still valid (with 5min buffer)
  const cached = tokenCache.get(accountId);
  if (cached && cached.expiresAt > Date.now() + 300_000) {
    return cached.token;
  }

  const res = await fetch(HOSTAWAY_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: accountId,
      client_secret: apiKey,
      scope: 'general',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Hostaway token error (${res.status}): ${err}`);
  }

  const data = await res.json();
  tokenCache.set(accountId, {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  });
  return data.access_token;
}

async function hostawayFetch(path: string, token: string, params?: Record<string, string>) {
  const url = new URL(`${HOSTAWAY_API_BASE}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Hostaway API error (${res.status} ${path}): ${err}`);
  }

  const data = await res.json();
  return data.result;
}

export interface HostawayListing {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zipcode: string;
  countryCode: string;
  bedrooms: number;
  bathrooms: number;
  personCapacity: number;
  propertyTypeId: number;
  isActive: number;
}

export interface HostawayReservation {
  id: number;
  listingMapId: number;
  channelName: string;
  guestName: string;
  arrivalDate: string;
  departureDate: string;
  totalPrice: number;
  hostNote: string;
  status: string;
  channelCommissionAmount: number;
  confirmationCode: string;
}

export async function getListings(token: string, params?: { limit?: number; offset?: number }): Promise<{ listings: HostawayListing[]; total: number }> {
  const queryParams: Record<string, string> = {};
  if (params?.limit) queryParams.limit = String(params.limit);
  if (params?.offset) queryParams.offset = String(params.offset);
  
  const result = await hostawayFetch('/listings', token, queryParams);
  // Hostaway returns array in result, total count in response headers (we estimate from results)
  return { listings: result || [], total: result?.length || 0 };
}

export async function getReservations(token: string, params?: { limit?: number; offset?: number }): Promise<{ reservations: HostawayReservation[]; total: number }> {
  const queryParams: Record<string, string> = {};
  if (params?.limit) queryParams.limit = String(params.limit);
  if (params?.offset) queryParams.offset = String(params.offset);
  
  const result = await hostawayFetch('/reservations', token, queryParams);
  return { reservations: result || [], total: result?.length || 0 };
}

export function mapListingToProperty(listing: HostawayListing) {
  return {
    name: listing.name || 'Unnamed Property',
    address_line1: listing.address || 'Address pending',
    city: listing.city || 'Unknown',
    state: listing.state || 'NA',
    zip: listing.zipcode || '00000',
    property_type: 'str' as const,
    bedrooms: listing.bedrooms || 1,
    bathrooms: listing.bathrooms || 1,
    status: listing.isActive ? 'active' : 'inactive',
    hostaway_listing_id: String(listing.id),
  };
}

export function mapReservationToRevenue(reservation: HostawayReservation, propertyId: string) {
  const channel = (reservation.channelName || '').toLowerCase();
  let platform = 'other';
  if (channel.includes('airbnb')) platform = 'airbnb';
  else if (channel.includes('vrbo') || channel.includes('homeaway')) platform = 'vrbo';
  else if (channel.includes('booking')) platform = 'booking_com';
  else if (channel.includes('direct')) platform = 'direct';

  return {
    property_id: propertyId,
    platform,
    source: 'api_sync',
    guest_name: reservation.guestName || 'Guest',
    amount: reservation.totalPrice || 0,
    platform_fee: reservation.channelCommissionAmount || 0,
    check_in: reservation.arrivalDate?.split('T')[0] || '',
    check_out: reservation.departureDate?.split('T')[0] || '',
    confirmation_code: reservation.confirmationCode || '',
    payout_date: null,
    hostaway_reservation_id: String(reservation.id),
  };
}
