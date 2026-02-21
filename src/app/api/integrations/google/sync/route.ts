import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { createRateLimiter } from '@/lib/rate-limit';
import { syncAllExpensesToSheets, getSpreadsheetUrl } from '@/lib/integrations/google-sync';

const isRateLimited = createRateLimiter('google-sync', 10, 60_000);

/**
 * POST /api/integrations/google/sync — Sync expenses to Google Sheets
 * Body: { expenses: Array<{ date, property_name, category, amount, description, notes? }> }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const body = await request.json();
    const { expenses } = body as {
      expenses: Array<{
        date: string;
        property_name: string;
        category: string;
        amount: number;
        description: string;
        notes?: string;
      }>;
    };

    if (!Array.isArray(expenses) || expenses.length === 0) {
      return NextResponse.json({ error: 'expenses must be a non-empty array' }, { status: 400 });
    }

    if (expenses.length > 1000) {
      return NextResponse.json({ error: 'Maximum 1000 expenses per sync' }, { status: 400 });
    }

    const result = await syncAllExpensesToSheets(auth.userId, expenses);

    if (!result) {
      return NextResponse.json({ error: 'Google Sheets not connected. Go to Integrations to connect.' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      synced_rows: result.synced,
      spreadsheet_url: result.spreadsheetUrl,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * GET /api/integrations/google/sync — Get spreadsheet URL
 */
export async function GET() {
  try {
    const auth = await authenticateRequest();
    const url = await getSpreadsheetUrl(auth.userId);

    if (!url) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({ connected: true, spreadsheet_url: url });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
