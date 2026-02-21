import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { createRateLimiter } from '@/lib/rate-limit';
import {
  exchangePublicToken,
  getAccounts,
  getItem,
  getInstitution,
  isPlaidConfigured,
} from '@/lib/integrations/plaid';
import { createClient } from '@/lib/supabase/server';

const rateLimiter = createRateLimiter('plaid-exchange', 5, 60_000);

/**
 * POST /api/integrations/plaid/exchange
 * Exchange a public_token from Plaid Link for an access_token
 * Store the connection in Supabase
 * Body: { public_token: string }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (rateLimiter(ip)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const body = await request.json();
    const { public_token } = body as { public_token: string };

    if (!public_token || typeof public_token !== 'string') {
      return NextResponse.json({ error: 'public_token is required' }, { status: 400 });
    }

    if (!isPlaidConfigured()) {
      return NextResponse.json({
        error: 'Plaid not configured',
      }, { status: 503 });
    }

    // Exchange token
    const { access_token, item_id } = await exchangePublicToken(public_token);

    // Get account and institution info
    const [accountsData, itemData] = await Promise.all([
      getAccounts(access_token),
      getItem(access_token),
    ]);

    let institution = null;
    try {
      const instData = await getInstitution(itemData.item.institution_id);
      institution = instData.institution;
    } catch (error) {
      // Non-critical — some sandbox institutions don't resolve
      console.error('Failed to get Plaid institution info:', error);
    }

    // Store in Supabase
    const supabase = await createClient();
    if (supabase) {
      // Store in plaid_items table (new approach)
      const { error: itemError } = await supabase.from('plaid_items').upsert({
        user_id: auth.userId,
        item_id,
        access_token: process.env.CREDENTIALS_ENCRYPTION_KEY
          ? (await import('@/lib/crypto')).encryptCredentials({ token: access_token })
          : access_token,
        institution_name: institution?.name || 'Unknown Bank',
        institution_id: itemData.item.institution_id,
        status: 'active',
      }, {
        onConflict: 'user_id,item_id',
      });

      if (itemError) {
        console.error('Failed to store Plaid item:', itemError.message);
      }

      // Store account mappings
      for (const acc of accountsData.accounts) {
        await supabase.from('plaid_account_mappings').upsert({
          user_id: auth.userId,
          plaid_account_id: acc.account_id,
          account_name: acc.name,
          account_mask: acc.mask,
        }, {
          onConflict: 'user_id,plaid_account_id',
        });
      }

      // Also store in integration_connections for backwards compatibility
      const { error } = await supabase.from('integration_connections').upsert({
        user_id: auth.userId,
        provider: 'plaid',
        access_token: process.env.CREDENTIALS_ENCRYPTION_KEY
          ? (await import('@/lib/crypto')).encryptCredentials({ token: access_token })
          : access_token,
        metadata: {
          item_id,
          institution_id: itemData.item.institution_id,
          institution_name: institution?.name || 'Unknown Bank',
          accounts: accountsData.accounts.map(a => ({
            account_id: a.account_id,
            name: a.name,
            type: a.type,
            subtype: a.subtype,
            mask: a.mask,
          })),
          sync_cursor: null,
        },
        active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,provider',
      });

      if (error) {
        console.error('Failed to store Plaid connection:', error.message);
      }
    }

    return NextResponse.json({
      success: true,
      item_id,
      accounts: accountsData.accounts.map(a => ({
        account_id: a.account_id,
        name: a.name,
        type: a.type,
        mask: a.mask,
      })),
      institution: institution ? { name: institution.name, logo: institution.logo } : null,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
