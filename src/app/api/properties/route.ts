import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { createRateLimiter } from '@/lib/rate-limit';
import { PROPERTY_LIMITS, type Plan } from '@/lib/feature-gates';
import { getServiceClient } from '@/lib/supabase/service';

const isRateLimited = createRateLimiter('properties', 10, 60_000);

/**
 * POST /api/properties — Create a new property with server-side plan limit enforcement
 */
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const auth = await authenticateRequest();

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Get user's plan
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', auth.userId)
      .single();
    const userPlan = (profile?.plan || 'free') as Plan;
    const limit = PROPERTY_LIMITS[userPlan];

    // Count existing properties
    const { count } = await supabase
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', auth.userId);

    if ((count ?? 0) >= limit) {
      return NextResponse.json(
        { error: `You've reached the ${limit}-property limit on the ${userPlan} plan. Upgrade to add more.` },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, property_type, address_line1, address_line2, city, state, zip, bedrooms, bathrooms } = body;

    if (!name || !property_type || !city || !state) {
      return NextResponse.json({ error: 'Missing required fields: name, property_type, city, state' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('properties')
      .insert({
        user_id: auth.userId,
        name,
        property_type,
        address_line1: address_line1 || null,
        address_line2: address_line2 || null,
        city,
        state,
        zip: zip || null,
        bedrooms: bedrooms || null,
        bathrooms: bathrooms || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Property insert error:', error);
      return NextResponse.json({ error: 'Failed to create property' }, { status: 500 });
    }

    return NextResponse.json({ success: true, property: data });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('Properties API error:', error);
    return NextResponse.json({ error: 'Failed to create property' }, { status: 500 });
  }
}

/**
 * DELETE /api/properties — Delete a property
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateRequest();

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('id');

    if (!propertyId) {
      return NextResponse.json({ error: 'Property ID required' }, { status: 400 });
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Verify ownership
    const { data: property } = await supabase
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .eq('user_id', auth.userId)
      .single();

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', propertyId)
      .eq('user_id', auth.userId);

    if (error) {
      console.error('Property delete error:', error);
      return NextResponse.json({ error: 'Failed to delete property' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('Properties API error:', error);
    return NextResponse.json({ error: 'Failed to delete property' }, { status: 500 });
  }
}

/**
 * PATCH /api/properties — Update a property
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateRequest();

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Property ID required' }, { status: 400 });
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Only allow specific fields to be updated
    const allowedFields = ['name', 'property_type', 'address_line1', 'address_line2', 'city', 'state', 'zip', 'bedrooms', 'bathrooms'];
    const sanitizedUpdates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in updates) {
        sanitizedUpdates[key] = updates[key];
      }
    }

    const { data, error } = await supabase
      .from('properties')
      .update(sanitizedUpdates)
      .eq('id', id)
      .eq('user_id', auth.userId)
      .select()
      .single();

    if (error) {
      console.error('Property update error:', error);
      return NextResponse.json({ error: 'Failed to update property' }, { status: 500 });
    }

    return NextResponse.json({ success: true, property: data });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('Properties API error:', error);
    return NextResponse.json({ error: 'Failed to update property' }, { status: 500 });
  }
}
