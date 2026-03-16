import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { canAccessFeature, type Plan } from '@/lib/feature-gates';
import {
  generateXeroBillsCSV,
  generateXeroBankStatementCSV,
  generateXeroJournalCSV,
  type XeroExpense,
} from '@/lib/xero-export';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * GET /api/export/xero?format=bills|bank|journal&from=YYYY-MM-DD&to=YYYY-MM-DD&property_id=xxx
 * 
 * Exports expenses in Xero-compatible CSV format.
 * Requires Pro plan.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest();
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    // Plan check
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', auth.userId)
      .single();
    const userPlan = (profile?.plan || 'free') as Plan;
    if (!canAccessFeature(userPlan, 'integrations')) {
      return NextResponse.json({ error: 'Xero export requires a Pro plan.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'bills';
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const propertyId = searchParams.get('property_id');

    if (!['bills', 'bank', 'journal'].includes(format)) {
      return NextResponse.json({ error: 'Invalid format. Use: bills, bank, or journal' }, { status: 400 });
    }

    // Fetch properties for name mapping
    let propertiesQuery = supabase
      .from('properties')
      .select('id, name')
      .eq('user_id', auth.userId);
    
    if (propertyId) {
      propertiesQuery = propertiesQuery.eq('id', propertyId);
    }

    const { data: properties } = await propertiesQuery;
    const propertyMap = new Map((properties || []).map(p => [p.id, p.name]));

    // Fetch expenses
    let expensesQuery = supabase
      .from('expenses')
      .select('date, amount, vendor, description, category, property_id, schedule_e_line, id')
      .eq('user_id', auth.userId)
      .order('date', { ascending: true });

    if (from) expensesQuery = expensesQuery.gte('date', from);
    if (to) expensesQuery = expensesQuery.lte('date', to);
    if (propertyId) expensesQuery = expensesQuery.eq('property_id', propertyId);

    const { data: expenses, error } = await expensesQuery;

    if (error) {
      console.error('Xero export query error:', error);
      return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
    }

    if (!expenses || expenses.length === 0) {
      return NextResponse.json({ error: 'No expenses found for the selected criteria' }, { status: 404 });
    }

    // Map to Xero format
    const xeroExpenses: XeroExpense[] = expenses.map(e => ({
      date: e.date || '',
      amount: e.amount || 0,
      vendor: e.vendor || '',
      description: e.description || e.category || '',
      category: e.category || 'other',
      property_name: propertyMap.get(e.property_id) || 'Unknown Property',
      schedule_e_line: e.schedule_e_line || undefined,
      reference: `HF-${e.id?.slice(0, 8) || ''}`,
    }));

    // Generate CSV based on format
    let csv: string;
    let filename: string;
    const dateRange = from && to ? `_${from}_to_${to}` : from ? `_from_${from}` : to ? `_to_${to}` : '';

    switch (format) {
      case 'bank':
        csv = generateXeroBankStatementCSV(xeroExpenses);
        filename = `hostfi_xero_bank_statement${dateRange}.csv`;
        break;
      case 'journal':
        csv = generateXeroJournalCSV(xeroExpenses);
        filename = `hostfi_xero_journal${dateRange}.csv`;
        break;
      case 'bills':
      default:
        csv = generateXeroBillsCSV(xeroExpenses);
        filename = `hostfi_xero_bills${dateRange}.csv`;
        break;
    }

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('Xero export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
