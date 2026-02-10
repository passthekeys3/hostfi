import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { createRateLimiter } from '@/lib/rate-limit';
import { appendRows } from '@/lib/integrations/google';

const rateLimiter = createRateLimiter('google-sync', 10, 60_000);

/**
 * POST /api/integrations/google/sync — Sync expenses to Google Sheets
 * Body: { spreadsheet_id: string, access_token: string, expenses: Array<{ date, property, category, amount, vendor, notes? }> }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (rateLimiter(ip)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const body = await request.json();
    const { spreadsheet_id, access_token, expenses } = body as {
      spreadsheet_id: string;
      access_token: string;
      expenses: Array<{
        date: string;
        property: string;
        category: string;
        amount: number;
        vendor: string;
        notes?: string;
      }>;
    };

    if (!spreadsheet_id || !access_token) {
      return NextResponse.json({ error: 'spreadsheet_id and access_token are required' }, { status: 400 });
    }

    if (!Array.isArray(expenses) || expenses.length === 0) {
      return NextResponse.json({ error: 'expenses must be a non-empty array' }, { status: 400 });
    }

    if (expenses.length > 1000) {
      return NextResponse.json({ error: 'Maximum 1000 expenses per sync' }, { status: 400 });
    }

    // Convert expenses to rows
    const rows = expenses.map(e => [
      e.date,
      e.property,
      e.category,
      `$${Number(e.amount).toFixed(2)}`,
      e.vendor,
      e.notes || '',
    ]);

    const result = await appendRows(access_token, spreadsheet_id, 'Expenses', rows);

    return NextResponse.json({
      success: true,
      synced_rows: result.updatedRows,
      spreadsheet_url: `https://docs.google.com/spreadsheets/d/${spreadsheet_id}`,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
