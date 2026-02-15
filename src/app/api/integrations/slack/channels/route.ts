import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/integrations/slack/channels — List Slack channels the bot can access
 */
export async function GET() {
  try {
    const auth = await authenticateRequest();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: connection } = await supabase
      .from('integration_connections')
      .select('access_token')
      .eq('user_id', auth.userId)
      .eq('provider', 'slack')
      .eq('active', true)
      .single();

    if (!connection) {
      return NextResponse.json({ error: 'Slack not connected' }, { status: 404 });
    }

    // Fetch channels from Slack API
    const res = await fetch('https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=200', {
      headers: { Authorization: `Bearer ${connection.access_token}` },
    });

    const data = await res.json();
    if (!data.ok) {
      return NextResponse.json({ error: `Slack API error: ${data.error}` }, { status: 400 });
    }

    const channels = (data.channels || [])
      .filter((c: { is_archived: boolean }) => !c.is_archived)
      .map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))
      .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));

    return NextResponse.json({ channels });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
