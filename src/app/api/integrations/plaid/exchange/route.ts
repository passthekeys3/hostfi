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

    // Demo mode
    if (!isPlaidConfigured()) {
      // Still save connection to Supabase so status persists
      const supabase = await createClient();
      if (supabase) {
        await supabase.from('integration_connections').upsert({
          user_id: auth.userId,
          provider: 'plaid',
          access_token: 'demo-access-token',
          metadata: {
            item_id: 'demo-item-xxx',
            institution_name: 'Chase (Demo)',
            accounts: [
              { account_id: 'acc_1', name: 'Business Checking', type: 'depository', mask: '4521' },
              { account_id: 'acc_2', name: 'Business Savings', type: 'depository', mask: '8832' },
            ],
            sync_cursor: null,
          },
          active: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,provider' });
      }

      return NextResponse.json({
        success: true,
        demo: true,
        item_id: 'demo-item-xxx',
        accounts: [
          { account_id: 'acc_1', name: 'Business Checking', type: 'depository', mask: '4521' },
          { account_id: 'acc_2', name: 'Business Savings', type: 'depository', mask: '8832' },
        ],
        institution: { name: 'Chase', logo: null },
      });
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
    } catch {
      // Non-critical — some sandbox institutions don't resolve
    }

    // Store in Supabase
    const supabase = await createClient();
    if (supabase) {
      const { error } = await supabase.from('integration_connections').upsert({
        user_id: auth.userId,
        provider: 'plaid',
        access_token: access_token,
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
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
