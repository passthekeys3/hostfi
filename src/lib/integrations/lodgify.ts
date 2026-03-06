/**
 * Lodgify API client for HostFi integration
 * 
 * Auth: API Key via X-ApiKey header
 * Base URL: https://api.lodgify.com/v2
 * Docs: https://docs.lodgify.com/reference
 */

const LODGIFY_API_BASE = 'https://api.lodgify.com/v2';

async function lodgifyFetch(path: string, apiKey: string, params?: Record<string, string>) {
  const url = new URL(`${LODGIFY_API_BASE}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: {
      'X-ApiKey': apiKey,
      'Accept': 'application/json',
    },
  });

  if (res.status === 429) {
    throw new Error('Lodgify rate limit exceeded. Please try again later.');
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Lodgify API error (${res.status} ${path}): ${err}`);
  }

  return res.json();
}

/**
 * Verify API key is valid by making a lightweight call
 */
export async function verifyApiKey(apiKey: string): Promise<boolean> {
  try {
    await lodgifyFetch('/properties', apiKey, { page: '1', size: '1' });
    return true;
  } catch {
    return false;
  }
}

// --- Types ---

export interface LodgifyProperty {
  id: number;
  name: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  bedrooms?: number;
  bathrooms?: number;
  max_guests?: number;
  status?: string;
  // Lodgify also returns these at top level in some versions
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export interface LodgifyReservation {
  id: number;
  property_id: number;
  source?: string;
  source_text?: string;
  guest?: {
    name?: string;
    email?: string;
  };
  guest_name?: string;
  arrival: string;
  departure: string;
  total_amount?: number;
  amount?: number;
  currency?: string;
  status?: string;
  confirmation_code?: string;
  rooms?: number;
  nights?: number;
  // Financial fields
  channel_commission?: number;
  owner_revenue?: number;
}

// --- API Methods ---

export async function getProperties(apiKey: string, params?: { page?: number; size?: number }): Promise<{ properties: LodgifyProperty[]; total: number }> {
  const queryParams: Record<string, string> = {};
  if (params?.page) queryParams.page = String(params.page);
  if (params?.size) queryParams.size = String(params.size);

  const result = await lodgifyFetch('/properties', apiKey, queryParams);
  
  // Lodgify v2 returns { items: [...], count: N } or just an array
  if (Array.isArray(result)) {
    return { properties: result, total: result.length };
  }
  return { properties: result.items || result, total: result.count || result.items?.length || 0 };
}

export async function getReservations(apiKey: string, params?: { page?: number; size?: number }): Promise<{ reservations: LodgifyReservation[]; total: number }> {
  const queryParams: Record<string, string> = {};
  if (params?.page) queryParams.page = String(params.page);
  if (params?.size) queryParams.size = String(params.size);

  const result = await lodgifyFetch('/reservations/bookings', apiKey, queryParams);
  
  if (Array.isArray(result)) {
    return { reservations: result, total: result.length };
  }
  return { reservations: result.items || result, total: result.count || result.items?.length || 0 };
}

// --- Mappers ---

export function mapPropertyToHostFi(property: LodgifyProperty) {
  // Lodgify may nest address or put it at top level
  const addr = property.address || {};
  return {
    name: property.name || 'Unnamed Property',
    address_line1: addr.street || property.street || 'Address pending',
    city: addr.city || property.city || 'Unknown',
    state: addr.state || property.state || 'NA',
    zip: addr.zip || property.zip || '00000',
    property_type: 'str' as const,
    bedrooms: property.bedrooms || 1,
    bathrooms: property.bathrooms || 1,
    status: (property.status === 'active' || !property.status) ? 'active' : 'inactive',
    lodgify_property_id: String(property.id),
  };
}

export function mapReservationToRevenue(reservation: LodgifyReservation, propertyId: string) {
  const source = (reservation.source_text || reservation.source || '').toLowerCase();
  let platform = 'other';
  if (source.includes('airbnb')) platform = 'airbnb';
  else if (source.includes('vrbo') || source.includes('homeaway')) platform = 'vrbo';
  else if (source.includes('booking')) platform = 'booking_com';
  else if (source.includes('direct') || source.includes('manual')) platform = 'direct';

  const amount = reservation.owner_revenue || reservation.total_amount || reservation.amount || 0;

  // Calculate nights from dates if not provided
  let nights = reservation.nights || null;
  if (!nights && reservation.arrival && reservation.departure) {
    const arrDate = new Date(reservation.arrival);
    const depDate = new Date(reservation.departure);
    nights = Math.round((depDate.getTime() - arrDate.getTime()) / (1000 * 60 * 60 * 24));
    if (nights <= 0) nights = null;
  }

  return {
    property_id: propertyId,
    platform,
    source: 'api_sync',
    guest_name: reservation.guest?.name || reservation.guest_name || 'Guest',
    amount,
    platform_fee: reservation.channel_commission || 0,
    date: reservation.arrival?.split('T')[0] || '',
    check_in: reservation.arrival?.split('T')[0] || '',
    check_out: reservation.departure?.split('T')[0] || '',
    nights,
    confirmation_code: reservation.confirmation_code || '',
    payout_date: null,
    lodgify_reservation_id: String(reservation.id),
  };
}
