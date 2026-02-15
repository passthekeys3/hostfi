import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { refreshGoogleToken } from "@/lib/integrations/google";

/**
 * GET /api/integrations/google/access-token
 * Returns the user's current Google access token, refreshing if needed
 * Used by the Google Picker component on the client side
 */
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Get user from session
    const cookieStore = await cookies();
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          cookie: cookieStore.toString(),
        },
      },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Use service role to get the connection
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Get the Google Sheets connection (both Sheets and Drive share the same OAuth tokens)
    const { data: connection, error: fetchError } = await supabaseAdmin
      .from("integration_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", "google_sheets")
      .eq("active", true)
      .single();

    // If no sheets connection, try drive
    let conn = connection;
    if (fetchError || !conn) {
      const { data: driveConn, error: driveError } = await supabaseAdmin
        .from("integration_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("provider", "google_drive")
        .eq("active", true)
        .single();
      
      if (driveError || !driveConn) {
        return NextResponse.json(
          { error: "No Google connection found" },
          { status: 404 }
        );
      }
      conn = driveConn;
    }

    let accessToken = conn.access_token;
    const tokenExpiresAt = conn.token_expires_at
      ? new Date(conn.token_expires_at).getTime()
      : 0;

    // Refresh token if expired or expiring within 1 minute
    if (tokenExpiresAt && Date.now() > tokenExpiresAt - 60_000) {
      try {
        const refreshed = await refreshGoogleToken(conn.refresh_token);
        accessToken = refreshed.access_token;

        // Update stored token
        const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
        
        // Update both connections (they share tokens)
        await Promise.all([
          supabaseAdmin
            .from("integration_connections")
            .update({
              access_token: refreshed.access_token,
              token_expires_at: newExpiresAt,
            })
            .eq("user_id", user.id)
            .eq("provider", "google_sheets"),
          supabaseAdmin
            .from("integration_connections")
            .update({
              access_token: refreshed.access_token,
              token_expires_at: newExpiresAt,
            })
            .eq("user_id", user.id)
            .eq("provider", "google_drive"),
        ]);
      } catch (err) {
        console.error("Token refresh failed:", err);
        return NextResponse.json(
          { error: "Token refresh failed. Please reconnect your Google account." },
          { status: 401 }
        );
      }
    }

    return NextResponse.json({ access_token: accessToken });
  } catch (err) {
    console.error("access-token error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
