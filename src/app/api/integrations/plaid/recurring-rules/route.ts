import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase/service';

// Valid expense categories
const VALID_CATEGORIES = [
  'utility', 'cleaning', 'insurance', 'maintenance', 'mortgage',
  'supplies', 'taxes', 'management', 'subscription', 'improvement', 'other'
];

/**
 * GET /api/integrations/plaid/recurring-rules
 * Return user's recurring transaction rules
 */
export async function GET() {
  try {
    const auth = await authenticateRequest();
    const supabase = getServiceClient();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { data, error } = await supabase
      .from('plaid_recurring_rules')
      .select(`
        id,
        merchant_pattern,
        category,
        property_id,
        created_at,
        properties:property_id (
          id,
          name
        )
      `)
      .eq('user_id', auth.userId)
      .order('merchant_pattern', { ascending: true });

    if (error) {
      console.error('Error fetching recurring rules:', error);
      return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 });
    }

    return NextResponse.json({
      rules: data || [],
      categories: VALID_CATEGORIES,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/integrations/plaid/recurring-rules
 * Create a new recurring transaction rule
 * Body: { merchant_pattern: string, category: string, property_id?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest();
    const supabase = getServiceClient();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { merchant_pattern, category, property_id } = body as {
      merchant_pattern: string;
      category: string;
      property_id?: string;
    };

    // Validate merchant pattern
    if (!merchant_pattern || typeof merchant_pattern !== 'string') {
      return NextResponse.json({ error: 'merchant_pattern is required' }, { status: 400 });
    }

    const trimmedPattern = merchant_pattern.trim();
    if (trimmedPattern.length < 2 || trimmedPattern.length > 100) {
      return NextResponse.json({ error: 'Invalid merchant pattern length' }, { status: 400 });
    }

    // Validate category
    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ 
        error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` 
      }, { status: 400 });
    }

    // Verify property belongs to user (if provided)
    if (property_id) {
      const { data: property, error: propError } = await supabase
        .from('properties')
        .select('id')
        .eq('id', property_id)
        .eq('user_id', auth.userId)
        .single();

      if (propError || !property) {
        return NextResponse.json({ error: 'Property not found' }, { status: 404 });
      }
    }

    const { data, error } = await supabase
      .from('plaid_recurring_rules')
      .insert({
        user_id: auth.userId,
        merchant_pattern: trimmedPattern,
        category,
        property_id: property_id || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating recurring rule:', error);
      return NextResponse.json({ error: 'Failed to create rule' }, { status: 500 });
    }

    return NextResponse.json({ success: true, rule: data });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/integrations/plaid/recurring-rules
 * Delete a recurring transaction rule
 * Body: { rule_id: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateRequest();
    const supabase = getServiceClient();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { rule_id } = body as { rule_id: string };

    if (!rule_id || typeof rule_id !== 'string') {
      return NextResponse.json({ error: 'rule_id is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('plaid_recurring_rules')
      .delete()
      .eq('id', rule_id)
      .eq('user_id', auth.userId);

    if (error) {
      console.error('Error deleting recurring rule:', error);
      return NextResponse.json({ error: 'Failed to delete rule' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
