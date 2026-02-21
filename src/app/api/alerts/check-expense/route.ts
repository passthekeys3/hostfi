import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { triggerAnomalyAlert } from '@/lib/alerts/trigger';
import { fireWebhookEvent } from '@/lib/integrations/webhooks';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * POST /api/alerts/check-expense
 * Check if a newly created expense is anomalous and trigger alert if needed.
 * Body: { expense_id: string, user_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    // This can be called authenticated or with the expense details
    const auth = await authenticateRequest();
    
    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { expense_id } = body as {
      expense_id?: string;
    };

    // Always use the authenticated user's ID — never accept user_id from body
    const targetUserId = auth.userId;
    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    if (!expense_id) {
      return NextResponse.json({ error: 'Expense ID required' }, { status: 400 });
    }

    // Fetch the expense
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .select('id, amount, category, vendor, description, date, property_id')
      .eq('id', expense_id)
      .eq('user_id', targetUserId)
      .single();

    if (expenseError || !expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // Fetch the property name
    const { data: property } = await supabase
      .from('properties')
      .select('name')
      .eq('id', expense.property_id)
      .single();

    const propertyName = property?.name || 'Unknown Property';

    // Fire webhook event for expense creation
    fireWebhookEvent(targetUserId, 'expense.created', {
      expense_id: expense.id,
      amount: expense.amount,
      category: expense.category,
      vendor: expense.vendor,
      description: expense.description,
      date: expense.date,
      property_id: expense.property_id,
      property_name: propertyName,
    }).catch(err => console.error('[check-expense] Webhook error:', err));

    // Calculate average for this category (last 90 days, excluding this expense)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const startDate = ninetyDaysAgo.toISOString().split('T')[0];

    const { data: categoryExpenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', targetUserId)
      .eq('category', expense.category)
      .neq('id', expense_id)
      .gte('date', startDate);

    const amounts = (categoryExpenses || []).map(e => Number(e.amount));
    
    // Need at least 3 previous expenses to establish a meaningful average
    if (amounts.length < 3) {
      return NextResponse.json({ anomaly: false, reason: 'Not enough data for comparison' });
    }

    const average = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
    const expenseAmount = Number(expense.amount);

    // Anomaly if > 2x the average
    const isAnomaly = expenseAmount > average * 2;

    if (isAnomaly) {
      const deviationPercent = Math.round(((expenseAmount - average) / average) * 100 * 10) / 10;
      const severity = deviationPercent > 100 ? 'critical' : deviationPercent > 50 ? 'high' : 'medium';

      // Store the anomaly in the database
      const { error: insertError } = await supabase
        .from('anomaly_logs')
        .insert({
          user_id: targetUserId,
          expense_id: expense_id,
          property_id: expense.property_id,
          anomaly_type: 'spike',
          severity,
          utility_type: expense.category,
          current_amount: expenseAmount,
          expected_amount: Math.round(average * 100) / 100,
          deviation_percent: deviationPercent,
          message: `${expense.category?.charAt(0).toUpperCase()}${expense.category?.slice(1) || 'Expense'} at ${propertyName} is ${Math.round(deviationPercent)}% higher than your 90-day average ($${expenseAmount.toFixed(2)} vs $${average.toFixed(2)})`,
          recommendation: `Review this expense for ${propertyName}. The amount ($${expenseAmount.toFixed(2)}) is significantly higher than your typical ${expense.category || 'expenses'} which average $${average.toFixed(2)}.`,
          status: 'new',
        });

      if (insertError) {
        console.error('[check-expense] Failed to insert anomaly log:', insertError);
      }

      // Trigger the alert (email/Slack)
      triggerAnomalyAlert(targetUserId, {
        amount: expenseAmount,
        vendor: expense.vendor || expense.description || 'Unknown',
        property: propertyName,
        category: expense.category || 'other',
        averageAmount: Math.round(average * 100) / 100,
        date: expense.date,
      });

      // Fire webhook event for anomaly detection
      fireWebhookEvent(targetUserId, 'anomaly.detected', {
        expense_id: expense.id,
        amount: expenseAmount,
        expected_amount: Math.round(average * 100) / 100,
        deviation_percent: deviationPercent,
        severity,
        category: expense.category,
        property_id: expense.property_id,
        property_name: propertyName,
      }).catch(err => console.error('[check-expense] Anomaly webhook error:', err));

      return NextResponse.json({
        anomaly: true,
        expense_amount: expenseAmount,
        category_average: Math.round(average * 100) / 100,
        ratio: Math.round((expenseAmount / average) * 100) / 100,
      });
    }

    return NextResponse.json({ anomaly: false });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('POST /api/alerts/check-expense error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
