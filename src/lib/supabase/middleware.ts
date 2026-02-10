import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  // Allow demo mode: if user has demo cookie or ?demo query param, skip auth
  const isDemo = request.cookies.get('hostfi_demo')?.value === 'true' 
    || request.nextUrl.searchParams.get('demo') === 'true';

  if (!user && !isDemo && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Set demo cookie if entering via ?demo=true
  if (isDemo && !request.cookies.get('hostfi_demo')) {
    supabaseResponse.cookies.set('hostfi_demo', 'true', {
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
  }

  return supabaseResponse;
}
