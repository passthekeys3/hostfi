import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { createRateLimiter } from '@/lib/rate-limit';
import type { RevenueEntry } from '@/lib/demo-revenue';

const isRateLimited = createRateLimiter('revenue-import', 5, 60_000);

const MAX_IMPORT_SIZE = 10_000;

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  duplicates: number;
  entries: RevenueEntry[];
  errors: string[];
}

function isDuplicate(entry: Partial<RevenueEntry>, existing: Partial<RevenueEntry>[]): boolean {
  return existing.some(e => {
    if (entry.confirmation_code && e.confirmation_code) {
      return entry.confirmation_code === e.confirmation_code;
    }
    return (
      e.check_in === entry.check_in &&
      e.check_out === entry.check_out &&
      Math.abs((e.amount || 0) - (entry.amount || 0)) < 0.01 &&
      e.property_id === entry.property_id
    );
  });
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    let auth;
    try {
      auth = await authenticateRequest();
    } catch (response) {
      return response as NextResponse;
    }

    const body = await request.json();
    const { entries, existingEntries = [] } = body as {
      entries: Partial<RevenueEntry>[];
      existingEntries?: Partial<RevenueEntry>[];
    };

    if (!Array.isArray(entries)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request: entries must be an array' },
        { status: 400 }
      );
    }

    if (entries.length > MAX_IMPORT_SIZE) {
      return NextResponse.json(
        { success: false, error: `Too many entries (max ${MAX_IMPORT_SIZE})` },
        { status: 400 }
      );
    }

    const result: ImportResult = {
      success: true,
      imported: 0,
      skipped: 0,
      duplicates: 0,
      entries: [],
      errors: [],
    };

    const importedForDuplicateCheck: Partial<RevenueEntry>[] = [...existingEntries];

    for (const entry of entries) {
      if (!entry.property_id) {
        result.skipped++;
        result.errors.push('Skipped: Could not match to a property');
        continue;
      }

      if (!entry.check_in || !entry.check_out || !entry.amount) {
        result.skipped++;
        result.errors.push('Skipped: Missing required fields (dates or amount)');
        continue;
      }

      if (!/^\d{4}-\d{2}-\d{2}/.test(entry.check_in) || !/^\d{4}-\d{2}-\d{2}/.test(entry.check_out)) {
        result.skipped++;
        result.errors.push('Skipped: Invalid date format');
        continue;
      }

      if (typeof entry.amount !== 'number' || entry.amount <= 0 || entry.amount > 10_000_000) {
        result.skipped++;
        result.errors.push('Skipped: Invalid amount');
        continue;
      }

      if (isDuplicate(entry, importedForDuplicateCheck)) {
        result.duplicates++;
        continue;
      }

      const newEntry: RevenueEntry = {
        id: entry.id || `import-${Date.now()}-${result.imported}`,
        user_id: auth.userId,
        property_id: entry.property_id,
        source: entry.source || 'other',
        description: (entry.description || 'CSV Import').slice(0, 1000),
        guest_name: entry.guest_name?.slice(0, 200) || null,
        amount: entry.amount,
        payout_amount: entry.payout_amount || entry.amount,
        platform_fee: entry.platform_fee || 0,
        check_in: entry.check_in,
        check_out: entry.check_out,
        nights: entry.nights || Math.max(1, Math.round(
          (new Date(entry.check_out).getTime() - new Date(entry.check_in).getTime()) / 86400000
        )),
        payout_date: entry.payout_date || entry.check_out,
        confirmation_code: entry.confirmation_code?.slice(0, 100) || null,
        created_at: entry.created_at || new Date().toISOString(),
        import_source: 'csv_import',
      };

      result.entries.push(newEntry);
      importedForDuplicateCheck.push(entry);
      result.imported++;
    }

    // Save to Supabase
    if (result.entries.length > 0) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && serviceKey) {
        const { createClient: createAdminClient } = await import('@supabase/supabase-js');
        const admin = createAdminClient(supabaseUrl, serviceKey);

        // Strip client-generated IDs, let Supabase generate UUIDs
        const rows = result.entries.map(({ id: _id, ...rest }) => rest);
        const { data, error } = await admin.from('revenue').insert(rows).select();
        if (error) {
          console.error('Revenue import DB error:', error.message);
          return NextResponse.json(
            { success: false, error: 'Failed to save imported entries' },
            { status: 500 }
          );
        }
        // Return the saved entries with real IDs
        if (data) result.entries = data as RevenueEntry[];
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error importing revenue:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process import' },
      { status: 500 }
    );
  }
}
