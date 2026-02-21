import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase/service';

interface Split {
  property_id: string;
  amount: number;
  percentage?: number;
}

/**
 * POST /api/integrations/plaid/split
 * Split an expense across multiple properties
 * Body: { expense_id: string, splits: [{ property_id, amount, percentage? }] }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest();
    const supabase = getServiceClient();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { expense_id, splits } = body as {
      expense_id: string;
      splits: Split[];
    };

    // Validate expense_id
    if (!expense_id || typeof expense_id !== 'string') {
      return NextResponse.json({ error: 'expense_id is required' }, { status: 400 });
    }

    // Validate splits array
    if (!Array.isArray(splits) || splits.length < 2) {
      return NextResponse.json({ 
        error: 'splits must be an array with at least 2 entries' 
      }, { status: 400 });
    }

    // Verify expense belongs to user
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .select('id, amount, user_id')
      .eq('id', expense_id)
      .eq('user_id', auth.userId)
      .single();

    if (expenseError || !expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // Validate all property IDs belong to user
    const propertyIds = splits.map(s => s.property_id);
    const { data: properties, error: propsError } = await supabase
      .from('properties')
      .select('id')
      .eq('user_id', auth.userId)
      .in('id', propertyIds);

    if (propsError || !properties || properties.length !== propertyIds.length) {
      return NextResponse.json({ error: 'One or more properties not found' }, { status: 400 });
    }

    // Validate split amounts
    const totalSplitAmount = splits.reduce((sum, s) => sum + s.amount, 0);
    const tolerance = 0.01; // Allow 1 cent tolerance for rounding
    
    if (Math.abs(totalSplitAmount - expense.amount) > tolerance) {
      return NextResponse.json({ 
        error: `Split amounts (${totalSplitAmount}) must equal expense amount (${expense.amount})` 
      }, { status: 400 });
    }

    // Delete existing splits
    await supabase
      .from('expense_splits')
      .delete()
      .eq('expense_id', expense_id);

    // Create new splits
    const splitRows = splits.map(s => ({
      expense_id,
      property_id: s.property_id,
      amount: s.amount,
      percentage: s.percentage || (s.amount / expense.amount) * 100,
    }));

    const { error: insertError } = await supabase
      .from('expense_splits')
      .insert(splitRows);

    if (insertError) {
      console.error('Error creating splits:', insertError);
      return NextResponse.json({ error: 'Failed to create splits' }, { status: 500 });
    }

    // Mark expense as split
    await supabase
      .from('expenses')
      .update({ is_split: true })
      .eq('id', expense_id);

    return NextResponse.json({ success: true, splits: splitRows });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * GET /api/integrations/plaid/split
 * Get splits for an expense
 * Query: ?expense_id=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest();
    const supabase = getServiceClient();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const expenseId = searchParams.get('expense_id');

    if (!expenseId) {
      return NextResponse.json({ error: 'expense_id is required' }, { status: 400 });
    }

    // Verify expense belongs to user
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .select('id')
      .eq('id', expenseId)
      .eq('user_id', auth.userId)
      .single();

    if (expenseError || !expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // Get splits with property names
    const { data: splits, error: splitsError } = await supabase
      .from('expense_splits')
      .select(`
        id,
        property_id,
        amount,
        percentage,
        properties:property_id (
          id,
          name
        )
      `)
      .eq('expense_id', expenseId);

    if (splitsError) {
      console.error('Error fetching splits:', splitsError);
      return NextResponse.json({ error: 'Failed to fetch splits' }, { status: 500 });
    }

    return NextResponse.json({ splits: splits || [] });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/integrations/plaid/split
 * Remove splits from an expense (unsplit)
 * Body: { expense_id: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateRequest();
    const supabase = getServiceClient();
    
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { expense_id } = body as { expense_id: string };

    if (!expense_id) {
      return NextResponse.json({ error: 'expense_id is required' }, { status: 400 });
    }

    // Verify expense belongs to user
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .select('id')
      .eq('id', expense_id)
      .eq('user_id', auth.userId)
      .single();

    if (expenseError || !expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // Delete splits
    await supabase
      .from('expense_splits')
      .delete()
      .eq('expense_id', expense_id);

    // Unmark expense as split
    await supabase
      .from('expenses')
      .update({ is_split: false })
      .eq('id', expense_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
